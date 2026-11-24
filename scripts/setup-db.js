// ============================================================================
// One-command database setup:  npm run setup
// Runs database/schema.sql (creates quickkart_db, all 5 tables and seed data).
// Same result as importing schema.sql in MySQL Workbench / phpMyAdmin.
// ============================================================================
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const dbName = process.env.DB_NAME || 'quickkart_db';
  let sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');

  // Respect a custom DB_NAME from .env
  if (dbName !== 'quickkart_db') sql = sql.replace(/quickkart_db/g, dbName);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    multipleStatements: true // schema.sql has many statements
  });

  console.log(`Creating database "${dbName}" and loading seed data...`);
  await conn.query(sql);

  const [counts] = await conn.query(`
    SELECT 'categories' AS table_name, COUNT(*) AS \`rows\` FROM categories
    UNION ALL SELECT 'products',    COUNT(*) FROM products
    UNION ALL SELECT 'customers',   COUNT(*) FROM customers
    UNION ALL SELECT 'orders',      COUNT(*) FROM orders
    UNION ALL SELECT 'order_items', COUNT(*) FROM order_items`);
  console.table(counts);

  await conn.end();
  console.log('Done. Now run:  npm start   and open http://localhost:3000');
}

main().catch(err => {
  console.error('\nSetup failed:', err.message);
  if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('-> Check DB_USER / DB_PASSWORD in your .env file.');
  if (err.code === 'ECONNREFUSED') console.error('-> MySQL is not running. Start it (XAMPP Control Panel or Windows Services -> MySQL80).');
  if (err.code === 'ER_PARSE_ERROR' && /CHECK/i.test(err.message)) console.error('-> Use MySQL 8.0+ (or MariaDB 10.2+).');
  process.exit(1);
});
