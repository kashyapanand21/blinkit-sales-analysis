-- ============================================================================
-- QuickKart: Mini Grocery Shopping Database (Blinkit-inspired)
-- Subject: Database Management Systems (DBMS) - 2nd Year College Project
-- Design: 5 tables in 3NF, primary/foreign keys, CHECK constraints, indexes
--
-- Run it with:  npm run setup
-- or paste it into MySQL Workbench and execute (it creates quickkart_db).
-- ============================================================================

-- Step 1: Create database
CREATE DATABASE IF NOT EXISTS quickkart_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quickkart_db;
SET NAMES utf8mb4;  -- so emoji icons store correctly from any client

-- Step 2: Drop tables in reverse dependency order (children before parents)
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;

-- ============================================================================
-- TABLE 1: categories
-- ============================================================================
CREATE TABLE categories (
    category_id   INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    category_icon VARCHAR(20)  DEFAULT '🛒',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE 2: products   (FK -> categories)
-- ============================================================================
CREATE TABLE products (
    product_id     INT AUTO_INCREMENT PRIMARY KEY,
    category_id    INT NOT NULL,
    product_name   VARCHAR(150) NOT NULL,
    unit           VARCHAR(50)  NOT NULL,               -- e.g. '500 ml', '1 kg'
    price          DECIMAL(10,2) NOT NULL CHECK (price > 0),
    stock_quantity INT NOT NULL DEFAULT 50 CHECK (stock_quantity >= 0),
    image_url      VARCHAR(255) NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_products_name (product_name)                -- speeds up search
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE 3: customers
-- ============================================================================
CREATE TABLE customers (
    customer_id      INT AUTO_INCREMENT PRIMARY KEY,
    full_name        VARCHAR(120) NOT NULL,
    email            VARCHAR(120) NOT NULL UNIQUE,
    phone            VARCHAR(20)  NOT NULL,
    delivery_address TEXT NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE 4: orders   (FK -> customers)
-- ============================================================================
CREATE TABLE orders (
    order_id       INT AUTO_INCREMENT PRIMARY KEY,
    customer_id    INT NOT NULL,
    order_date     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount   DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    order_status   ENUM('Placed', 'Preparing', 'Out for Delivery', 'Delivered') DEFAULT 'Placed',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery (COD)',
    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_orders_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE 5: order_items   (junction table: resolves Orders M:N Products)
-- ============================================================================
CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id      INT NOT NULL,
    product_id    INT NOT NULL,
    quantity      INT NOT NULL CHECK (quantity > 0),
    unit_price    DECIMAL(10,2) NOT NULL,   -- price at the time of purchase
    subtotal      DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uq_order_product (order_id, product_id)   -- one line per product per order
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- SEED DATA: categories
-- ============================================================================
INSERT INTO categories (category_name, category_icon) VALUES
('Dairy, Bread & Eggs', '🥛'),
('Fruits & Vegetables', '🍎'),
('Cold Drinks & Juices', '🥤'),
('Snacks & Munchies', '🍟'),
('Instant & Frozen Food', '🍜'),
('Bakery & Biscuits', '🍪');

-- ============================================================================
-- SEED DATA: products (IDs 1-24, in this order)
-- ============================================================================
INSERT INTO products (category_id, product_name, unit, price, stock_quantity, image_url) VALUES
-- Dairy, Bread & Eggs (IDs 1-5)
(1, 'Amul Taaza Toned Fresh Milk', '500 ml', 27.00, 100, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=60'),
(1, 'Harvest Gold White Bread', '400 g', 35.00, 60, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=60'),
(1, 'Farm Fresh White Eggs', '6 pcs', 49.00, 80, 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&auto=format&fit=crop&q=60'),
(1, 'Amul Salted Butter', '100 g', 56.00, 75, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=60'),
(1, 'Mother Dairy Classic Dahi', '400 g', 35.00, 8, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=60'),
-- Fruits & Vegetables (IDs 6-10)
(2, 'Hybrid Fresh Red Tomatoes', '1 kg', 38.00, 120, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=60'),
(2, 'Fresh Red Onion (Pyaz)', '1 kg', 42.00, 150, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=60'),
(2, 'Fresh Jyoti Potato (Aloo)', '1 kg', 29.00, 140, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=60'),
(2, 'Royal Gala Crisp Apple', '4 pcs (500 g)', 119.00, 45, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=60'),
(2, 'Fresh Robusta Bananas', '1 kg (approx 6 pcs)', 55.00, 60, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=60'),
-- Cold Drinks & Juices (IDs 11-14)
(3, 'Coca-Cola Soft Drink Can', '300 ml', 40.00, 90, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=60'),
(3, 'Sprite Lemon-Lime Soft Drink', '750 ml', 45.00, 80, 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&auto=format&fit=crop&q=60'),
(3, 'Real Fruit Power Alphonso Mango Juice', '1 L', 115.00, 40, 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=60'),
(3, 'Red Bull Energy Drink', '250 ml', 125.00, 60, 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=60'),
-- Snacks & Munchies (IDs 15-18)
(4, 'Lays Indias Magic Masala Potato Chips', '50 g', 20.00, 110, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=60'),
(4, 'Haldirams Nagpur Aloo Bhujia', '150 g', 45.00, 95, 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=400&auto=format&fit=crop&q=60'),
(4, 'Kurkure Masala Munch Snack', '75 g', 20.00, 130, 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=400&auto=format&fit=crop&q=60'),
(4, 'Act II Butter Lovers Popcorn', '70 g', 35.00, 0, 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&auto=format&fit=crop&q=60'),
-- Instant & Frozen Food (IDs 19-21)
(5, 'Maggi 2-Minute Masala Noodles Pack', '280 g (4 in 1)', 58.00, 150, 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=60'),
(5, 'McCain French Fries Ready to Fry', '420 g', 120.00, 6, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop&q=60'),
(5, 'Chings Secret Hakka Noodles', '150 g', 40.00, 65, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=60'),
-- Bakery & Biscuits (IDs 22-24)
(6, 'Britannia Good Day Butter Cookies', '200 g', 35.00, 90, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=60'),
(6, 'Oreo Vanilla Creme Biscuit Family Pack', '300 g', 75.00, 85, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'),
(6, 'Parle-G Gold Glucose Biscuits', '250 g', 30.00, 120, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=60');

-- ============================================================================
-- SEED DATA: customers
-- ============================================================================
INSERT INTO customers (full_name, email, phone, delivery_address) VALUES
('Ritesh Yadav', 'ritesh.yadav@example.com', '9876543210', 'Flat 402, Green Valley Apts, Sector 62, Noida'),
('Priya Sharma', 'priya.sharma@example.com', '9811223344', 'House 14B, Model Town, Delhi'),
('Aman Verma',   'aman.verma@example.com',   '9988776655', 'Flat 201, Sunrise Heights, Indirapuram, Ghaziabad'),
('Sneha Gupta',  'sneha.gupta@example.com',  '9123456780', 'Room 118, Girls Hostel B, College Campus'),
('Karan Mehta',  'karan.mehta@example.com',  '9001122334', 'H.No. 56, Civil Lines, Jaipur');

-- ============================================================================
-- SEED DATA: orders spread over the last 14 days (so Analytics has a trend)
-- total_amount = sum of item subtotals + ₹25 delivery if subtotal <= ₹199
-- ============================================================================
INSERT INTO orders (customer_id, order_date, total_amount, order_status, payment_method) VALUES
(1, NOW() - INTERVAL 13 DAY - INTERVAL 37 MINUTE, 170.00, 'Delivered', 'Cash on Delivery (COD)'),
(2, NOW() - INTERVAL 12 DAY - INTERVAL 74 MINUTE, 234.00, 'Delivered', 'UPI'),
(3, NOW() - INTERVAL 11 DAY - INTERVAL 111 MINUTE, 100.00, 'Delivered', 'Cash on Delivery (COD)'),
(4, NOW() - INTERVAL 10 DAY - INTERVAL 148 MINUTE, 256.00, 'Delivered', 'UPI'),
(1, NOW() - INTERVAL 9 DAY - INTERVAL 185 MINUTE, 198.00, 'Delivered', 'UPI'),
(5, NOW() - INTERVAL 8 DAY - INTERVAL 222 MINUTE, 290.00, 'Delivered', 'Cash on Delivery (COD)'),
(2, NOW() - INTERVAL 7 DAY - INTERVAL 259 MINUTE, 227.00, 'Delivered', 'UPI'),
(3, NOW() - INTERVAL 6 DAY - INTERVAL 296 MINUTE, 210.00, 'Delivered', 'UPI'),
(4, NOW() - INTERVAL 5 DAY - INTERVAL 33 MINUTE, 199.00, 'Delivered', 'Cash on Delivery (COD)'),
(1, NOW() - INTERVAL 4 DAY - INTERVAL 70 MINUTE, 190.00, 'Delivered', 'UPI'),
(5, NOW() - INTERVAL 3 DAY - INTERVAL 107 MINUTE, 228.00, 'Delivered', 'UPI'),
(2, NOW() - INTERVAL 2 DAY - INTERVAL 144 MINUTE, 201.00, 'Out for Delivery', 'Cash on Delivery (COD)'),
(3, NOW() - INTERVAL 1 DAY - INTERVAL 181 MINUTE, 305.00, 'Preparing', 'UPI'),
(4, NOW() - INTERVAL 0 DAY - INTERVAL 218 MINUTE, 85.00, 'Placed', 'Cash on Delivery (COD)');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
(1, 1, 2, 27.00, 54.00),
(1, 2, 1, 35.00, 35.00),
(1, 4, 1, 56.00, 56.00),
(2, 9, 1, 119.00, 119.00),
(2, 13, 1, 115.00, 115.00),
(3, 23, 1, 75.00, 75.00),
(4, 19, 2, 58.00, 116.00),
(4, 15, 3, 20.00, 60.00),
(4, 11, 2, 40.00, 80.00),
(5, 6, 1, 38.00, 38.00),
(5, 7, 1, 42.00, 42.00),
(5, 8, 2, 29.00, 58.00),
(5, 5, 1, 35.00, 35.00),
(6, 14, 2, 125.00, 250.00),
(6, 17, 2, 20.00, 40.00),
(7, 1, 4, 27.00, 108.00),
(7, 3, 1, 49.00, 49.00),
(7, 22, 2, 35.00, 70.00),
(8, 20, 1, 120.00, 120.00),
(8, 12, 2, 45.00, 90.00),
(9, 10, 1, 55.00, 55.00),
(9, 9, 1, 119.00, 119.00),
(10, 16, 2, 45.00, 90.00),
(10, 18, 1, 35.00, 35.00),
(10, 11, 1, 40.00, 40.00),
(11, 19, 1, 58.00, 58.00),
(11, 21, 2, 40.00, 80.00),
(11, 24, 3, 30.00, 90.00),
(12, 2, 1, 35.00, 35.00),
(12, 4, 2, 56.00, 112.00),
(12, 1, 2, 27.00, 54.00),
(13, 13, 2, 115.00, 230.00),
(13, 23, 1, 75.00, 75.00),
(14, 15, 2, 20.00, 40.00),
(14, 17, 1, 20.00, 20.00);

