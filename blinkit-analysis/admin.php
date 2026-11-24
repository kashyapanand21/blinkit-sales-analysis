<?php
// ============================================================================
// QuickKart - Admin Management Portal (admin.php)
// Features: Inventory Management, Add/Delete Products, GROUP BY Category Analytics
// Demonstrates SQL Concepts: GROUP BY, COUNT(), AVG(), INNER JOIN, DELETE, INSERT
// ============================================================================

require_once __DIR__ . '/config/db.php';

$msg   = isset($_GET['msg']) ? trim($_GET['msg']) : '';
$error = isset($_GET['error']) ? trim($_GET['error']) : '';

// 1. Fetch Categories for the dropdown form
$categories = $pdo->query("SELECT category_id, category_name FROM categories ORDER BY category_name ASC")->fetchAll();

// 2. SQL Concept: GROUP BY with COUNT() and AVG()
// Demonstrates grouping rows and calculating summary statistics per group
$categoryStats = $pdo->query("SELECT 
                                c.category_name,
                                COUNT(p.product_id) AS total_items,
                                COALESCE(AVG(p.price), 0) AS avg_price
                              FROM categories c
                              LEFT JOIN products p ON c.category_id = p.category_id
                              GROUP BY c.category_id, c.category_name
                              ORDER BY total_items DESC")->fetchAll();

// 3. SQL Concept: SELECT with INNER JOIN and ORDER BY
// Fetches all inventory products paired with their category title
$products = $pdo->query("SELECT 
                            p.product_id, 
                            p.product_name, 
                            p.unit, 
                            p.price, 
                            p.stock_quantity, 
                            p.image_url, 
                            c.category_name
                         FROM products p
                         INNER JOIN categories c ON p.category_id = c.category_id
                         ORDER BY p.product_id DESC")->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuickKart - Admin Inventory Portal</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <!-- Main Navigation Bar -->
    <header class="navbar">
        <div class="nav-container">
            <a href="index.php" class="brand-logo">Quick<span>Kart</span> <small style="font-size:0.85rem; color:#4a5568; margin-left: 8px;">Admin Console</small></a>
            <div class="nav-actions">
                <a href="index.php" class="nav-link">← Live Store</a>
                <a href="orders.php" class="nav-link">📦 Order Reports</a>
            </div>
        </div>
    </header>

    <main class="main-wrapper">

        <!-- Notification Alerts -->
        <?php if (!empty($msg)): ?>
            <div class="alert alert-success">
                ✅ <?php echo htmlspecialchars($msg); ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($error)): ?>
            <div class="alert" style="background:#fff5f5; border:1px solid #feb2b2; color:#c53030;">
                ⚠️ <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <!-- Category Group By Analytics (Academic SQL Highlight) -->
        <section class="admin-card">
            <h2 style="font-size: 1.25rem; font-weight: 800; color: #1a202c; margin-bottom: 6px;">
                📊 Category Analytics (SQL GROUP BY Demonstration)
            </h2>
            <p style="font-size: 0.85rem; color: #718096; margin-bottom: 14px;">
                Executed query: <code>SELECT category_name, COUNT(product_id), AVG(price) FROM ... GROUP BY category_name</code>
            </p>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
                <?php foreach ($categoryStats as $stat): ?>
                    <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
                        <strong style="display: block; font-size: 0.9rem; color: #2d3748;"><?php echo htmlspecialchars($stat['category_name']); ?></strong>
                        <div style="font-size: 1.2rem; font-weight: 800; color: #0c831f; margin-top: 4px;">
                            <?php echo $stat['total_items']; ?> <span style="font-size:0.75rem; font-weight:500; color:#718096;">Products</span>
                        </div>
                        <div style="font-size: 0.8rem; color: #718096; margin-top: 2px;">
                            Avg: ₹<?php echo number_format($stat['avg_price'], 1); ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </section>

        <!-- Product Addition Form (SQL INSERT) -->
        <section class="admin-card">
            <h2 style="font-size: 1.25rem; font-weight: 800; color: #1a202c; margin-bottom: 6px;">
                ➕ Add New Grocery Product (SQL INSERT)
            </h2>
            <p style="font-size: 0.85rem; color: #718096; margin-bottom: 16px;">
                Inserts a new product record into the <code>products</code> table with foreign key linkage.
            </p>

            <form action="admin_actions.php" method="POST" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                <input type="hidden" name="action" value="add_product">

                <div class="form-group">
                    <label for="category_id">Select Category *</label>
                    <select id="category_id" name="category_id" class="form-select" required>
                        <option value="">-- Choose Category --</option>
                        <?php foreach ($categories as $cat): ?>
                            <option value="<?php echo $cat['category_id']; ?>">
                                <?php echo htmlspecialchars($cat['category_name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label for="product_name">Product Name *</label>
                    <input type="text" id="product_name" name="product_name" class="form-input" placeholder="e.g. Fortune Sunlite Refined Oil" required>
                </div>

                <div class="form-group">
                    <label for="unit">Weight / Volume Unit *</label>
                    <input type="text" id="unit" name="unit" class="form-input" placeholder="e.g. 1 L, 500 g, 6 pcs" required>
                </div>

                <div class="form-group">
                    <label for="price">Price (₹) *</label>
                    <input type="number" id="price" name="price" step="0.50" min="1" class="form-input" placeholder="e.g. 145.00" required>
                </div>

                <div class="form-group">
                    <label for="stock_quantity">Stock Inventory Qty *</label>
                    <input type="number" id="stock_quantity" name="stock_quantity" min="1" value="50" class="form-input" required>
                </div>

                <div class="form-group" style="grid-column: 1 / -1;">
                    <label for="image_url">Product Image Web URL (Unsplash or direct image URL)</label>
                    <input type="url" id="image_url" name="image_url" class="form-input" placeholder="https://images.unsplash.com/...">
                </div>

                <div style="grid-column: 1 / -1;">
                    <button type="submit" class="btn-checkout" style="width: auto; padding: 10px 28px;">
                        Save Product to Database
                    </button>
                </div>
            </form>
        </section>

        <!-- Current Products List (SQL SELECT with INNER JOIN & DELETE) -->
        <section class="admin-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="font-size: 1.25rem; font-weight: 800; color: #1a202c;">
                    📦 Inventory Catalog (<?php echo count($products); ?> Products)
                </h2>
                <span style="font-size: 0.85rem; color: #718096;">Live MySQL records</span>
            </div>

            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Unit</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($products as $p): ?>
                            <tr>
                                <td>#<?php echo $p['product_id']; ?></td>
                                <td>
                                    <img src="<?php echo htmlspecialchars($p['image_url']); ?>" alt="" style="width: 44px; height: 44px; object-fit: contain; border-radius: 4px; border: 1px solid #edf2f7; background: #fff;">
                                </td>
                                <td><strong><?php echo htmlspecialchars($p['product_name']); ?></strong></td>
                                <td><span class="category-tag"><?php echo htmlspecialchars($p['category_name']); ?></span></td>
                                <td><?php echo htmlspecialchars($p['unit']); ?></td>
                                <td style="font-weight: 700;">₹<?php echo number_format($p['price'], 2); ?></td>
                                <td>
                                    <span style="font-weight: 700; color: <?php echo $p['stock_quantity'] < 10 ? '#e53e3e' : '#2d3748'; ?>;">
                                        <?php echo $p['stock_quantity']; ?>
                                    </span>
                                </td>
                                <td>
                                    <a 
                                        href="admin_actions.php?action=delete_product&id=<?php echo $p['product_id']; ?>" 
                                        class="btn-danger" 
                                        onclick="return confirm('Are you sure you want to delete \'<?php echo addslashes($p['product_name']); ?>\' from the MySQL database?')"
                                        style="text-decoration: none;"
                                    >
                                        Delete
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </section>

    </main>

    <footer class="footer">
        <p><strong>QuickKart Admin Console</strong> – Academic DBMS Project.</p>
    </footer>

    <script src="js/app.js"></script>
</body>
</html>
