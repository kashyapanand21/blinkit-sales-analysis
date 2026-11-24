-- ============================================================================
-- QuickKart: Comprehensive SQL Demonstration Queries
-- For DBMS / DMGT 2nd Year College Viva & Lab Evaluation
-- ============================================================================
USE quickkart_db;

-- 1. DDL: CREATE TABLE (Example of Primary Key, Foreign Key, & Constraints)
-- Explained: Table creation with referential integrity.
-- (Already executed in schema.sql)

-- 2. DML: INSERT Query
-- Inserting a new category and product
INSERT INTO categories (category_name, category_icon) 
VALUES ('Personal Care', '🧴');

INSERT INTO products (category_id, product_name, unit, price, stock_quantity, image_url) 
VALUES (LAST_INSERT_ID(), 'Dettol Original Liquid Handwash', '200 ml', 99.00, 40, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae');

-- 3. SELECT with WHERE and LIKE (Grocery Search Functionality)
-- Case-insensitive pattern matching for items containing "milk" or "bread"
SELECT product_id, product_name, unit, price, stock_quantity 
FROM products 
WHERE product_name LIKE '%milk%' OR product_name LIKE '%bread%';

-- 4. SELECT with WHERE and Category Filter
SELECT p.product_id, p.product_name, p.price, c.category_name
FROM products p
WHERE p.category_id = 1;

-- 5. ORDER BY (Sort by Price Ascending & Descending)
-- Low to high:
SELECT product_name, price 
FROM products 
ORDER BY price ASC;

-- High to low:
SELECT product_name, price 
FROM products 
ORDER BY price DESC;

-- 6. DML: UPDATE Query (Updating stock quantity or price)
UPDATE products 
SET stock_quantity = stock_quantity - 2 
WHERE product_id = 1;

-- 7. DML: DELETE Query (Admin deleting a product)
DELETE FROM products 
WHERE product_id = 999; -- safe test

-- 8. INNER JOIN: Retrieve Order Details with Customer Name
SELECT 
    o.order_id, 
    c.full_name AS customer_name, 
    c.phone, 
    o.total_amount, 
    o.order_status, 
    o.order_date
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id
ORDER BY o.order_id DESC;

-- 9. MULTI-TABLE INNER JOIN: Detailed Bill with Product Name & Category
SELECT 
    o.order_id,
    c.full_name,
    p.product_name,
    cat.category_name,
    oi.quantity,
    oi.unit_price,
    oi.subtotal
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
INNER JOIN categories cat ON p.category_id = cat.category_id
WHERE o.order_id = 1;

-- 10. AGGREGATE FUNCTIONS: COUNT() and SUM() (Summary Statistics)
-- Total revenue collected across all orders:
SELECT 
    COUNT(order_id) AS total_orders_placed,
    SUM(total_amount) AS total_revenue_inr,
    AVG(total_amount) AS average_order_value,
    MIN(total_amount) AS minimum_order,
    MAX(total_amount) AS maximum_order
FROM orders;

-- 11. GROUP BY with COUNT(): Count of products per category
SELECT 
    c.category_id,
    c.category_name,
    COUNT(p.product_id) AS total_products_in_stock
FROM categories c
LEFT JOIN products p ON c.category_id = p.category_id
GROUP BY c.category_id, c.category_name
ORDER BY total_products_in_stock DESC;

-- 12. GROUP BY with SUM() and HAVING: Total sales per customer
SELECT 
    c.customer_id,
    c.full_name,
    COUNT(o.order_id) AS orders_count,
    SUM(o.total_amount) AS total_spent
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.full_name
HAVING total_spent > 100
ORDER BY total_spent DESC;
