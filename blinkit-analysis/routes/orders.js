// ============================================================================
// QuickKart - Orders Route (routes/orders.js)
// Demonstrates SQL Concepts: ACID Transactions, Multi-Table INNER JOINs, Aggregate Functions
// ============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/orders - Place a new order using an ACID Database Transaction
router.post('/orders', async (req, res) => {
    const { full_name, email, phone, delivery_address, payment_method, cart_items } = req.body;

    if (!full_name || !email || !phone || !delivery_address || !Array.isArray(cart_items) || cart_items.length === 0) {
        return res.status(400).json({ success: false, error: 'All fields and at least one cart item are required.' });
    }

    // Acquire dedicated connection from pool for transaction
    const conn = await pool.getConnection();

    try {
        // Step 1: START TRANSACTION (Atomicity & Consistency)
        await conn.beginTransaction();

        // Step 2: Check if customer already exists, or insert new customer (UPSERT/SELECT & INSERT)
        const [existingCust] = await conn.query('SELECT customer_id FROM customers WHERE email = ? LIMIT 1', [email]);
        let customerId;

        if (existingCust.length > 0) {
            customerId = existingCust[0].customer_id;
            // Update customer details if modified
            await conn.query(
                'UPDATE customers SET full_name = ?, phone = ?, delivery_address = ? WHERE customer_id = ?',
                [full_name, phone, delivery_address, customerId]
            );
        } else {
            const [custResult] = await conn.query(
                'INSERT INTO customers (full_name, email, phone, delivery_address) VALUES (?, ?, ?, ?)',
                [full_name, email, phone, delivery_address]
            );
            customerId = custResult.insertId;
        }

        // Step 3: Validate Cart Items & Calculate Total from live MySQL prices
        let subtotal = 0;
        const validItems = [];

        for (const item of cart_items) {
            const pid = parseInt(item.id, 10);
            const qty = parseInt(item.quantity, 10);
            if (!pid || qty <= 0) continue;

            const [prodRows] = await conn.query('SELECT product_id, product_name, price, stock_quantity FROM products WHERE product_id = ?', [pid]);
            if (prodRows.length > 0) {
                const prod = prodRows[0];
                const itemPrice = parseFloat(prod.price);
                const lineTotal = itemPrice * qty;
                subtotal += lineTotal;
                validItems.push({
                    productId: pid,
                    quantity: qty,
                    unitPrice: itemPrice,
                    subtotal: lineTotal
                });
            }
        }

        if (validItems.length === 0) {
            throw new Error('None of the items in the cart are valid products.');
        }

        const deliveryFee = subtotal > 199 ? 0.00 : 25.00;
        const grandTotal = subtotal + deliveryFee;

        // Step 4: INSERT INTO orders table
        const [orderResult] = await conn.query(
            'INSERT INTO orders (customer_id, total_amount, order_status, payment_method) VALUES (?, ?, "Placed", ?)',
            [customerId, grandTotal, payment_method || 'Cash on Delivery (COD)']
        );
        const orderId = orderResult.insertId;

        // Step 5: INSERT INTO order_items & UPDATE products inventory
        for (const it of validItems) {
            await conn.query(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
                [orderId, it.productId, it.quantity, it.unitPrice, it.subtotal]
            );

            // Decrement stock in products table
            await conn.query(
                'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE product_id = ?',
                [it.quantity, it.productId]
            );
        }

        // Step 6: COMMIT TRANSACTION (Permanently write to disk)
        await conn.commit();

        res.json({
            success: true,
            message: 'Order placed successfully!',
            orderId: orderId,
            totalAmount: grandTotal
        });

    } catch (err) {
        // Rollback any executed queries on error
        await conn.rollback();
        console.error('Order transaction failed:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        conn.release();
    }
});

// GET /api/orders - Fetch all orders with customer & product details, plus aggregate metrics
router.get('/orders', async (req, res) => {
    try {
        // SQL Aggregate Functions: COUNT, SUM, AVG
        const [metricRows] = await pool.query(`
            SELECT 
                COUNT(order_id) AS total_orders,
                COALESCE(SUM(total_amount), 0) AS total_sales,
                COALESCE(AVG(total_amount), 0) AS average_order_value
            FROM orders
        `);

        // SQL Multi-table INNER JOIN: orders -> customers
        const [orders] = await pool.query(`
            SELECT 
                o.order_id,
                o.order_date,
                o.total_amount,
                o.order_status,
                o.payment_method,
                c.customer_id,
                c.full_name AS customer_name,
                c.email,
                c.phone,
                c.delivery_address
            FROM orders o
            INNER JOIN customers c ON o.customer_id = c.customer_id
            ORDER BY o.order_id DESC
        `);

        // For each order, fetch items with products & categories via MULTI-JOIN
        for (const order of orders) {
            const [items] = await pool.query(`
                SELECT 
                    oi.quantity,
                    oi.unit_price,
                    oi.subtotal,
                    p.product_name,
                    p.unit,
                    cat.category_name
                FROM order_items oi
                INNER JOIN products p ON oi.product_id = p.product_id
                INNER JOIN categories cat ON p.category_id = cat.category_id
                WHERE oi.order_id = ?
            `, [order.order_id]);
            order.items = items;
        }

        res.json({
            success: true,
            metrics: metricRows[0],
            data: orders
        });
    } catch (err) {
        console.error('Error fetching orders report:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
