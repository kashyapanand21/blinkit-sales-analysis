<?php
// ============================================================================
// QuickKart - Order History & Reports Page (orders.php)
// Features: Displays past orders, customer details, and individual ordered items
// Demonstrates SQL Concepts: INNER JOIN (multi-table), AGGREGATE FUNCTIONS (COUNT, SUM, AVG)
// ============================================================================

require_once __DIR__ . '/config/db.php';

// ----------------------------------------------------------------------------
// SQL Query 1: Aggregate Metrics (COUNT, SUM, AVG)
// Calculates store-wide metrics for academic demonstration
// ----------------------------------------------------------------------------
$metricsQuery = "SELECT 
                    COUNT(order_id) AS total_orders,
                    COALESCE(SUM(total_amount), 0) AS total_sales,
                    COALESCE(AVG(total_amount), 0) AS average_order_value
                 FROM orders";
$metrics = $pdo->query($metricsQuery)->fetch();

// ----------------------------------------------------------------------------
// SQL Query 2: INNER JOIN orders with customers
// Demonstrates foreign key navigation and relational join
// ----------------------------------------------------------------------------
$ordersQuery = "SELECT 
                    o.order_id,
                    o.order_date,
                    o.total_amount,
                    o.order_status,
                    o.payment_method,
                    c.customer_id,
                    c.full_name AS customer_name,
                    c.email,
                    c.phone,
                    c.delivery_address
                FROM orders o
                INNER JOIN customers c ON o.customer_id = c.customer_id
                ORDER BY o.order_id DESC";
$ordersStmt = $pdo->query($ordersQuery);
$allOrders  = $ordersStmt->fetchAll();

// ----------------------------------------------------------------------------
// SQL Query 3: Multi-table JOIN to retrieve line items for each order
// ----------------------------------------------------------------------------
$itemsStmt = $pdo->prepare("SELECT 
                                oi.order_id,
                                oi.quantity,
                                oi.unit_price,
                                oi.subtotal,
                                p.product_name,
                                p.unit,
                                cat.category_name
                            FROM order_items oi
                            INNER JOIN products p ON oi.product_id = p.product_id
                            INNER JOIN categories cat ON p.category_id = cat.category_id
                            WHERE oi.order_id = ?");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuickKart - Orders & DBMS Report</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <header class="navbar">
        <div class="nav-container">
            <a href="index.php" class="brand-logo">Quick<span>Kart</span></a>
            <div class="nav-actions">
                <a href="index.php" class="nav-link">← Store Catalog</a>
                <a href="admin.php" class="nav-link">⚙️ Admin</a>
                <a href="cart.php" class="cart-pill-btn">
                    <span>🛒 My Cart</span>
                    <span id="navbar-cart-count" class="cart-counter">0</span>
                </a>
            </div>
        </div>
    </header>

    <main class="main-wrapper">
        <h1 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 8px;">Order History & Relational Reports</h1>
        <p style="color: #718096; margin-bottom: 24px;">Displaying live order records fetched from MySQL using <code>INNER JOIN</code> and aggregate functions.</p>

        <!-- Aggregate Summary Metrics Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <div class="admin-card" style="margin-bottom: 0; border-left: 4px solid #0c831f;">
                <span style="font-size: 0.8rem; text-transform: uppercase; color: #718096; font-weight: 700;">Total Orders Placed (COUNT)</span>
                <div style="font-size: 1.8rem; font-weight: 800; color: #1a202c; margin-top: 4px;"><?php echo $metrics['total_orders']; ?></div>
            </div>
            <div class="admin-card" style="margin-bottom: 0; border-left: 4px solid #f8cb46;">
                <span style="font-size: 0.8rem; text-transform: uppercase; color: #718096; font-weight: 700;">Total Grocery Revenue (SUM)</span>
                <div style="font-size: 1.8rem; font-weight: 800; color: #0c831f; margin-top: 4px;">₹<?php echo number_format($metrics['total_sales'], 2); ?></div>
            </div>
            <div class="admin-card" style="margin-bottom: 0; border-left: 4px solid #3182ce;">
                <span style="font-size: 0.8rem; text-transform: uppercase; color: #718096; font-weight: 700;">Average Order Value (AVG)</span>
                <div style="font-size: 1.8rem; font-weight: 800; color: #2b6cb0; margin-top: 4px;">₹<?php echo number_format($metrics['average_order_value'], 2); ?></div>
            </div>
        </div>

        <!-- Orders Listing -->
        <?php if (empty($allOrders)): ?>
            <div class="admin-card" style="text-align: center; padding: 40px;">
                <h3>No orders placed yet</h3>
                <p style="color: #718096; margin-top: 6px;">Add some groceries to your cart and test placing an order!</p>
            </div>
        <?php else: ?>
            <?php foreach ($allOrders as $ord): ?>
                <?php
                    // Fetch items for this specific order
                    $itemsStmt->execute([$ord['order_id']]);
                    $orderItems = $itemsStmt->fetchAll();

                    // Status pill styling
                    $statusClass = 'badge-placed';
                    if ($ord['order_status'] === 'Preparing') $statusClass = 'badge-preparing';
                    if ($ord['order_status'] === 'Out for Delivery') $statusClass = 'badge-out';
                    if ($ord['order_status'] === 'Delivered') $statusClass = 'badge-delivered';
                ?>
                <div class="admin-card" style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 14px;">
                        <div>
                            <span style="font-weight: 800; font-size: 1.1rem; color: #0c831f;">Order #<?php echo $ord['order_id']; ?></span>
                            <span style="color: #718096; font-size: 0.85rem; margin-left: 8px;">Date: <?php echo date('d M Y, h:i A', strtotime($ord['order_date'])); ?></span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="badge-status <?php echo $statusClass; ?>"><?php echo htmlspecialchars($ord['order_status']); ?></span>
                            <span style="font-weight: 800; font-size: 1.15rem;">₹<?php echo number_format($ord['total_amount'], 2); ?></span>
                        </div>
                    </div>

                    <!-- Customer Info (from customers table via INNER JOIN) -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 0.85rem; margin-bottom: 14px;">
                        <div>
                            <span style="color: #718096;">Customer Name:</span>
                            <strong style="display: block; color: #2d3748;"><?php echo htmlspecialchars($ord['customer_name']); ?></strong>
                        </div>
                        <div>
                            <span style="color: #718096;">Phone / Contact:</span>
                            <strong style="display: block; color: #2d3748;"><?php echo htmlspecialchars($ord['phone']); ?></strong>
                        </div>
                        <div>
                            <span style="color: #718096;">Payment Mode:</span>
                            <strong style="display: block; color: #2d3748;"><?php echo htmlspecialchars($ord['payment_method']); ?></strong>
                        </div>
                        <div>
                            <span style="color: #718096;">Delivery Address:</span>
                            <span style="display: block; color: #2d3748;"><?php echo htmlspecialchars($ord['delivery_address']); ?></span>
                        </div>
                    </div>

                    <!-- Line Items Table (from order_items, products, categories via MULTI-JOIN) -->
                    <div style="overflow-x: auto;">
                        <table class="data-table" style="margin-top: 0;">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Category</th>
                                    <th>Unit</th>
                                    <th>Unit Price</th>
                                    <th>Quantity</th>
                                    <th>Line Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($orderItems as $it): ?>
                                    <tr>
                                        <td><strong><?php echo htmlspecialchars($it['product_name']); ?></strong></td>
                                        <td><span class="category-tag"><?php echo htmlspecialchars($it['category_name']); ?></span></td>
                                        <td><?php echo htmlspecialchars($it['unit']); ?></td>
                                        <td>₹<?php echo number_format($it['unit_price'], 2); ?></td>
                                        <td><span style="background: #edf2f7; padding: 2px 8px; border-radius: 4px; font-weight: 700;"><?php echo $it['quantity']; ?></span></td>
                                        <td style="font-weight: 700; color: #0c831f;">₹<?php echo number_format($it['subtotal'], 2); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>

    </main>

    <footer class="footer">
        <p><strong>QuickKart</strong> – Database Management Systems Coursework Project.</p>
    </footer>

    <script src="js/app.js"></script>
</body>
</html>
