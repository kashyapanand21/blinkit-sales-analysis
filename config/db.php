<?php
// ============================================================================
// QuickKart - Database Connection Configuration (config/db.php)
// Uses PHP Data Objects (PDO) for secure, prepared SQL query execution
// ============================================================================

$host     = '127.0.0.1';
$dbname   = 'quickkart_db';
$username = 'root';
$password = ''; // Default empty password for XAMPP MySQL
$charset  = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on SQL errors
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch associative arrays
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Use true prepared statements for SQL injection prevention
];

try {
    $pdo = new PDO($dsn, $username, $password, $options);
} catch (PDOException $e) {
    // Beginner-friendly error display for college lab setup
    die("<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 2px solid #e53e3e; border-radius: 8px; background: #fff5f5; color: #9b2c2c;'>
        <h2 style='margin-top:0;'>⚠️ Database Connection Failed</h2>
        <p><strong>Error Details:</strong> " . htmlspecialchars($e->getMessage()) . "</p>
        <hr style='border:0; border-top:1px solid #feb2b2; margin:15px 0;'>
        <p><strong>Steps to resolve in XAMPP:</strong></p>
        <ol>
            <li>Open the <strong>XAMPP Control Panel</strong> and ensure <strong>Apache</strong> and <strong>MySQL</strong> are started (green).</li>
            <li>Open <a href='http://localhost/phpmyadmin' target='_blank'>http://localhost/phpmyadmin</a> in your browser.</li>
            <li>Click <strong>Import</strong> and select <code>QuickKart/database/schema.sql</code> to create the <code>quickkart_db</code> database.</li>
        </ol>
    </div>");
}
?>
