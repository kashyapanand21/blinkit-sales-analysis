// ============================================================================
// QuickKart - Main Express Server (server.js)
// Tech Stack: Node.js, Express.js, MySQL 8.0, HTML/CSS/Vanilla JS
// Designed for: 2nd Year DBMS / DMGT Coursework
// ============================================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files from "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

app.use('/api', productsRoutes);
app.use('/api', ordersRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        service: 'QuickKart Node.js & MySQL API',
        timestamp: new Date().toISOString()
    });
});

// Friendly 404 for unknown API endpoints
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`
============================================================
🚀 QuickKart Node.js & MySQL Server Running!
📡 URL: http://localhost:${PORT}
💾 Database: ${process.env.DB_NAME || 'quickkart_db'}
⚡ Ready for DBMS / DMGT 2nd Year College Demo
============================================================
    `);
});
