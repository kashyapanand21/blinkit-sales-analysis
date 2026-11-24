// ============================================================
// Analytics API: every endpoint runs one SQL query and returns
//   { sql: "<the exact query that ran>", data: [...] }
// The frontend shows that SQL so you can explain it during the demo.
// ============================================================
const express = require('express');
const { pool, format } = require('../db');
const router = express.Router();

// Dashboard filters -> table columns.
// Only these columns can ever be filtered (a whitelist), and the values go in
// as ? placeholders, so a user cannot inject SQL through the URL.
const FILTERS = {
  location: 'outlet_location_type',
  size: 'outlet_size',
  outletType: 'outlet_type',
  fat: 'item_fat_content',
  itemType: 'item_type'
};

function buildWhere(query) {
  const clauses = [];
  const params = [];
  for (const [key, column] of Object.entries(FILTERS)) {
    const value = query[key];
    if (value && value !== 'All') {
      clauses.push(`${column} = ?`);
      params.push(value);
    }
  }
  return { where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '', params };
}

// Remove the code's own indentation so the SQL shown in the browser looks clean
function dedent(text) {
  const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
  const indent = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
  return lines.map(l => l.slice(indent)).join('\n');
}

// Small helper: run the query, send back data + readable SQL
async function run(res, sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    res.json({ sql: dedent(format(sql, params)), data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// Dropdown options for the filter bar
router.get('/filters', async (req, res) => {
  try {
    const out = {};
    for (const [key, column] of Object.entries(FILTERS)) {
      const [rows] = await pool.query(`SELECT DISTINCT ${column} AS v FROM blinkit_sales ORDER BY v`);
      out[key] = rows.map(r => r.v);
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// KPI 1-4: total sales, average sales, number of items, average rating
router.get('/kpis', (req, res) => {
  const { where, params } = buildWhere(req.query);
  run(res, `
    SELECT ROUND(SUM(sales), 2)  AS total_sales,
           ROUND(AVG(sales), 2)  AS avg_sales,
           COUNT(*)              AS total_items,
           ROUND(AVG(rating), 2) AS avg_rating
    FROM blinkit_sales ${where}`, params);
});

// Q1: Do customers prefer Low Fat or Regular?
router.get('/fat-content', (req, res) => {
  const { where, params } = buildWhere(req.query);
  run(res, `
    SELECT item_fat_content,
           ROUND(SUM(sales), 2)  AS total_sales,
           COUNT(*)              AS item_count,
           ROUND(AVG(rating), 2) AS avg_rating
    FROM blinkit_sales ${where}
    GROUP BY item_fat_content
    ORDER BY total_sales DESC`, params);
});

// Q2: Revenue by item type, with each type's share of total.
// SUM(SUM(sales)) OVER () is a WINDOW FUNCTION: it adds up the grouped
// totals across all rows of the result, without collapsing them.
router.get('/item-type', (req, res) => {
  const { where, params } = buildWhere(req.query);
  run(res, `
    SELECT item_type,
           ROUND(SUM(sales), 2) AS total_sales,
           COUNT(*)             AS item_count,
           ROUND(SUM(sales) * 100 / SUM(SUM(sales)) OVER (), 2) AS pct_of_total
    FROM blinkit_sales ${where}
    GROUP BY item_type
    ORDER BY total_sales DESC`, params);
});

// Q3: Outlet size (Small / Medium / High)
router.get('/outlet-size', (req, res) => {
  const { where, params } = buildWhere(req.query);
  run(res, `
    SELECT outlet_size,
           ROUND(SUM(sales), 2) AS total_sales,
           COUNT(*)             AS item_count,
           ROUND(AVG(sales), 2) AS avg_sales_per_item
    FROM blinkit_sales ${where}
    GROUP BY outlet_size
    ORDER BY total_sales DESC`, params);
});

// Q4: Which city tier performs best?
router.get('/location', (req, res) => {
  const { where, params } = buildWhere(req.query);
  run(res, `
    SELECT outlet_location_type,
           ROUND(SUM(sales), 2)  AS total_sales,
           ROUND(AVG(rating), 2) AS avg_rating
    FROM blinkit_sales ${where}
    GROUP BY outlet_location_type
    ORDER BY outlet_location_type`, params);
});

// Q5: Sales trend by the year the outlet opened
router.get('/establishment-year', (req, res) => {
  const { where, params } = buildWhere(req.query);
  run(res, `
    SELECT outlet_establishment_year AS year,
           ROUND(SUM(sales), 2) AS total_sales
    FROM blinkit_sales ${where}
    GROUP BY outlet_establishment_year
    ORDER BY year`, params);
});

// Q6: Outlet type comparison table
router.get('/outlet-type', (req, res) => {
  const { where, params } = buildWhere(req.query);
  run(res, `
    SELECT outlet_type,
           ROUND(SUM(sales), 2)           AS total_sales,
           COUNT(*)                       AS item_count,
           ROUND(AVG(sales), 2)           AS avg_sales,
           ROUND(AVG(rating), 2)          AS avg_rating,
           ROUND(AVG(item_visibility), 4) AS avg_visibility
    FROM blinkit_sales ${where}
    GROUP BY outlet_type
    ORDER BY total_sales DESC`, params);
});

// Q7: Top 3 item types inside EACH outlet type.
// RANK() OVER (PARTITION BY ...) restarts the ranking for every outlet type.
router.get('/top-items-by-outlet', (req, res) => {
  const { where, params } = buildWhere(req.query);
  run(res, `
    SELECT outlet_type, item_type, total_sales, sales_rank
    FROM (
      SELECT outlet_type,
             item_type,
             ROUND(SUM(sales), 2) AS total_sales,
             RANK() OVER (PARTITION BY outlet_type ORDER BY SUM(sales) DESC) AS sales_rank
      FROM blinkit_sales ${where}
      GROUP BY outlet_type, item_type
    ) ranked
    WHERE sales_rank <= 3
    ORDER BY outlet_type, sales_rank`, params);
});

// Q8: Item types whose average sale is BELOW the overall average.
// HAVING filters groups (after GROUP BY); WHERE filters rows (before it).
router.get('/below-average', (req, res) => {
  const { where, params } = buildWhere(req.query);
  run(res, `
    SELECT item_type,
           ROUND(AVG(sales), 2) AS avg_sales,
           COUNT(*)             AS item_count
    FROM blinkit_sales ${where}
    GROUP BY item_type
    HAVING AVG(sales) < (SELECT AVG(sales) FROM blinkit_sales ${where})
    ORDER BY avg_sales`, [...params, ...params]);
});

module.exports = router;
