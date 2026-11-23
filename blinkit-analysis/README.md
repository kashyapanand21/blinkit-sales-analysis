# Blinkit Grocery Sales Analysis: MySQL Mini Project

A small full-stack web app that shows how MySQL connects to a real project.
Grocery sales data is stored in MySQL. A Node.js/Express backend runs SQL queries,
and an HTML/CSS/JS dashboard shows the results as KPIs, charts and tables.
You can also add and delete sales records from the browser and watch the dashboard update.

```
Browser (HTML / CSS / JS + Chart.js)
        │  fetch('/api/analytics/kpis?location=Tier 1')
        ▼
Express server (server.js, routes/)
        │  SELECT ... FROM blinkit_sales WHERE outlet_location_type = ?
        ▼
MySQL database (blinkit_db.blinkit_sales)
```

---

## 1. What you need (Windows)

| Tool | Get it from | Check it works |
|------|-------------|----------------|
| Node.js 18+ (LTS) | nodejs.org | `node -v` |
| MySQL Server 8.x + Workbench | dev.mysql.com/downloads/installer | open Workbench and connect |

During MySQL install, note the **root password** you set. You'll need it below.

> MySQL 8+ (or MariaDB 10.2+) is required because the project uses window functions (`RANK() OVER`).

## 2. Setup (one time)

Open a terminal (Command Prompt / PowerShell / VS Code terminal) in the project folder:

```bash
npm install
copy .env.example .env
```

Open `.env` and set `DB_PASSWORD` to your MySQL root password.

Then load the data:

```bash
npm run setup
```

This creates the `blinkit_db` database and the `blinkit_sales` table, imports the CSV,
and cleans the fat-content labels.

### Using the real Kaggle dataset

The project ships with `data/sample_blinkit.csv`, **2,000 synthetic rows** that have the
same columns as the real dataset, so the app runs straight away. For your final
submission, use the real data:

1. Download it from kaggle.com/datasets/mukeshgadri/blinkit-dataset
2. If you get an `.xlsx` file, open it in Excel → *Save As* → **CSV (Comma delimited)**
3. Put it in the `data/` folder and run:

```bash
npm run setup -- "data/BlinkIT Grocery Data.csv"
```

The importer matches column names automatically ("Item Fat Content" → `item_fat_content`).

## 3. Run

```bash
npm start
```

Open **http://localhost:3000**. The green badge at the top right confirms the MySQL connection.

---

## 4. Project structure

```
blinkit-analysis/
├── server.js              Express app: serves the frontend + API, /api/health
├── db.js                  MySQL connection pool (mysql2)
├── routes/
│   ├── analytics.js       All analysis queries (KPIs, GROUP BY, HAVING, window functions)
│   └── records.js         CRUD: list/search, insert, delete sales records
├── scripts/
│   └── import-csv.js      Creates DB + table, bulk-inserts the CSV, runs cleaning
├── sql/
│   ├── schema.sql         CREATE TABLE with indexes
│   └── clean.sql          Data-cleaning UPDATEs (run in Workbench too)
├── public/
│   ├── index.html         Dashboard layout
│   ├── style.css          Styling (responsive)
│   └── app.js             fetch() calls, Chart.js charts, tables, form handling
└── data/
    └── sample_blinkit.csv Sample data (replace with the Kaggle file)
```

## 5. Features → SQL concepts (for your report and viva)

| Dashboard part | SQL concept used |
|----------------|------------------|
| 4 KPI cards (total sales, avg sales, items, avg rating) | `SUM`, `AVG`, `COUNT`, `ROUND` |
| Filter bar (tier, size, outlet type, fat, item type) | Dynamic `WHERE` with `?` placeholders |
| Sales by fat content / outlet size / city tier | `GROUP BY` + aggregates |
| Revenue by item type with % share | Window function `SUM(SUM(sales)) OVER ()` |
| Sales by outlet opening year | `GROUP BY` + `ORDER BY` (trend) |
| Top 3 item types per outlet type | `RANK() OVER (PARTITION BY ...)` + subquery |
| Below-average item types | `HAVING` with a subquery |
| Sales records table | `SELECT ... LIMIT ? OFFSET ?` (pagination), `LIKE` (search) |
| Add sale / Delete | `INSERT`, `DELETE` |
| Data cleaning on import | `UPDATE ... WHERE ... IN (...)` |

Every chart and table has a **`</> SQL`** button that shows the exact query MySQL ran,
including the current filters. This is handy when you present.

## 6. Demo script (2–3 minutes)

1. Point at the green badge: "The app is connected to MySQL; this many rows are in the table."
2. Walk through the KPI cards, then click `</> SQL` to show the query behind them.
3. Change **City tier → Tier 1**. Every chart updates, because each request adds a `WHERE` clause.
4. Open the SQL for **Top 3 per outlet type** and explain `PARTITION BY`.
5. Scroll to **Sales Records**, add a sale (e.g. `FDA15`, Dairy, ₹500, rating 4.5).
   The record appears and *Total Sales* goes up: a live `INSERT` followed by fresh `SELECT`s.
6. Delete it again.

## 7. Likely viva questions

- **Why not connect the browser directly to MySQL?**
  The DB password would be exposed in the browser, and anyone could run any query.
  The backend is the only thing that talks to MySQL, and it runs only fixed, known queries.

- **How do you stop SQL injection?**
  User values never get pasted into SQL strings. They're sent as `?` parameters, and
  `mysql2` escapes them. Filter column names come from a fixed whitelist (`FILTERS` in `analytics.js`).

- **Why a connection pool?**
  Opening a MySQL connection is slow. A pool keeps up to 10 open and reuses them across requests.

- **WHERE vs HAVING?**
  `WHERE` filters rows before grouping. `HAVING` filters groups after `GROUP BY`
  (e.g. "item types whose `AVG(sales)` is below the overall average").

- **Why indexes on `outlet_location_type`, `outlet_type`, `item_type`?**
  These are the columns we filter and group by most, so indexes make those queries faster as the data grows.

- **Why batch inserts in the importer?**
  One `INSERT` with 500 rows is far faster than 500 separate `INSERT`s (fewer round trips to the server).

## 8. Troubleshooting

| Problem | Fix |
|---------|-----|
| `Access denied for user 'root'` | Wrong `DB_PASSWORD` in `.env` |
| `ECONNREFUSED` | MySQL service not running: Windows key → *Services* → start **MySQL80** |
| Error 1175 in Workbench when running `clean.sql` | Already handled: the file turns off `SQL_SAFE_UPDATES` |
| `RANK` / `OVER` syntax error | You're on MySQL 5.7, so upgrade to MySQL 8 |
| Port 3000 in use | Change `PORT` in `.env` |
