// ============================================================================
// QuickKart - Admin routes (routes/admin.js)
// Replaces admin.php and admin_actions.php
//
//   GET  /admin                          inventory + GROUP BY category stats
//   POST /admin/products                 INSERT a product
//   POST /admin/products/:id/stock       UPDATE stock (restock)
//   POST /admin/products/:id/delete      DELETE a product (FK may block it)
//   POST /admin/orders/:id/status        UPDATE an order's status
// ============================================================================
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=60';
const STATUSES = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];

const back = (res, type, text) => res.redirect(`/admin?${type}=${encodeURIComponent(text)}`);

// ----------------------------------------------------------------------------
// GET /admin
// SQL: LEFT JOIN + GROUP BY + COUNT/AVG/SUM, INNER JOIN + ORDER BY
// ----------------------------------------------------------------------------
router.get('/', async (req, res) => {
  const [categories] = await pool.query(
    'SELECT category_id, category_name FROM categories ORDER BY category_name ASC'
  );

  // LEFT JOIN keeps categories that have zero products (COUNT = 0)
  const [categoryStats] = await pool.query(
    `SELECT c.category_name,
            c.category_icon,
            COUNT(p.product_id)                AS total_items,
            COALESCE(ROUND(AVG(p.price), 2), 0) AS avg_price,
            COALESCE(SUM(p.stock_quantity), 0)  AS total_stock
     FROM categories c
     LEFT JOIN products p ON c.category_id = p.category_id
     GROUP BY c.category_id, c.category_name, c.category_icon
     ORDER BY total_items DESC, c.category_name`
  );

  const [products] = await pool.query(
    `SELECT p.product_id, p.product_name, p.unit, p.price, p.stock_quantity, p.image_url,
            c.category_name
     FROM products p
     INNER JOIN categories c ON p.category_id = c.category_id
     ORDER BY p.product_id DESC`
  );

  res.render('admin', {
    title: 'Admin Inventory - QuickKart',
    categories,
    categoryStats,
    products,
    msg: req.query.msg || '',
    error: req.query.error || ''
  });
});

// ----------------------------------------------------------------------------
// POST /admin/products  -  INSERT with a prepared statement
// ----------------------------------------------------------------------------
router.post('/products', async (req, res) => {
  const categoryId = parseInt(req.body.category_id, 10) || 0;
  const name = (req.body.product_name || '').trim();
  const unit = (req.body.unit || '').trim();
  const price = Number(req.body.price);
  const stock = parseInt(req.body.stock_quantity, 10);
  let imageUrl = (req.body.image_url || '').trim();

  if (!imageUrl) imageUrl = FALLBACK_IMAGE;
  if (!/^https?:\/\//i.test(imageUrl)) return back(res, 'error', 'Image URL must start with http:// or https://');
  if (categoryId <= 0 || !name || !unit || !(price > 0) || !(stock >= 0)) {
    return back(res, 'error', 'All fields marked * are required, price must be > 0 and stock must be 0 or more.');
  }

  try {
    await pool.query(
      `INSERT INTO products (category_id, product_name, unit, price, stock_quantity, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [categoryId, name, unit, price, stock, imageUrl]
    );
    back(res, 'msg', `Product "${name}" added to MySQL.`);
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') return back(res, 'error', 'That category does not exist.');
    throw err;
  }
});

// ----------------------------------------------------------------------------
// POST /admin/products/:id/stock  -  UPDATE (restock)
// ----------------------------------------------------------------------------
router.post('/products/:id/stock', async (req, res) => {
  const add = parseInt(req.body.add_quantity, 10);
  if (!(add > 0 && add <= 1000)) return back(res, 'error', 'Restock quantity must be between 1 and 1000.');

  const [result] = await pool.query(
    'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
    [add, req.params.id]
  );
  if (!result.affectedRows) return back(res, 'error', 'Product not found.');
  back(res, 'msg', `Added ${add} units to product #${req.params.id}.`);
});

// ----------------------------------------------------------------------------
// POST /admin/products/:id/delete  -  DELETE
// order_items.product_id is ON DELETE RESTRICT, so MySQL refuses to delete a
// product that appears in any past order. We catch that and explain it.
// ----------------------------------------------------------------------------
router.post('/products/:id/delete', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM products WHERE product_id = ?', [req.params.id]);
    if (!result.affectedRows) return back(res, 'error', 'Product not found.');
    back(res, 'msg', `Product #${req.params.id} deleted.`);
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return back(res, 'error',
        `Cannot delete product #${req.params.id}: it appears in existing orders (FOREIGN KEY ... ON DELETE RESTRICT).`);
    }
    throw err;
  }
});

// ----------------------------------------------------------------------------
// POST /admin/orders/:id/status  -  UPDATE order status (used on /orders)
// ----------------------------------------------------------------------------
router.post('/orders/:id/status', async (req, res) => {
  const status = req.body.order_status;
  if (!STATUSES.includes(status)) return res.redirect('/orders');
  await pool.query('UPDATE orders SET order_status = ? WHERE order_id = ?', [status, req.params.id]);
  res.redirect(`/orders?msg=${encodeURIComponent(`Order #${req.params.id} marked as ${status}.`)}#order-${req.params.id}`);
});

module.exports = router;
