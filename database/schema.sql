-- ============================================================================
-- QuickKart: Mini Grocery Shopping Database (Blinkit-Inspired)
-- Subject: Database Management Systems (DBMS / DMGT) - 2nd Year College Project
-- Designed with: 3NF Relational Normalization, Primary/Foreign Keys, Constraints
-- ============================================================================

-- Step 1: Create Database
CREATE DATABASE IF NOT EXISTS quickkart_db;
USE quickkart_db;

-- Step 2: Drop existing tables in reverse dependency order (to prevent FK conflicts)
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;

-- ============================================================================
-- TABLE 1: categories
-- Purpose: Classifies grocery products into groups (e.g., Dairy, Fruits, Snacks)
-- ============================================================================
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    category_icon VARCHAR(100) DEFAULT '🛒',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE 2: products
-- Purpose: Stores grocery inventory details with pricing and stock levels
-- FK: category_id references categories(category_id)
-- ============================================================================
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    unit VARCHAR(50) NOT NULL,              -- e.g., '500 ml', '1 kg', '6 pcs'
    price DECIMAL(10, 2) NOT NULL,          -- e.g., 28.00, 120.00
    stock_quantity INT NOT NULL DEFAULT 50,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) 
        REFERENCES categories(category_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE 3: customers
-- Purpose: Stores delivery info and contact credentials of buyers
-- ============================================================================
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    delivery_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE 4: orders
-- Purpose: Records placed grocery orders with payment method and order totals
-- FK: customer_id references customers(customer_id)
-- ============================================================================
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    order_status ENUM('Placed', 'Preparing', 'Out for Delivery', 'Delivered') DEFAULT 'Placed',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery (COD)',
    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TABLE 5: order_items
-- Purpose: Relational junction table resolving M:N relationship between 
--          Orders and Products (Stores individual items inside an order)
-- FK1: order_id references orders(order_id)
-- FK2: product_id references products(product_id)
-- ============================================================================
CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) 
        REFERENCES products(product_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- INSERT SEED DATA: Categories
-- ============================================================================
INSERT INTO categories (category_name, category_icon) VALUES
('Dairy, Bread & Eggs', '🥛'),
('Fruits & Vegetables', '🍎'),
('Cold Drinks & Juices', '🥤'),
('Snacks & Munchies', '🍟'),
('Instant & Frozen Food', '🍜'),
('Bakery & Biscuits', '🍪');

-- ============================================================================
-- INSERT SEED DATA: Realistic Grocery Products
-- ============================================================================
INSERT INTO products (category_id, product_name, unit, price, stock_quantity, image_url) VALUES
-- Dairy, Bread & Eggs (category_id = 1)
(1, 'Amul Taaza Toned Fresh Milk', '500 ml', 27.00, 100, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=60'),
(1, 'Harvest Gold White Bread', '400 g', 35.00, 60, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=60'),
(1, 'Farm Fresh White Eggs', '6 pcs', 49.00, 80, 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&auto=format&fit=crop&q=60'),
(1, 'Amul Salted Butter', '100 g', 56.00, 75, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=60'),
(1, 'Mother Dairy Classic Dahi', '400 g', 35.00, 50, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=60'),

-- Fruits & Vegetables (category_id = 2)
(2, 'Hybrid Fresh Red Tomatoes', '1 kg', 38.00, 120, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=60'),
(2, 'Fresh Red Onion (Pyaz)', '1 kg', 42.00, 150, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=60'),
(2, 'Fresh Jyoti Potato (Aloo)', '1 kg', 29.00, 140, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=60'),
(2, 'Royal Gala Crisp Apple', '4 pcs (500 g)', 119.00, 45, 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=60'),
(2, 'Fresh Robusta Bananas', '1 kg (approx 6 pcs)', 55.00, 60, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=60'),

-- Cold Drinks & Juices (category_id = 3)
(3, 'Coca-Cola Soft Drink Can', '300 ml', 40.00, 90, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=60'),
(3, 'Sprite Lemon-Lime Soft Drink', '750 ml', 45.00, 80, 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&auto=format&fit=crop&q=60'),
(3, 'Real Fruit Power Alphonso Mango Juice', '1 L', 115.00, 40, 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=60'),
(3, 'Red Bull Energy Drink', '250 ml', 125.00, 60, 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=60'),

-- Snacks & Munchies (category_id = 4)
(4, 'Lays Indias Magic Masala Potato Chips', '50 g', 20.00, 110, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=60'),
(4, 'Haldirams Nagpur Aloo Bhujia', '150 g', 45.00, 95, 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=400&auto=format&fit=crop&q=60'),
(4, 'Kurkure Masala Munch Snack', '75 g', 20.00, 130, 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=400&auto=format&fit=crop&q=60'),
(4, 'Act II Butter Lovers Popcorn', '70 g', 35.00, 70, 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&auto=format&fit=crop&q=60'),

-- Instant & Frozen Food (category_id = 5)
(5, 'Maggi 2-Minute Masala Noodles Pack', '280 g (4 in 1)', 58.00, 150, 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=60'),
(5, 'McCain French Fries Ready to Fry', '420 g', 120.00, 40, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop&q=60'),
(5, 'Chings Secret Hakka Noodles', '150 g', 40.00, 65, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=60'),

-- Bakery & Biscuits (category_id = 6)
(6, 'Britannia Good Day Butter Cookies', '200 g', 35.00, 90, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=60'),
(6, 'Oreo Vanilla Creme Biscuit Family Pack', '300 g', 75.00, 85, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'),
(6, 'Parle-G Gold Glucose Biscuits', '250 g', 30.00, 120, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=60');

-- ============================================================================
-- INSERT SEED DATA: Sample Customers
-- ============================================================================
INSERT INTO customers (full_name, email, phone, delivery_address) VALUES
('Ritesh Yadav', 'ritesh.yadav@example.com', '9876543210', 'Flat 402, Green Valley Apts, Sector 62, Noida'),
('Priya Sharma', 'priya.sharma@example.com', '9811223344', 'House 14B, Model Town, Delhi'),
('Aman Verma', 'aman.verma@example.com', '9988776655', 'Flat 201, Sunrise Heights, Indirapuram, Ghaziabad');

-- ============================================================================
-- INSERT SEED DATA: Sample Orders
-- ============================================================================
INSERT INTO orders (customer_id, total_amount, order_status, payment_method) VALUES
(1, 149.00, 'Delivered', 'Cash on Delivery (COD)'),
(2, 230.00, 'Out for Delivery', 'UPI / Online Payment'),
(3, 75.00, 'Placed', 'Cash on Delivery (COD)');

-- ============================================================================
-- INSERT SEED DATA: Sample Order Items
-- ============================================================================
-- Order 1: 2 Amul Milk (2x27=54) + 1 Bread (35) + 1 Salted Butter (56) = 145 + small adjustment or items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
(1, 1, 2, 27.00, 54.00),
(1, 2, 1, 35.00, 35.00),
(1, 4, 1, 60.00, 60.00);

-- Order 2: 1 Apple (119) + 1 Real Mango Juice (115) = 234 approx
INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
(2, 9, 1, 119.00, 119.00),
(2, 13, 1, 115.00, 115.00);

-- Order 3: 1 Oreo (75) = 75
INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
(3, 21, 1, 75.00, 75.00);
