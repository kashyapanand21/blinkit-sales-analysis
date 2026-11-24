// ============================================================
// One-time setup: creates the database + table, loads the CSV,
// then runs the cleaning step.
//
//   npm run setup                         -> loads data/sample_blinkit.csv
//   npm run setup -- "data/BlinkIT Grocery Data.csv"  -> loads the real Kaggle file
// ============================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { parse } = require('csv-parse/sync');

const DB_NAME = process.env.DB_NAME || 'blinkit_db';
const csvPath = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'sample_blinkit.csv'));

// The Kaggle file uses headers like "Item Fat Content". We normalise every
// header to snake_case ("item_fat_content") so small spelling differences
// between dataset versions don't break the import.
const norm = h => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// Accept a few alternative header names seen in different copies of the dataset
const ALIASES = {
  rating: ['rating', 'item_rating'],
  sales: ['sales', 'total_sales', 'item_outlet_sales']
};
const get = (row, key) => {
  for (const k of ALIASES[key] || [key]) if (row[k] !== undefined) return row[k];
  return undefined;
};
const num = v => (v === undefined || v === null || String(v).trim() === '' ? null : Number(v));

async function main() {
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  console.log(`Creating database "${DB_NAME}" (if needed)...`);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await conn.query(`USE \`${DB_NAME}\``);
  await conn.query(fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8'));
  await conn.query('TRUNCATE TABLE blinkit_sales'); // re-running setup starts fresh

  console.log(`Reading ${csvPath} ...`);
  const records = parse(fs.readFileSync(csvPath), {
    columns: header => header.map(norm),
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  const rows = records.map(r => [
    r.item_identifier,
    r.item_type,
    r.item_fat_content,
    num(r.item_weight),
    num(r.item_visibility) ?? 0,
    r.outlet_identifier,
    num(r.outlet_establishment_year),
    r.outlet_size || 'Unknown',
    r.outlet_location_type,
    r.outlet_type,
    num(get(r, 'sales')),
    num(get(r, 'rating'))
  ]);

  const bad = rows.findIndex(r => r[0] === undefined || r[10] === null || r[11] === null);
  if (bad !== -1) {
    console.error(`Row ${bad + 2} is missing item id, sales or rating. Found headers:`, Object.keys(records[0]));
    process.exit(1);
  }

  // Insert in batches of 500: one INSERT with many VALUES is much faster
  // than 8,000 separate INSERT statements.
  const sql = `INSERT INTO blinkit_sales
    (item_identifier, item_type, item_fat_content, item_weight, item_visibility,
     outlet_identifier, outlet_establishment_year, outlet_size, outlet_location_type,
     outlet_type, sales, rating) VALUES ?`;
  for (let i = 0; i < rows.length; i += 500) {
    await conn.query(sql, [rows.slice(i, i + 500)]);
  }
  console.log(`Inserted ${rows.length} rows.`);

  console.log('Cleaning fat-content labels...');
  await conn.query(fs.readFileSync(path.join(__dirname, '..', 'sql', 'clean.sql'), 'utf8'));
  const [labels] = await conn.query(
    'SELECT item_fat_content, COUNT(*) AS cnt FROM blinkit_sales GROUP BY item_fat_content'
  );
  console.table(labels);

  await conn.end();
  console.log('Done. Now run:  npm start');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('-> Check DB_USER / DB_PASSWORD in your .env file.');
  if (err.code === 'ECONNREFUSED') console.error('-> MySQL is not running, or DB_HOST/DB_PORT is wrong.');
  process.exit(1);
});
