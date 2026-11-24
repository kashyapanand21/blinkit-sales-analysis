// ============================================================================
// QuickKart - Database connection (config/db.js)
// Replaces config/db.php. Uses mysql2 with a connection POOL:
// a few connections stay open and are reused for every request,
// which is faster than reconnecting to MySQL each time.
// ============================================================================
require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'quickkart_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // DECIMAL columns come back as JS numbers, not strings
  dateStrings: false
});

module.exports = pool;
