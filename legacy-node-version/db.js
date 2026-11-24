// One shared connection pool for the whole app.
// A pool keeps a few connections open and reuses them, which is
// faster than opening a new MySQL connection for every request.
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'blinkit_db',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true // return DECIMAL columns as JS numbers, not strings
});

module.exports = { pool, format: mysql.format };
