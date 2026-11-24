<?php
// ============================================================================
// QuickKart - Admin Actions Processor (admin_actions.php)
// Features: Handles Add Product (INSERT) and Delete Product (DELETE)
// Demonstrates SQL Concepts: INSERT, DELETE, Prepared Statements
// ============================================================================

require_once __DIR__ . '/config/db.php';

$action = isset($_POST['action']) ? $_POST['action'] : (isset($_GET['action']) ? $_GET['action'] : '');

// ----------------------------------------------------------------------------
// Action 1: Add New Product (SQL INSERT)
// ----------------------------------------------------------------------------
if ($action === 'add_product' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $category_id    = (int)($_POST['category_id'] ?? 0);
    $product_name   = trim($_POST['product_name'] ?? '');
    $unit           = trim($_POST['unit'] ?? '');
    $price          = (float)($_POST['price'] ?? 0);
    $stock_quantity = (int)($_POST['stock_quantity'] ?? 0);
    $image_url      = trim($_POST['image_url'] ?? '');

    // Default fallback image if none provided
    if (empty($image_url)) {
        $image_url = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=60';
    }

    if ($category_id <= 0 || empty($product_name) || empty($unit) || $price <= 0) {
        header("Location: admin.php?error=" . urlencode("All product fields marked * are required and price must be > 0."));
        exit;
    }

    try {
        // SQL Concept: INSERT with Prepared Statements
        $stmt = $pdo->prepare("INSERT INTO products (category_id, product_name, unit, price, stock_quantity, image_url) 
                               VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$category_id, $product_name, $unit, $price, $stock_quantity, $image_url]);

        header("Location: admin.php?msg=" . urlencode("Product \"{$product_name}\" added successfully to MySQL!"));
        exit;
    } catch (PDOException $e) {
        header("Location: admin.php?error=" . urlencode("Database error: " . $e->getMessage()));
        exit;
    }
}

// ----------------------------------------------------------------------------
// Action 2: Delete Product (SQL DELETE)
// ----------------------------------------------------------------------------
if ($action === 'delete_product') {
    $product_id = (int)($_GET['id'] ?? 0);

    if ($product_id <= 0) {
        header("Location: admin.php?error=" . urlencode("Invalid product ID."));
        exit;
    }

    try {
        // SQL Concept: DELETE statement with WHERE clause
        $stmt = $pdo->prepare("DELETE FROM products WHERE product_id = ?");
        $stmt->execute([$product_id]);

        header("Location: admin.php?msg=" . urlencode("Product ID #{$product_id} deleted successfully."));
        exit;
    } catch (PDOException $e) {
        // If product is referenced by existing order_items, foreign key constraint prevents deletion
        header("Location: admin.php?error=" . urlencode("Cannot delete product: It is linked to existing customer orders (Foreign Key Protection)."));
        exit;
    }
}

// Fallback redirect
header("Location: admin.php");
exit;
