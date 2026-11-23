// ============================================================
// Records API: basic CRUD on the sales table (Create, Read, Delete).
// This is the "real-life" part: a new sale entered in the browser is
// written to MySQL, and every chart updates from the database.
// ============================================================
const express = require('express');
const { pool } = require('../db');
const router = express.Router();

const PAGE_SIZE = 10;

// READ: paginated list with optional search
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const search = (req.query.search || '').trim();
  const where = search ? 'WHERE item_identifier LIKE ? OR item_type LIKE ? OR outlet_identifier LIKE ?' : '';
  const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

  try {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM blinkit_sales ${where}`, params);
    const [rows] = await pool.query(
      `SELECT id, item_identifier, item_type, item_fat_content, outlet_identifier,
              outlet_type, outlet_location_type, sales, rating
       FROM blinkit_sales ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]
    );
    res.json({ data: rows, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Outlets list: so the "add sale" form can auto-fill outlet details
router.get('/outlets', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT outlet_identifier, outlet_establishment_year, outlet_size,
                      outlet_location_type, outlet_type
      FROM blinkit_sales ORDER BY outlet_identifier`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE: add a new sale. The outlet's size/tier/type are copied from
// existing rows for that outlet, so the user only picks the outlet ID.
router.post('/', async (req, res) => {
  const { item_identifier, item_type, item_fat_content, item_weight, outlet_identifier, sales, rating } = req.body;

  const errors = [];
  if (!item_identifier || !/^[A-Za-z0-9]{3,20}$/.test(item_identifier)) errors.push('Item ID must be 3-20 letters/numbers');
  if (!item_type) errors.push('Item type is required');
  if (!['Low Fat', 'Regular'].includes(item_fat_content)) errors.push('Fat content must be Low Fat or Regular');
  if (!(Number(sales) > 0)) errors.push('Sales must be a positive number');
  if (!(Number(rating) >= 1 && Number(rating) <= 5)) errors.push('Rating must be between 1 and 5');
  if (errors.length) return res.status(400).json({ error: errors.join('. ') });

  try {
    const [[outlet]] = await pool.query(
      `SELECT outlet_establishment_year, outlet_size, outlet_location_type, outlet_type
       FROM blinkit_sales WHERE outlet_identifier = ? LIMIT 1`,
      [outlet_identifier]
    );
    if (!outlet) return res.status(400).json({ error: 'Unknown outlet' });

    const [result] = await pool.query(
      `INSERT INTO blinkit_sales
        (item_identifier, item_type, item_fat_content, item_weight, item_visibility,
         outlet_identifier, outlet_establishment_year, outlet_size, outlet_location_type,
         outlet_type, sales, rating)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item_identifier.toUpperCase(), item_type, item_fat_content,
        item_weight === '' || item_weight == null ? null : Number(item_weight),
        outlet_identifier, outlet.outlet_establishment_year, outlet.outlet_size,
        outlet.outlet_location_type, outlet.outlet_type, Number(sales), Number(rating)
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: remove one record by id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM blinkit_sales WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Record not found' });
    res.json({ deleted: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
