// ============================================================
// Entry point: Express serves the frontend (public/) and the
// JSON API (/api/...). The browser never talks to MySQL directly;
// it calls this server, and the server runs the SQL.
//
//   Browser (HTML/CSS/JS)  ->  Express API  ->  MySQL
// ============================================================
require('dotenv').config();
const express = require('express');
const path = require('path');
const { pool } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Chart.js served locally from node_modules, so the demo works without internet
app.use('/vendor/chartjs', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));

app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/records', require('./routes/records'));

// Health check: handy to show the DB connection is live
app.get('/api/health', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT VERSION() AS version, DATABASE() AS db, (SELECT COUNT(*) FROM blinkit_sales) AS rows_in_table');
    res.json({ status: 'connected', ...row });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log('Connected to MySQL');
  } catch (err) {
    console.error('Could not connect to MySQL:', err.message);
    console.error('Check your .env file and that you ran "npm run setup".');
  }
});
