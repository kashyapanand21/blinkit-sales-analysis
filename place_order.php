<?php
// ============================================================================
// QuickKart - Place Order Processor (place_order.php)
// Features: ACID Transaction, Customer UPSERT/Select, Order & Order_Items Inserts, Stock Update
// Demonstrates SQL Concepts: Transactions, INSERT, SELECT, UPDATE, LAST_INSERT_ID()
// ============================================================================

require_once __DIR__ . '/config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: index.php");
    exit;
}

$cart_json        = isset($_POST['cart_items_json']) ? trim($_POST['cart_items_json']) : '';
$full_name        = isset($_POST['full_name']) ? trim($_POST['full_name']) : '';
$email            = isset($_POST['email']) ? trim($_POST['email']) : '';
$phone            = isset($_POST['phone']) ? trim($_POST['phone']) : '';
$delivery_address = isset($_POST['delivery_address']) ? trim($_POST['delivery_address']) : '';
$payment_method   = isset($_POST['payment_method']) ? trim($_POST['payment_method']) : 'Cash on Delivery (COD)';

$cart = json_decode($cart_json, true);

if (empty($cart) || empty($full_name) || empty($email) || empty($phone) || empty($delivery_address)) {
    die("Error: Invalid form submission. Please go back to the cart and fill all required details.");
}

try {
    // ------------------------------------------------------------------------
    // Step 1: Start Database Transaction (ACID Properties)
    // Ensures all operations succeed together, or roll back if any step fails
    // ------------------------------------------------------------------------
    $pdo->beginTransaction();

    // ------------------------------------------------------------------------
    // Step 2: Check if customer already exists, or insert new customer record
    // SQL Concept: SELECT with WHERE, INSERT
    // ------------------------------------------------------------------------
    $custStmt = $pdo->prepare("SELECT customer_id FROM customers WHERE email = ? LIMIT 1");
    $custStmt->execute([$email]);
    $existingCustomer = $custStmt->fetch();

    if ($existingCustomer) {
        $customerId = $existingCustomer['customer_id'];
        // Update contact & delivery address if changed
        $updateCust = $pdo->prepare("UPDATE customers SET full_name = ?, phone = ?, delivery_address = ? WHERE customer_id = ?");
        $updateCust->execute([$full_name, $phone, $delivery_address, $customerId]);
    } else {
        $insertCust = $pdo->prepare("INSERT INTO customers (full_name, email, phone, delivery_address) VALUES (?, ?, ?, ?)");
        $insertCust->execute([$full_name, $email, $phone, $delivery_address]);
        $customerId = $pdo->lastInsertId();
    }

    // ------------------------------------------------------------------------
    // Step 3: Validate Cart Items & Calculate Total against live database prices
    // Prevents price tampering on the client-side
    // ------------------------------------------------------------------------
    $calculatedSubtotal = 0.00;
    $orderItemsData = [];

    $productQuery = $pdo->prepare("SELECT product_id, product_name, price, stock_quantity FROM products WHERE product_id = ?");

    foreach ($cart as $item) {
        $pid = (int)$item['id'];
        $qty = (int)$item['quantity'];

        if ($qty <= 0) continue;

        $productQuery->execute([$pid]);
        $prod = $productQuery->fetch();

        if ($prod) {
            $unitPrice = (float)$prod['price'];
            $lineSubtotal = $unitPrice * $qty;
            $calculatedSubtotal += $lineSubtotal;

            $orderItemsData[] = [
                'product_id' => $pid,
                'quantity'   => $qty,
                'unit_price' => $unitPrice,
                'subtotal'   => $lineSubtotal
            ];
        }
    }

    if (empty($orderItemsData)) {
        throw new Exception("No valid products were found in your order.");
    }

    // Delivery fee calculation
    $deliveryFee = $calculatedSubtotal > 199 ? 0.00 : 25.00;
    $grandTotal = $calculatedSubtotal + $deliveryFee;

    // ------------------------------------------------------------------------
    // Step 4: INSERT into orders table
    // ------------------------------------------------------------------------
    $orderStmt = $pdo->prepare("INSERT INTO orders (customer_id, total_amount, order_status, payment_method) VALUES (?, ?, 'Placed', ?)");
    $orderStmt->execute([$customerId, $grandTotal, $payment_method]);
    $orderId = $pdo->lastInsertId();

    // ------------------------------------------------------------------------
    // Step 5: INSERT into order_items & UPDATE stock_quantity in products table
    // ------------------------------------------------------------------------
    $itemStmt  = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)");
    $stockStmt = $pdo->prepare("UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE product_id = ?");

    foreach ($orderItemsData as $orderItem) {
        // Insert line item
        $itemStmt->execute([
            $orderId,
            $orderItem['product_id'],
            $orderItem['quantity'],
            $orderItem['unit_price'],
            $orderItem['subtotal']
        ]);

        // Decrement product inventory
        $stockStmt->execute([
            $orderItem['quantity'],
            $orderItem['product_id']
        ]);
    }

    // ------------------------------------------------------------------------
    // Step 6: Commit Transaction (Permanently save changes)
    // ------------------------------------------------------------------------
    $pdo->commit();

} catch (Exception $e) {
    // If any query fails, rollback all changes
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    die("<div style='font-family: Arial; padding: 20px; color: red;'>
        <h2>Order Processing Failed</h2>
        <p>" . htmlspecialchars($e->getMessage()) . "</p>
        <p><a href='cart.php'>← Return to Cart</a></p>
    </div>");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmed! - QuickKart</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <header class="navbar">
        <div class="nav-container">
            <a href="index.php" class="brand-logo">Quick<span>Kart</span></a>
            <div class="nav-actions">
                <a href="index.php" class="nav-link">Shop More</a>
                <a href="orders.php" class="nav-link">All Orders</a>
            </div>
        </div>
    </header>

    <main class="main-wrapper" style="max-width: 650px;">
        <div class="cart-card" style="text-align: center; padding: 40px 24px; margin-top: 30px;">
            <div style="font-size: 3.5rem; margin-bottom: 10px;">🎉</div>
            <h1 style="color: #0c831f; font-size: 1.8rem; margin-bottom: 8px;">Order Placed Successfully!</h1>
            <p style="color: #4a5568; font-size: 1rem; margin-bottom: 24px;">
                Thank you, <strong><?php echo htmlspecialchars($full_name); ?></strong>! Your grocery order <strong>#<?php echo $orderId; ?></strong> has been received and will arrive in 10 minutes.
            </p>

            <div style="background: #f7fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; text-align: left; margin-bottom: 24px; font-size: 0.9rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                    <span style="color:#718096;">Order ID:</span>
                    <strong>#<?php echo $orderId; ?></strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                    <span style="color:#718096;">Total Billed Amount:</span>
                    <strong style="color: #0c831f;">₹<?php echo number_format($grandTotal, 2); ?></strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                    <span style="color:#718096;">Payment Method:</span>
                    <strong><?php echo htmlspecialchars($payment_method); ?></strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="color:#718096;">Delivering to:</span>
                    <span style="max-width: 65%; text-align: right;"><?php echo htmlspecialchars($delivery_address); ?></span>
                </div>
            </div>

            <div style="display: flex; gap: 12px; justify-content: center;">
                <a href="orders.php" class="cart-pill-btn" style="background: #2b6cb0;">View Orders History</a>
                <a href="index.php" class="cart-pill-btn">Continue Shopping</a>
            </div>
        </div>
    </main>

    <script src="js/app.js"></script>
    <script>
        // Clear cart in browser storage now that order is saved in MySQL
        clearCart();
    </script>
</body>
</html>
