// ============================================================================
// QuickKart - Entry point (server.js)
//
//   Browser (HTML/CSS/JS)  --HTTP-->  Express (Node.js)  --SQL-->  MySQL
//
// Express renders pages with EJS templates (views/), serves static files
// (public/), and is the ONLY layer that talks to MySQL.
// ============================================================================
require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const pool = require('./config/db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false })); // read HTML form posts
app.use(express.static(path.join(__dirname, 'public')));

// Helpers available inside every EJS template
app.locals.inr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
app.locals.fmtDate = d => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Which nav link to highlight
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/', require('./routes/store'));
app.use('/admin', require('./routes/admin'));
app.use('/analytics', require('./routes/analytics'));

// Health check: proves the MySQL connection is live
app.get('/health', async (req, res) => {
  const [[row]] = await pool.query('SELECT VERSION() AS mysql_version, DATABASE() AS database_name, NOW() AS server_time');
  res.json({ status: 'connected', ...row });
});

// 404
app.use((req, res) => {
  res.status(404).render('error', { title: 'Page not found', message: `No page at ${req.path}` });
});

// Central error handler (Express 5 forwards errors from async routes here)
app.use((err, req, res, next) => {
  console.error(err);
  const dbDown = ['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(err.code);
  res.status(500).render('error', {
    title: dbDown ? 'Database connection failed' : 'Something went wrong',
    message: err.message,
    dbDown
  });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, async () => {
  console.log(`QuickKart running at http://localhost:${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log('Connected to MySQL');
  } catch (err) {
    console.error('Could not connect to MySQL:', err.message);
    console.error('Check .env and run "npm run setup" first.');
  }
});
