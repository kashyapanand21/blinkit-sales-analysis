// ============================================================================
// QuickKart - Store routes (routes/store.js)
// Replaces index.php, cart.php, place_order.php and orders.php
//
//   GET  /                     product catalog: search (LIKE), filter (WHERE), sort (ORDER BY)
//   GET  /cart                 cart + checkout form (cart lives in browser localStorage)
//   POST /place-order          ACID transaction: customer + order + items + stock update
//   GET  /order/:id/success    confirmation page
//   GET  /orders               order history: INNER JOINs + COUNT/SUM/AVG
// ============================================================================
const express = require('express');
const pool = require('../config/db');
const router = express.Router();

const DELIVERY_FEE = 25;
const FREE_DELIVERY_ABOVE = 199;
const PAYMENT_METHODS = ['Cash on Delivery (COD)', 'UPI'];

// ORDER BY can't use ? placeholders, so only these fixed strings are allowed
const SORTS = {
  default: 'p.product_id DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  name_asc: 'p.product_name ASC'
};

// ----------------------------------------------------------------------------
// GET /  -  Home page / product catalog
// SQL: SELECT, INNER JOIN, WHERE, LIKE, ORDER BY
// ----------------------------------------------------------------------------
router.get('/', async (req, res) => {
  const search = (req.query.search || '').trim();
  const categoryId = parseInt(req.query.category, 10) || 0;
  const sort = SORTS[req.query.sort] ? req.query.sort : 'default';

  const [categories] = await pool.query(
    'SELECT category_id, category_name, category_icon FROM categories ORDER BY category_name ASC'
  );

  // Build the query step by step. User values only ever go in as ? params.
  let sql = `SELECT p.product_id, p.product_name, p.unit, p.price, p.stock_quantity, p.image_url,
                    c.category_name
             FROM products p
             INNER JOIN categories c ON p.category_id = c.category_id
             WHERE 1 = 1`;
  const params = [];

  if (search) {
    sql += ' AND (p.product_name LIKE ? OR c.category_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (categoryId > 0) {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  sql += ` ORDER BY ${SORTS[sort]}`;

  const [products] = await pool.query(sql, params);

  const currentCategory = categories.find(c => c.category_id === categoryId);
  res.render('index', {
    title: 'QuickKart - 10-Minute Grocery Delivery',
    products,
    categories,
    search,
    categoryId,
    sort,
    heading: search
      ? `Search results for "${search}"`
      : currentCategory ? currentCategory.category_name : 'Popular Grocery Essentials'
  });
});

// ----------------------------------------------------------------------------
// GET /cart  -  cart items are rendered by public/js/app.js from localStorage
// ----------------------------------------------------------------------------
router.get('/cart', (req, res) => {
  res.render('cart', {
    title: 'Your Cart & Checkout - QuickKart',
    paymentMethods: PAYMENT_METHODS,
    deliveryFee: DELIVERY_FEE,
    freeAbove: FREE_DELIVERY_ABOVE,
    error: req.query.error || ''
  });
});

// ----------------------------------------------------------------------------
// POST /place-order  -  the most important DBMS demo in the project.
//
// All steps run inside ONE transaction on ONE connection:
//   1. find or create the customer        (SELECT / INSERT / UPDATE)
//   2. lock the products being bought     (SELECT ... FOR UPDATE)
//   3. check stock, use DB prices         (never trust prices sent by the browser)
//   4. insert the order                   (INSERT, get insertId)
//   5. insert order_items + reduce stock  (INSERT, UPDATE)
//   6. COMMIT - or ROLLBACK if anything fails, so the DB is never half-updated
// ----------------------------------------------------------------------------
router.post('/place-order', async (req, res) => {
  const fullName = (req.body.full_name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const phone = (req.body.phone || '').trim();
  const address = (req.body.delivery_address || '').trim();
  const payment = PAYMENT_METHODS.includes(req.body.payment_method) ? req.body.payment_method : PAYMENT_METHODS[0];

  const backToCart = msg => res.redirect('/cart?error=' + encodeURIComponent(msg));

  // --- Validate input before touching the database ---
  let cart;
  try {
    cart = JSON.parse(req.body.cart_items_json || '[]');
  } catch {
    return backToCart('Your cart data was invalid. Please try again.');
  }
  // Merge duplicates and keep only sane rows: { productId -> quantity }
  const wanted = new Map();
  for (const item of Array.isArray(cart) ? cart : []) {
    const id = parseInt(item.id, 10);
    const qty = parseInt(item.quantity, 10);
    if (id > 0 && qty > 0 && qty <= 50) wanted.set(id, (wanted.get(id) || 0) + qty);
  }
  if (!wanted.size) return backToCart('Your cart is empty.');
  if (!fullName || !address) return backToCart('Please fill in your name and delivery address.');
  if (!/^\S+@\S+\.\S+$/.test(email)) return backToCart('Please enter a valid email address.');
  if (!/^[0-9]{10}$/.test(phone)) return backToCart('Please enter a 10-digit mobile number.');

  const conn = await pool.getConnection();
  try {
    // Step 1: START TRANSACTION
    await conn.beginTransaction();

    // Step 2: find or create customer
    const [[existing]] = await conn.query('SELECT customer_id FROM customers WHERE email = ? LIMIT 1', [email]);
    let customerId;
    if (existing) {
      customerId = existing.customer_id;
      await conn.query(
        'UPDATE customers SET full_name = ?, phone = ?, delivery_address = ? WHERE customer_id = ?',
        [fullName, phone, address, customerId]
      );
    } else {
      const [ins] = await conn.query(
        'INSERT INTO customers (full_name, email, phone, delivery_address) VALUES (?, ?, ?, ?)',
        [fullName, email, phone, address]
      );
      customerId = ins.insertId;
    }

    // Step 3: lock the product rows so two people can't buy the last item at once
    const ids = [...wanted.keys()];
    const [products] = await conn.query(
      'SELECT product_id, product_name, price, stock_quantity FROM products WHERE product_id IN (?) FOR UPDATE',
      [ids]
    );
    if (products.length !== ids.length) throw new UserError('Some items in your cart no longer exist. Please refresh your cart.');

    let subtotal = 0;
    const lines = products.map(p => {
      const qty = wanted.get(p.product_id);
      if (p.stock_quantity === 0) {
        throw new UserError(`"${p.product_name}" just sold out. Please remove it from your cart.`);
      }
      if (qty > p.stock_quantity) {
        throw new UserError(`Only ${p.stock_quantity} left of "${p.product_name}". Please reduce the quantity.`);
      }
      const lineTotal = Math.round(p.price * qty * 100) / 100;
      subtotal += lineTotal;
      return [p.product_id, qty, p.price, lineTotal];
    });

    const deliveryFee = subtotal > FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
    const grandTotal = Math.round((subtotal + deliveryFee) * 100) / 100;

    // Step 4: INSERT the order
    const [orderResult] = await conn.query(
      "INSERT INTO orders (customer_id, total_amount, order_status, payment_method) VALUES (?, ?, 'Placed', ?)",
      [customerId, grandTotal, payment]
    );
    const orderId = orderResult.insertId;

    // Step 5: INSERT all items in one statement, then reduce stock
    await conn.query(
      'INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES ?',
      [lines.map(line => [orderId, ...line])]
    );
    for (const [productId, qty] of lines) {
      await conn.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?', [qty, productId]);
    }

    // Step 6: COMMIT - everything is saved together
    await conn.commit();
    res.redirect(`/order/${orderId}/success`);
  } catch (err) {
    await conn.rollback(); // undo every step above
    if (err instanceof UserError) return backToCart(err.message);
    throw err;
  } finally {
    conn.release(); // give the connection back to the pool
  }
});

class UserError extends Error {}

// ----------------------------------------------------------------------------
// GET /order/:id/success  -  confirmation (INNER JOIN orders + customers)
// ----------------------------------------------------------------------------
router.get('/order/:id/success', async (req, res) => {
  const [[order]] = await pool.query(
    `SELECT o.order_id, o.total_amount, o.payment_method, c.full_name, c.delivery_address
     FROM orders o
     INNER JOIN customers c ON o.customer_id = c.customer_id
     WHERE o.order_id = ?`,
    [req.params.id]
  );
  if (!order) return res.status(404).render('error', { title: 'Order not found', message: 'That order does not exist.' });
  res.render('order-success', { title: 'Order Confirmed! - QuickKart', order });
});

// ----------------------------------------------------------------------------
// GET /orders  -  order history + aggregate metrics
// SQL: COUNT, SUM, AVG, INNER JOIN (2 and 4 tables)
// ----------------------------------------------------------------------------
router.get('/orders', async (req, res) => {
  const [[metrics]] = await pool.query(
    `SELECT COUNT(order_id)               AS total_orders,
            COALESCE(SUM(total_amount), 0) AS total_sales,
            COALESCE(AVG(total_amount), 0) AS average_order_value
     FROM orders`
  );

  const [orders] = await pool.query(
    `SELECT o.order_id, o.order_date, o.total_amount, o.order_status, o.payment_method,
            c.full_name AS customer_name, c.email, c.phone, c.delivery_address
     FROM orders o
     INNER JOIN customers c ON o.customer_id = c.customer_id
     ORDER BY o.order_id DESC`
  );

  // One query for ALL line items (instead of one query per order), grouped in JS
  const [items] = await pool.query(
    `SELECT oi.order_id, oi.quantity, oi.unit_price, oi.subtotal,
            p.product_name, p.unit, cat.category_name
     FROM order_items oi
     INNER JOIN products p     ON oi.product_id = p.product_id
     INNER JOIN categories cat ON p.category_id = cat.category_id
     ORDER BY oi.order_item_id`
  );
  const itemsByOrder = {};
  for (const it of items) (itemsByOrder[it.order_id] ||= []).push(it);

  res.render('orders', {
    title: 'Orders & Reports - QuickKart',
    metrics,
    orders,
    itemsByOrder,
    statuses: ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'],
    msg: req.query.msg || ''
  });
});

module.exports = router;
