// ============================================================================
// QuickKart - Sales analytics (routes/analytics.js)
// The "Blinkit sales analysis" part of the project, computed live from the
// store's own orders. Every query is shown on the page with its result.
//
// SQL shown here: JOIN across 4 tables, GROUP BY, HAVING + subquery,
// window functions (RANK, running SUM), DATE functions, CASE.
// Window functions need MySQL 8.0+ or MariaDB 10.2+.
// ============================================================================
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Each report = a title, the concept it demonstrates, and its SQL
const REPORTS = {
  kpis: {
    title: 'Store KPIs',
    concept: 'COUNT, COUNT(DISTINCT), SUM, AVG, MAX',
    sql: `SELECT COUNT(*)                      AS total_orders,
       COUNT(DISTINCT customer_id)   AS unique_customers,
       ROUND(SUM(total_amount), 2)   AS total_revenue,
       ROUND(AVG(total_amount), 2)   AS avg_order_value,
       MAX(total_amount)             AS biggest_order
FROM orders;`
  },
  byCategory: {
    title: 'Revenue by Category',
    concept: '4-table JOIN + GROUP BY + window function for % share',
    sql: `SELECT cat.category_icon, cat.category_name,
       SUM(oi.quantity)                                     AS units_sold,
       ROUND(SUM(oi.subtotal), 2)                           AS revenue,
       ROUND(SUM(oi.subtotal) * 100 / SUM(SUM(oi.subtotal)) OVER (), 1) AS pct_share
FROM order_items oi
INNER JOIN products p     ON oi.product_id = p.product_id
INNER JOIN categories cat ON p.category_id = cat.category_id
GROUP BY cat.category_id, cat.category_icon, cat.category_name
ORDER BY revenue DESC;`
  },
  daily: {
    title: 'Daily Revenue (last 14 days) with Running Total',
    concept: 'DATE(), GROUP BY, SUM() OVER (ORDER BY ...)',
    sql: `SELECT DATE(order_date)                                   AS order_day,
       COUNT(*)                                           AS orders,
       ROUND(SUM(total_amount), 2)                        AS revenue,
       ROUND(SUM(SUM(total_amount)) OVER (ORDER BY DATE(order_date)), 2) AS running_total
FROM orders
WHERE order_date >= CURDATE() - INTERVAL 13 DAY
GROUP BY DATE(order_date)
ORDER BY order_day;`
  },
  topProducts: {
    title: 'Best-Selling Product in Each Category',
    concept: 'RANK() OVER (PARTITION BY ...) inside a subquery',
    sql: `SELECT category_name, product_name, units_sold, revenue
FROM (
  SELECT cat.category_name, p.product_name,
         SUM(oi.quantity)           AS units_sold,
         ROUND(SUM(oi.subtotal), 2) AS revenue,
         RANK() OVER (PARTITION BY cat.category_id
                      ORDER BY SUM(oi.quantity) DESC) AS rnk
  FROM order_items oi
  INNER JOIN products p     ON oi.product_id = p.product_id
  INNER JOIN categories cat ON p.category_id = cat.category_id
  GROUP BY cat.category_id, cat.category_name, p.product_id, p.product_name
) ranked
WHERE rnk = 1
ORDER BY units_sold DESC;`
  },
  topCustomers: {
    title: 'Customers Spending Above the Average Customer',
    concept: 'GROUP BY + HAVING with a subquery in FROM',
    sql: `SELECT c.full_name,
       COUNT(o.order_id)           AS orders,
       ROUND(SUM(o.total_amount), 2) AS total_spent
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.full_name
HAVING SUM(o.total_amount) > (
  SELECT AVG(customer_total)
  FROM (SELECT SUM(total_amount) AS customer_total
        FROM orders GROUP BY customer_id) per_customer
)
ORDER BY total_spent DESC;`
  },
  payment: {
    title: 'Payment Method Split',
    concept: 'GROUP BY with percentage of total',
    sql: `SELECT payment_method,
       COUNT(*)                                    AS orders,
       ROUND(SUM(total_amount), 2)                 AS revenue,
       ROUND(COUNT(*) * 100 / (SELECT COUNT(*) FROM orders), 1) AS pct_orders
FROM orders
GROUP BY payment_method
ORDER BY orders DESC;`
  },
  lowStock: {
    title: 'Low-Stock Alert (fewer than 10 left)',
    concept: 'WHERE + CASE + LEFT JOIN with a derived table',
    sql: `SELECT p.product_name, p.stock_quantity,
       COALESCE(s.units_sold, 0) AS units_sold,
       CASE WHEN p.stock_quantity = 0 THEN 'Out of stock'
            ELSE 'Running low' END AS stock_status
FROM products p
LEFT JOIN (SELECT product_id, SUM(quantity) AS units_sold
           FROM order_items GROUP BY product_id) s
       ON p.product_id = s.product_id
WHERE p.stock_quantity < 10
ORDER BY p.stock_quantity;`
  }
};

router.get('/', async (req, res) => {
  const results = {};
  for (const [key, report] of Object.entries(REPORTS)) {
    const [rows] = await pool.query(report.sql);
    results[key] = rows;
  }

  // Fill in days with no orders so the chart has all 14 days
  const byDay = new Map(results.daily.map(r => [toKey(r.order_day), r]));
  const days = [];
  let running = 0;
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const row = byDay.get(toKey(d));
    if (row) running = row.running_total;
    days.push({
      label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      revenue: row ? row.revenue : 0,
      running
    });
  }

  res.render('analytics', { title: 'Sales Analytics - QuickKart', reports: REPORTS, results, days });
});

function toKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;
}

module.exports = router;
