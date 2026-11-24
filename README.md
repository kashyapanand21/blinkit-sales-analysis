# QuickKart: Mini Grocery Store with MySQL

A Blinkit-inspired 10-minute grocery store built for a 2nd-year **DBMS** college project.
It shows how a MySQL database powers a real web app: browsing products, a shopping cart,
placing orders inside a transaction, an admin inventory panel, and a sales analytics page.

**Stack:** HTML, CSS, JavaScript (frontend) · Node.js + Express + EJS (backend) · MySQL (database)

```
Browser (HTML / CSS / JS)
        │   HTTP request, e.g. GET /?search=milk  or  POST /place-order
        ▼
Node.js + Express  (routes/*.js)
        │   SQL with ? placeholders via mysql2
        ▼
MySQL  (quickkart_db: 5 tables in 3NF)
```

---

## Features

| Page | What it does | SQL concepts |
|------|--------------|--------------|
| **Store** `/` | Product grid, search, category filter, sort | `SELECT`, `INNER JOIN`, `WHERE`, `LIKE`, `ORDER BY` |
| **Cart** `/cart` | Cart saved in the browser, live bill, checkout form | (client side) |
| **Place order** `POST /place-order` | Saves customer, order, items; reduces stock | **Transaction** (`BEGIN`/`COMMIT`/`ROLLBACK`), `SELECT … FOR UPDATE`, `INSERT`, `UPDATE` |
| **Orders** `/orders` | Order history with customer and items; change status | `COUNT`, `SUM`, `AVG`, multi-table `JOIN`, `UPDATE` |
| **Admin** `/admin` | Category stats, add / restock / delete products | `GROUP BY`, `LEFT JOIN`, `INSERT`, `UPDATE`, `DELETE`, foreign-key protection |
| **Analytics** `/analytics` | Sales dashboard with the SQL shown under every report | `GROUP BY`, `HAVING`, subqueries, `RANK() OVER`, running totals, `CASE` |

---

## 1. Requirements (Windows)

| Tool | Download | Check |
|------|----------|-------|
| Node.js 18 or newer (LTS) | nodejs.org | `node -v` |
| MySQL 8.0+ | dev.mysql.com/downloads/installer, **or** XAMPP (its MariaDB works too) | MySQL running |

> Window functions (`RANK() OVER`) need MySQL 8.0+ or MariaDB 10.2+. XAMPP's bundled MariaDB is fine.

## 2. Setup

```bash
git clone <your-repo-url>
cd <your-repo-folder>
npm install
copy .env.example .env
```

Open `.env` and set your MySQL password (`DB_PASSWORD=`). With XAMPP the default is user `root` and an **empty** password, so you can leave it blank.

Create the database and sample data:

```bash
npm run setup
```

This runs `database/schema.sql`: it creates `quickkart_db`, the 5 tables, 24 products, 5 customers and 14 sample orders spread over the last two weeks.
(Or import `database/schema.sql` in MySQL Workbench / phpMyAdmin; the result is the same.)

> Running `npm run setup` again **resets** the database to the sample data.

## 3. Run

```bash
npm start
```

Open **http://localhost:3000**. Use `npm run dev` instead to auto-restart when you edit a file.

---

## 4. Project structure

```
├── server.js               Express app: views, static files, routes, error pages
├── config/
│   └── db.js               MySQL connection pool (mysql2)
├── routes/
│   ├── store.js            Store, cart, place order (transaction), order history
│   ├── admin.js            Add / restock / delete products, change order status
│   └── analytics.js        Sales analytics queries
├── views/                  EJS templates (HTML with <%= %> placeholders)
│   ├── partials/           header.ejs, footer.ejs (shared navbar and footer)
│   ├── index.ejs           Store
│   ├── cart.ejs            Cart + checkout form
│   ├── order-success.ejs   Order confirmation
│   ├── orders.ejs          Order history
│   ├── admin.ejs           Admin console
│   ├── analytics.ejs       Analytics dashboard
│   └── error.ejs           404 / database error page
├── public/
│   ├── css/style.css       All styling
│   ├── js/app.js           Cart logic (localStorage) and button handlers
│   └── img/placeholder.svg Shown if a product image can't load
├── database/
│   ├── schema.sql          Tables, constraints, seed data
│   └── queries_showcase.sql 20 labelled SQL queries for the lab/viva
├── scripts/
│   └── setup-db.js         Runs schema.sql (npm run setup)
├── PROJECT_REPORT.md       Report: ER diagram, normalization, viva Q&A
├── .env.example            Copy to .env
└── package.json
```

## 5. Demo script (3–4 minutes)

1. **Store:** search "milk" (`LIKE`), click a category (`WHERE`), sort by price (`ORDER BY`).
2. Add a few items to the cart, open **Cart**, change quantities, fill in the form, place the order.
3. On the confirmation, open **Orders**: your order is at the top, joined with its customer and items. Change its status (`UPDATE`).
4. **Admin:** stock for the items you bought has gone down. Try to **Delete** product #1. MySQL refuses because it's in past orders (`ON DELETE RESTRICT`). Add a new product, then delete it (works, no orders).
5. **Analytics:** open *Show SQL* under "Best-Selling Product in Each Category" and explain `RANK() OVER (PARTITION BY …)`.
6. **Transaction rollback:** add more of "McCain French Fries" than the 6 in stock and try to order. The order is rejected and *nothing* is saved, not even the new customer, because the whole transaction is rolled back.

## 6. Troubleshooting

| Problem | Fix |
|---------|-----|
| `Access denied for user 'root'` | Wrong `DB_PASSWORD` in `.env` |
| `ECONNREFUSED` | MySQL isn't running. Start it in XAMPP, or Windows Services → **MySQL80** |
| `Unknown database 'quickkart_db'` | Run `npm run setup` |
| Syntax error near `OVER` | MySQL is older than 8.0. Upgrade, or use XAMPP's MariaDB |
| Port 3000 in use | Change `PORT` in `.env` |
| Product images missing | They load from Unsplash, so you need internet. A cart icon is shown instead when offline. |
