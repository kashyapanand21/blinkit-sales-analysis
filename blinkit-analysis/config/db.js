// ============================================================================
// QuickKart - Database Connection Pool (config/db.js)
// Uses mysql2/promise for secure, prepared SQL execution and transactions
// ============================================================================

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quickkart_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection on startup
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL Database:', process.env.DB_NAME || 'quickkart_db');
        connection.release();
    } catch (err) {
        console.error('❌ Database Connection Error:', err.message);
        console.error('👉 Make sure MySQL is running on port 3306 and check your DB_PASSWORD in .env');
    }
})();

module.exports = pool;
