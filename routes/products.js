// ============================================================================
// QuickKart - Products & Categories Route (routes/products.js)
// Demonstrates SQL Concepts: SELECT, WHERE, LIKE, ORDER BY, INNER JOIN
// ============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/categories - Fetch all categories for filter chips & forms
router.get('/categories', async (req, res) => {
    try {
        // SQL Concept: SELECT with ORDER BY
        const [categories] = await pool.query(
            'SELECT category_id, category_name, category_icon FROM categories ORDER BY category_name ASC'
        );
        res.json({ success: true, data: categories });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/products - Dynamic product catalog query
// Supports keyword search (LIKE), category filter (WHERE), and price/name sort (ORDER BY)
router.get('/products', async (req, res) => {
    try {
        const search = req.query.search ? req.query.search.trim() : '';
        const categoryId = parseInt(req.query.category, 10) || 0;
        const sort = req.query.sort || 'default';

        // Base SQL query demonstrating INNER JOIN
        let sql = `
            SELECT p.product_id, p.product_name, p.unit, p.price, p.stock_quantity, p.image_url, 
                   c.category_id, c.category_name, c.category_icon
            FROM products p
            INNER JOIN categories c ON p.category_id = c.category_id
            WHERE 1=1
        `;
        const params = [];

        // SQL LIKE Search across product and category names
        if (search) {
            sql += ` AND (p.product_name LIKE ? OR c.category_name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // SQL WHERE Category Filter
        if (categoryId > 0) {
            sql += ` AND p.category_id = ?`;
            params.push(categoryId);
        }

        // SQL ORDER BY
        switch (sort) {
            case 'price_asc':
                sql += ` ORDER BY p.price ASC`;
                break;
            case 'price_desc':
                sql += ` ORDER BY p.price DESC`;
                break;
            case 'name_asc':
                sql += ` ORDER BY p.product_name ASC`;
                break;
            default:
                sql += ` ORDER BY p.product_id DESC`;
                break;
        }

        // Execute prepared statement
        const [products] = await pool.query(sql, params);
        res.json({ success: true, count: products.length, data: products });
    } catch (err) {
        console.error('Error querying products:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
