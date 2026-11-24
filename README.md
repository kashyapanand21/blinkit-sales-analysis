# QuickKart – Mini Grocery Shopping Website (Blinkit-Inspired)

A clean, responsive, and functional relational database web project designed specifically for **2nd Year Engineering Coursework in DBMS (Database Management Systems) / DMGT**.

---

## 📌 Technology Stack

- **Frontend:** HTML5, CSS3 (Blinkit Green `#0c831f` & Yellow `#f8cb46` theme), Vanilla JavaScript (No React/Node/Mongo bloat).
- **Backend:** PHP 7.4+ / 8.x (Native PDO with prepared statements).
- **Database:** MySQL 5.7+ / 8.0 / MariaDB.
- **Local Server Environment:** XAMPP (Apache + MySQL + phpMyAdmin).

---

## 📁 Project Directory Structure

```text
QuickKart/
│
├── config/
│   └── db.php                  # PDO database connection with beginner-friendly error handling
│
├── css/
│   └── style.css               # Blinkit-inspired responsive styling, card grid, tables, badges
│
├── js/
│   └── app.js                  # Cart state (localStorage), badge counter, total calculator
│
├── database/
│   ├── schema.sql              # Database DDL (5 normalized tables) + realistic grocery seed data
│   └── queries_showcase.sql    # Every required SQL query categorized for Viva & Lab exams
│
├── index.php                   # Home catalog (Category filter, price sort, SQL LIKE search)
├── cart.php                    # Shopping cart & checkout form for customer credentials
├── place_order.php             # Backend processor (ACID Transaction, stock decrement, order items)
├── orders.php                  # Relational report page (INNER JOIN across 5 tables, COUNT, SUM, AVG)
├── admin.php                   # Product management portal (SQL INSERT, DELETE, GROUP BY metrics)
├── admin_actions.php           # Handles admin product additions and deletions securely
├── PROJECT_REPORT.md           # Full academic report, ER diagram, 3NF normalization & Viva Q&A
└── README.md                   # Setup guide and instructions
```

---

## 🚀 Setup & Installation Guide (Using XAMPP)

Follow these step-by-step instructions to run the project locally on your machine:

### Step 1: Install XAMPP
If not already installed, download and install [XAMPP for Windows](https://www.apachefriends.org/index.html).

### Step 2: Copy Project to `htdocs`
Copy the entire `QuickKart` folder to your XAMPP web root directory:
```text
C:\xampp\htdocs\QuickKart
```

### Step 3: Start Apache & MySQL
1. Open the **XAMPP Control Panel**.
2. Click **Start** next to **Apache**.
3. Click **Start** next to **MySQL**.
Both modules should turn green.

### Step 4: Import Database in phpMyAdmin
1. Open your web browser and navigate to: [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
2. In the top navigation bar, click the **Import** tab.
3. Click **Choose File** and select:
   ```text
   C:\xampp\htdocs\QuickKart\database\schema.sql
   ```
4. Scroll to the bottom and click **Go** (or **Import**).
5. The `quickkart_db` database will be created with all 5 normalized tables and sample grocery products.

### Step 5: Launch the Website
Open your browser and visit:
```text
http://localhost/QuickKart/
```

---

## 🧪 Step-by-Step Feature Walkthrough

1. **Browse Groceries:**
   - Scroll through 20+ realistic grocery items categorized under Dairy, Fruits & Vegetables, Cold Drinks, Snacks, and Bakery.
2. **Search using SQL `LIKE`:**
   - Type `milk`, `apple`, `chips`, or `coke` in the top search bar and press Enter.
3. **Filter & Sort:**
   - Click category chips (e.g., *Dairy, Bread & Eggs*, *Fruits & Vegetables*).
   - Use the **Sort by** dropdown to sort products by *Price: Low to High* or *High to Low*.
4. **Cart Operations:**
   - Click **+ ADD** on any item to add it to your shopping cart.
   - Click the green **🛒 My Cart** button in the navbar.
   - In `cart.php`, change quantity (+ / -) or remove items. The subtotal and delivery fees recalculate automatically.
5. **Place an Order:**
   - Fill in your name, email, phone number, and delivery address.
   - Click **🚀 Place 10-Min Order**.
   - Behind the scenes, PHP runs a MySQL **ACID transaction** (`BEGIN TRANSACTION`, `INSERT INTO customers`, `INSERT INTO orders`, `INSERT INTO order_items`, and decrements inventory in `products`).
6. **View Order History:**
   - Click **📦 My Orders** (`orders.php`) to view the relational report powered by multi-table `INNER JOIN`s, `COUNT()`, `SUM()`, and `AVG()`.
7. **Admin Product Management:**
   - Click **⚙️ Admin** (`admin.php`).
   - View category-level product counts using `GROUP BY`.
   - Add a new product via the form (`INSERT`).
   - Delete an item from the table (`DELETE`).

---

## 🎓 Academic Evaluation Highlights

- **No Hardcoded Products:** All items and categories are dynamically read from MySQL tables.
- **Relational Integrity:** Implemented foreign keys with `ON DELETE CASCADE` and `ON UPDATE CASCADE`.
- **Prepared Statements:** Uses PHP PDO prepared queries to prevent SQL Injection.
- **Transactions:** Demonstrates ACID properties when generating order invoices.
- **Documentation:** Full ER diagram, Relational Schema, and Viva Q&A available in [`PROJECT_REPORT.md`](PROJECT_REPORT.md).
