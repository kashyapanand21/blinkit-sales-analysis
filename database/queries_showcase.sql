-- ============================================================================
-- QuickKart: SQL demonstration queries for DBMS lab / viva
-- Run after schema.sql (npm run setup). Each query is labelled with its concept.
-- The SELECT queries are safe to run any time. Section D changes data,
-- so it is wrapped in a transaction that is rolled back at the end.
-- ============================================================================
USE quickkart_db;
SET NAMES utf8mb4;  -- so emoji icons store correctly from any client

-- ============================================================================
-- A. BASIC SELECT
-- ============================================================================

-- 1. WHERE + LIKE (search feature on the home page)
SELECT product_id, product_name, unit, price, stock_quantity
FROM products
WHERE product_name LIKE '%milk%' OR product_name LIKE '%bread%';

-- 2. INNER JOIN + WHERE (category filter on the home page)
SELECT p.product_id, p.product_name, p.price, c.category_name
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
WHERE p.category_id = 1;

-- 3. ORDER BY (sort dropdown)
SELECT product_name, price FROM products ORDER BY price ASC;
SELECT product_name, price FROM products ORDER BY price DESC;

-- 4. LIMIT (top 5 most expensive products)
SELECT product_name, price FROM products ORDER BY price DESC LIMIT 5;

-- ============================================================================
-- B. JOINS
-- ============================================================================

-- 5. INNER JOIN: orders with customer details (Orders page)
SELECT o.order_id, c.full_name AS customer_name, c.phone,
       o.total_amount, o.order_status, o.order_date
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id
ORDER BY o.order_id DESC;

-- 6. 5-TABLE JOIN: full bill for one order
SELECT o.order_id, c.full_name, p.product_name, cat.category_name,
       oi.quantity, oi.unit_price, oi.subtotal
FROM orders o
INNER JOIN customers c    ON o.customer_id  = c.customer_id
INNER JOIN order_items oi ON o.order_id     = oi.order_id
INNER JOIN products p     ON oi.product_id  = p.product_id
INNER JOIN categories cat ON p.category_id  = cat.category_id
WHERE o.order_id = 1;

-- 7. LEFT JOIN: products that have NEVER been ordered (NULL on the right side)
SELECT p.product_id, p.product_name
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
WHERE oi.order_item_id IS NULL;

-- ============================================================================
-- C. AGGREGATES, GROUP BY, HAVING, SUBQUERIES, WINDOW FUNCTIONS
-- ============================================================================

-- 8. Aggregate functions over the whole table
SELECT COUNT(order_id)   AS total_orders_placed,
       SUM(total_amount) AS total_revenue_inr,
       AVG(total_amount) AS average_order_value,
       MIN(total_amount) AS minimum_order,
       MAX(total_amount) AS maximum_order
FROM orders;

-- 9. GROUP BY + LEFT JOIN: products per category (Admin page)
SELECT c.category_name, COUNT(p.product_id) AS total_products
FROM categories c
LEFT JOIN products p ON c.category_id = p.category_id
GROUP BY c.category_id, c.category_name
ORDER BY total_products DESC;

-- 10. GROUP BY + HAVING: customers who spent more than ₹500 in total
SELECT c.customer_id, c.full_name,
       COUNT(o.order_id)   AS orders_count,
       SUM(o.total_amount) AS total_spent
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.full_name
HAVING SUM(o.total_amount) > 500
ORDER BY total_spent DESC;

-- 11. Subquery in WHERE: products priced above the average price
SELECT product_name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products)
ORDER BY price DESC;

-- 12. IN with subquery: customers who bought anything from 'Cold Drinks & Juices'
SELECT full_name FROM customers
WHERE customer_id IN (
    SELECT o.customer_id
    FROM orders o
    INNER JOIN order_items oi ON o.order_id = oi.order_id
    INNER JOIN products p     ON oi.product_id = p.product_id
    INNER JOIN categories c   ON p.category_id = c.category_id
    WHERE c.category_name = 'Cold Drinks & Juices'
);

-- 13. Window function RANK(): rank products by units sold (needs MySQL 8+)
SELECT p.product_name,
       SUM(oi.quantity) AS units_sold,
       RANK() OVER (ORDER BY SUM(oi.quantity) DESC) AS sales_rank
FROM order_items oi
INNER JOIN products p ON oi.product_id = p.product_id
GROUP BY p.product_id, p.product_name;

-- 14. Window function running total: revenue per day + cumulative revenue
SELECT DATE(order_date) AS order_day,
       SUM(total_amount) AS revenue,
       SUM(SUM(total_amount)) OVER (ORDER BY DATE(order_date)) AS running_total
FROM orders
GROUP BY DATE(order_date)
ORDER BY order_day;

-- 15. CASE: label each product's stock level
SELECT product_name, stock_quantity,
       CASE WHEN stock_quantity = 0  THEN 'Out of stock'
            WHEN stock_quantity < 10 THEN 'Low'
            ELSE 'OK' END AS stock_level
FROM products
ORDER BY stock_quantity;

-- ============================================================================
-- D. DML + TRANSACTION (rolled back, so the demo data is unchanged)
-- ============================================================================
START TRANSACTION;

-- 16. INSERT a category, then a product using that new category's id
INSERT INTO categories (category_name, category_icon) VALUES ('Personal Care', '🧴');
INSERT INTO products (category_id, product_name, unit, price, stock_quantity, image_url)
VALUES (LAST_INSERT_ID(), 'Dettol Original Liquid Handwash', '200 ml', 99.00, 40,
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae');

-- 17. UPDATE: reduce stock after a sale
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE product_id = 1;

-- 18. DELETE blocked by a foreign key: product 1 is in past orders, so this
--     fails with error 1451 (ON DELETE RESTRICT). Uncomment to see it.
-- DELETE FROM products WHERE product_id = 1;

-- 19. DELETE that works: the product we just added has no orders
DELETE FROM products WHERE product_name = 'Dettol Original Liquid Handwash';

-- 20. ROLLBACK undoes everything since START TRANSACTION
ROLLBACK;

SELECT COUNT(*) AS categories_after_rollback FROM categories;  -- still 6
