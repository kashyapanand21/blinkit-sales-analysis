// ============================================================================
// QuickKart - Admin Management Route (routes/admin.js)
// Demonstrates SQL Concepts: GROUP BY, Aggregate Functions, INSERT, DELETE
// ============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/admin/stats - Category analytics using SQL GROUP BY
router.get('/stats', async (req, res) => {
    try {
        // SQL Concept: GROUP BY with COUNT() and AVG()
        const [stats] = await pool.query(`
            SELECT 
                c.category_id,
                c.category_name,
                c.category_icon,
                COUNT(p.product_id) AS total_items,
                COALESCE(AVG(p.price), 0) AS avg_price
            FROM categories c
            LEFT JOIN products p ON c.category_id = p.category_id
            GROUP BY c.category_id, c.category_name, c.category_icon
            ORDER BY total_items DESC
        `);

        res.json({ success: true, data: stats });
    } catch (err) {
        console.error('Error fetching admin stats:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/admin/products - Add a new product (SQL INSERT)
router.post('/products', async (req, res) => {
    try {
        const { category_id, product_name, unit, price, stock_quantity, image_url } = req.body;

        if (!category_id || !product_name || !unit || !price) {
            return res.status(400).json({ success: false, error: 'Category, product name, unit, and price are required.' });
        }

        const fallbackImg = image_url && image_url.trim() 
            ? image_url.trim() 
            : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=60';

        // SQL Concept: INSERT with Prepared Statements
        const [result] = await pool.query(
            'INSERT INTO products (category_id, product_name, unit, price, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [parseInt(category_id, 10), product_name.trim(), unit.trim(), parseFloat(price), parseInt(stock_quantity, 10) || 50, fallbackImg]
        );

        res.json({
            success: true,
            message: `Product "${product_name}" added successfully!`,
            productId: result.insertId
        });
    } catch (err) {
        console.error('Error inserting product:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/admin/products/:id - Delete product (SQL DELETE)
router.delete('/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id, 10);
        if (!productId) {
            return res.status(400).json({ success: false, error: 'Invalid product ID.' });
        }

        // SQL Concept: DELETE statement with WHERE clause
        await pool.query('DELETE FROM products WHERE product_id = ?', [productId]);

        res.json({ success: true, message: `Product #${productId} deleted successfully.` });
    } catch (err) {
        // If product is linked to order_items, foreign key constraint blocks deletion
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete product: It is linked to existing customer orders (Foreign Key Protection).'
            });
        }
        console.error('Error deleting product:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
