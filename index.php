<?php
// ============================================================================
// QuickKart - Home Page (index.php)
// Features: Dynamic Product Catalog, SQL LIKE Search, Category Filter, ORDER BY Sort
// ============================================================================

require_once __DIR__ . '/config/db.php';

// 1. Capture search, filter, and sort parameters from GET request
$search      = isset($_GET['search']) ? trim($_GET['search']) : '';
$category_id = isset($_GET['category']) ? (int)$_GET['category'] : 0;
$sort        = isset($_GET['sort']) ? trim($_GET['sort']) : 'default';

// 2. Fetch all categories from MySQL for the filter bar
// SQL Concept: SELECT with ORDER BY
$catStmt = $pdo->query("SELECT category_id, category_name, category_icon FROM categories ORDER BY category_name ASC");
$categories = $catStmt->fetchAll();

// 3. Construct dynamic SQL query for products based on user filter/search/sort
// Demonstrates SQL concepts: SELECT, WHERE, LIKE, ORDER BY, INNER JOIN
$sql = "SELECT p.product_id, p.product_name, p.unit, p.price, p.stock_quantity, p.image_url, c.category_name 
        FROM products p
        INNER JOIN categories c ON p.category_id = c.category_id
        WHERE 1=1";

$params = [];

// Apply SQL LIKE for keyword search
if (!empty($search)) {
    $sql .= " AND (p.product_name LIKE :search OR c.category_name LIKE :cat_search)";
    $params[':search']     = '%' . $search . '%';
    $params[':cat_search'] = '%' . $search . '%';
}

// Apply Category Filter using WHERE
if ($category_id > 0) {
    $sql .= " AND p.category_id = :category_id";
    $params[':category_id'] = $category_id;
}

// Apply SQL ORDER BY based on user choice
switch ($sort) {
    case 'price_asc':
        $sql .= " ORDER BY p.price ASC";
        break;
    case 'price_desc':
        $sql .= " ORDER BY p.price DESC";
        break;
    case 'name_asc':
        $sql .= " ORDER BY p.product_name ASC";
        break;
    default:
        $sql .= " ORDER BY p.product_id DESC";
        break;
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$products = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuickKart - 10-Minute Grocery Shopping</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <!-- Top Announcement Strip -->
    <div class="top-delivery-bar">
        ⚡ Superfast 10-minute grocery delivery to your doorstep | Free delivery on orders above ₹199!
    </div>

    <!-- Main Navigation Bar -->
    <header class="navbar">
        <div class="nav-container">
            <a href="index.php" class="brand-logo">
                Quick<span>Kart</span>
            </a>

            <div class="delivery-badge">
                <span style="color:#718096; font-size: 0.72rem; text-transform:uppercase; font-weight:700;">Delivery in 10 Mins</span>
                <strong>College Campus, Block B</strong>
            </div>

            <!-- SQL LIKE Search Bar -->
            <form action="index.php" method="GET" class="search-form">
                <?php if ($category_id > 0): ?>
                    <input type="hidden" name="category" value="<?php echo htmlspecialchars($category_id); ?>">
                <?php endif; ?>
                <span class="search-icon">🔍</span>
                <input 
                    type="text" 
                    name="search" 
                    class="search-input" 
                    placeholder="Search for 'milk', 'bread', 'maggi' or 'chips'..." 
                    value="<?php echo htmlspecialchars($search); ?>"
                >
                <button type="submit" class="search-btn">Search</button>
            </form>

            <div class="nav-actions">
                <a href="orders.php" class="nav-link">📦 My Orders</a>
                <a href="admin.php" class="nav-link" style="color: #4a5568;">⚙️ Admin</a>
                <a href="cart.php" class="cart-pill-btn">
                    <span>🛒 My Cart</span>
                    <span id="navbar-cart-count" class="cart-counter">0</span>
                </a>
            </div>
        </div>
    </header>

    <!-- Main Container -->
    <main class="main-wrapper">

        <!-- Promotional Hero Card -->
        <section class="hero-banner">
            <div class="hero-text">
                <h1>Instant Grocery Delivery</h1>
                <p>Everything you need in minutes. Fresh vegetables, dairy essentials, cold drinks & snacks.</p>
            </div>
            <div class="hero-badge">
                🛒 100% Genuine Products
            </div>
        </section>

        <!-- Category Pills & Sort Filter Bar -->
        <section class="filter-bar">
            <!-- Category Chips Filter -->
            <div class="category-chips">
                <a href="index.php?<?php echo !empty($search) ? 'search='.urlencode($search) : ''; ?>" 
                   class="category-chip <?php echo $category_id === 0 ? 'active' : ''; ?>">
                    🛍️ All Items
                </a>
                <?php foreach ($categories as $cat): ?>
                    <a href="index.php?category=<?php echo $cat['category_id']; ?><?php echo !empty($search) ? '&search='.urlencode($search) : ''; ?>" 
                       class="category-chip <?php echo $category_id === (int)$cat['category_id'] ? 'active' : ''; ?>">
                        <?php echo htmlspecialchars($cat['category_icon'] . ' ' . $cat['category_name']); ?>
                    </a>
                <?php endforeach; ?>
            </div>

            <!-- Price & Name Sort Dropdown -->
            <form method="GET" action="index.php" class="sort-container">
                <?php if (!empty($search)): ?>
                    <input type="hidden" name="search" value="<?php echo htmlspecialchars($search); ?>">
                <?php endif; ?>
                <?php if ($category_id > 0): ?>
                    <input type="hidden" name="category" value="<?php echo htmlspecialchars($category_id); ?>">
                <?php endif; ?>
                <label for="sort-select">Sort by:</label>
                <select id="sort-select" name="sort" class="sort-select" onchange="this.form.submit()">
                    <option value="default" <?php echo $sort === 'default' ? 'selected' : ''; ?>>Featured / Newest</option>
                    <option value="price_asc" <?php echo $sort === 'price_asc' ? 'selected' : ''; ?>>Price: Low to High</option>
                    <option value="price_desc" <?php echo $sort === 'price_desc' ? 'selected' : ''; ?>>Price: High to Low</option>
                    <option value="name_asc" <?php echo $sort === 'name_asc' ? 'selected' : ''; ?>>Name (A - Z)</option>
                </select>
            </form>
        </section>

        <!-- Product Grid Header -->
        <div class="section-header">
            <div>
                <h2 class="section-title">
                    <?php 
                        if (!empty($search)) {
                            echo "Search results for \"" . htmlspecialchars($search) . "\"";
                        } elseif ($category_id > 0) {
                            $currCatName = 'Category';
                            foreach ($categories as $cat) {
                                if ((int)$cat['category_id'] === $category_id) {
                                    $currCatName = $cat['category_name'];
                                    break;
                                }
                            }
                            echo htmlspecialchars($currCatName);
                        } else {
                            echo "Popular Grocery Essentials";
                        }
                    ?>
                </h2>
                <span style="font-size:0.85rem; color:#718096;"><?php echo count($products); ?> items found in database</span>
            </div>
            <?php if (!empty($search) || $category_id > 0): ?>
                <a href="index.php" style="font-size:0.85rem; color:#0c831f; font-weight:600; text-decoration:none;">✕ Clear Filters</a>
            <?php endif; ?>
        </div>

        <!-- Product Cards Grid -->
        <?php if (empty($products)): ?>
            <div style="text-align: center; padding: 60px 20px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e0;">
                <div style="font-size: 3rem; margin-bottom: 12px;">🔍</div>
                <h3 style="margin-bottom: 6px;">No products match your criteria</h3>
                <p style="color: #718096; margin-bottom: 16px;">Try adjusting your search terms or selecting another category.</p>
                <a href="index.php" class="btn-checkout" style="display:inline-block; width:auto; padding: 8px 18px; text-decoration:none;">View All Products</a>
            </div>
        <?php else: ?>
            <div class="product-grid">
                <?php foreach ($products as $p): ?>
                    <div class="product-card">
                        <div>
                            <div class="product-img-wrap">
                                <img src="<?php echo htmlspecialchars($p['image_url']); ?>" alt="<?php echo htmlspecialchars($p['product_name']); ?>" loading="lazy">
                            </div>
                            <span class="category-tag"><?php echo htmlspecialchars($p['category_name']); ?></span>
                            <h3 class="product-name" title="<?php echo htmlspecialchars($p['product_name']); ?>">
                                <?php echo htmlspecialchars($p['product_name']); ?>
                            </h3>
                            <div class="product-unit"><?php echo htmlspecialchars($p['unit']); ?></div>
                        </div>

                        <div class="product-bottom-row">
                            <div class="product-price">₹<?php echo number_format($p['price'], 2); ?></div>
                            <?php if ($p['stock_quantity'] > 0): ?>
                                <button 
                                    type="button" 
                                    id="btn-add-<?php echo $p['product_id']; ?>"
                                    class="btn-add-cart" 
                                    onclick="addToCart(<?php echo $p['product_id']; ?>, '<?php echo addslashes($p['product_name']); ?>', <?php echo $p['price']; ?>, '<?php echo addslashes($p['unit']); ?>', '<?php echo addslashes($p['image_url']); ?>')"
                                >
                                    + ADD
                                </button>
                            <?php else: ?>
                                <span class="out-of-stock-badge">Sold Out</span>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

    </main>

    <!-- Footer -->
    <footer class="footer">
        <p><strong>QuickKart</strong> – Academic Mini Grocery Shopping Project for 2nd Year DBMS / DMGT Coursework.</p>
        <p style="margin-top: 6px;">Demonstrating MySQL Relational Database, Normalization & SQL Queries.</p>
    </footer>

    <script src="js/app.js"></script>
</body>
</html>
