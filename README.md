# QuickKart – Mini Grocery Shopping Website (Blinkit-Inspired)

A clean, responsive, and functional relational database web project designed specifically for **2nd Year Engineering Coursework in DBMS (Database Management Systems) / DMGT**.

---

## 📌 Technology Stack

- **Database:** MySQL 8.0 / 5.7 (5 Normalized 3NF Relational Tables with Foreign Keys & ACID Transactions).
- **Backend:** Node.js & Express.js with `mysql2/promise` (Direct, raw SQL queries with prepared statements — NO ORM abstractions).
- **Frontend:** HTML5, CSS3 (Blinkit Green `#0c831f` & Yellow `#f8cb46` theme), Vanilla JavaScript (Fetch API, DOM manipulation).

---

## 📁 Project Directory Structure

```text
blinkit-sales-analysis/
│
├── config/
│   └── db.js                   # MySQL2 connection pool with promise support
│
├── database/
│   ├── schema.sql              # Database DDL (5 normalized tables) + realistic grocery seed data
│   └── queries_showcase.sql    # Every required SQL query categorized for Viva & Lab exams
│
├── routes/
│   ├── products.js             # GET /api/products, /api/categories (LIKE, WHERE, ORDER BY, INNER JOIN)
│   ├── orders.js               # POST /api/orders (ACID Transaction), GET /api/orders (Multi-table JOINs, COUNT, SUM, AVG)
│   └── admin.js                # GET /api/admin/stats (GROUP BY), POST/DELETE /api/admin/products (INSERT, DELETE)
│
├── public/
│   ├── css/
│   │   └── style.css           # Blinkit-inspired responsive styling, card grid, tables, badges
│   ├── js/
│   │   └── app.js              # Cart state (localStorage), Fetch API calls, bill calculator
│   ├── index.html              # Home catalog (Category filter, price sort, SQL LIKE search)
│   ├── cart.html               # Shopping cart & customer checkout form
│   ├── orders.html             # Relational report page (INNER JOIN across 5 tables, COUNT, SUM, AVG)
│   └── admin.html              # Product management portal (SQL INSERT, DELETE, GROUP BY metrics)
│
├── server.js                   # Express server entry point & static file hosting
├── package.json                # Project dependencies & npm scripts
├── .env.example                # Example database environment variables
├── PROJECT_REPORT.md           # Full academic report, ER diagram, 3NF normalization & Viva Q&A
└── README.md                   # Setup guide and instructions
```

---

## 🚀 Setup & Installation Guide

### Step 1: Clone the Repository
```bash
git clone https://github.com/riteshyadav33302111-cell/blinkit-sales-analysis.git
cd blinkit-sales-analysis
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Setup Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and set your MySQL password:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=quickkart_db
```

### Step 4: Import Database into MySQL
Open MySQL Workbench (or Command Prompt) and execute `database/schema.sql`:
```bash
mysql -u root -p < database/schema.sql
```
*(This creates `quickkart_db` with all 5 normalized tables and realistic grocery seed data).*

### Step 5: Start the Server
```bash
npm start
```
Open your browser and navigate to:
👉 **http://localhost:3000**

---

## 🧪 Step-by-Step Feature Walkthrough

1. **Browse Groceries:**
   - 20+ realistic grocery items categorized under Dairy, Fruits & Vegetables, Cold Drinks, Snacks, and Bakery.
2. **Search using SQL `LIKE`:**
   - Type `milk`, `apple`, `chips`, or `coke` in the top search bar.
3. **Filter & Sort:**
   - Click category chips to trigger SQL `WHERE category_id = ?`.
   - Sort products by price using SQL `ORDER BY price ASC/DESC`.
4. **Cart Operations:**
   - Click **+ ADD** on items to store them in browser storage.
   - Click **🛒 My Cart** to change quantities (+ / -) or remove items.
5. **Place an Order (ACID Transaction):**
   - Fill in your name, email, phone number, and delivery address.
   - Click **🚀 Place 10-Min Order**.
   - Behind the scenes, the Node.js backend initiates an **ACID Transaction** (`beginTransaction`, `INSERT INTO customers`, `INSERT INTO orders`, `INSERT INTO order_items`, and decrements inventory in `products`, followed by `commit`).
6. **View Order History:**
   - Click **📦 My Orders** to view the relational report powered by multi-table `INNER JOIN`s, `COUNT()`, `SUM()`, and `AVG()`.
7. **Admin Product Management:**
   - Click **⚙️ Admin** to view category-level product counts using `GROUP BY`, add a new product (`INSERT`), or delete an item (`DELETE`).

---

## 🎓 Academic Evaluation Highlights

- **Pure SQL Queries:** Uses raw SQL prepared statements inside Node.js controllers without hiding database logic behind an ORM.
- **Relational Integrity:** Implemented foreign keys with `ON DELETE CASCADE` and `ON UPDATE CASCADE`.
- **Transactions:** Demonstrates ACID properties when generating order invoices.
- **Documentation:** Full ER diagram, Relational Schema, and Viva Q&A available in [`PROJECT_REPORT.md`](PROJECT_REPORT.md).
