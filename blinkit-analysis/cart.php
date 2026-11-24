<?php
// ============================================================================
// QuickKart - Cart & Checkout Page (cart.php)
// Features: Dynamic item review, quantity adjustments, total calculations, customer checkout form
// ============================================================================
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuickKart - Your Shopping Cart & Checkout</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <!-- Main Navigation Bar -->
    <header class="navbar">
        <div class="nav-container">
            <a href="index.php" class="brand-logo">
                Quick<span>Kart</span>
            </a>
            <div class="nav-actions">
                <a href="index.php" class="nav-link">← Continue Shopping</a>
                <a href="orders.php" class="nav-link">📦 My Orders</a>
            </div>
        </div>
    </header>

    <main class="main-wrapper">
        <h1 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 20px;">Shopping Cart & Checkout</h1>

        <!-- Empty State Container (Displayed via JS if cart is empty) -->
        <div id="cart-empty-state" style="display: none; text-align: center; padding: 60px 20px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e0;">
            <div style="font-size: 3.5rem; margin-bottom: 12px;">🛒</div>
            <h2 style="margin-bottom: 8px;">Your cart is empty</h2>
            <p style="color: #718096; margin-bottom: 20px;">Looks like you haven't added anything to your cart yet.</p>
            <a href="index.php" class="cart-pill-btn" style="display: inline-block; padding: 10px 24px;">Browse Fresh Groceries</a>
        </div>

        <!-- Active Cart & Checkout Layout -->
        <div id="cart-active-layout" class="cart-layout">
            
            <!-- Left Side: Items Table -->
            <div class="cart-card">
                <h2 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 16px;">Review Cart Items</h2>
                <div style="overflow-x: auto;">
                    <table class="cart-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Qty</th>
                                <th>Subtotal</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="cart-table-body">
                            <!-- Populated dynamically via js/app.js -->
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <a href="index.php" style="color: #0c831f; font-weight: 600; text-decoration: none;">+ Add more items</a>
                    <button type="button" onclick="clearCart(); renderCartPage();" style="background: none; border: none; color: #e53e3e; font-size: 0.85rem; cursor: pointer; text-decoration: underline;">
                        Clear Entire Cart
                    </button>
                </div>
            </div>

            <!-- Right Side: Order Summary & Customer Details Form -->
            <div class="summary-card">
                <h2 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 16px;">Bill & Delivery Details</h2>

                <!-- Bill breakdown -->
                <div class="summary-row">
                    <span>Items Subtotal</span>
                    <strong id="cart-subtotal">₹0.00</strong>
                </div>
                <div class="summary-row">
                    <span>Delivery Charge (10 Mins)</span>
                    <strong id="cart-delivery-fee" style="color: #0c831f;">FREE</strong>
                </div>
                <div style="font-size: 0.78rem; color: #718096; margin-bottom: 14px;">
                    Orders above ₹199 qualify for FREE delivery.
                </div>
                <div class="summary-total">
                    <span>To Pay</span>
                    <span id="cart-grand-total" style="color: #0c831f;">₹0.00</span>
                </div>

                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 20px 0;">

                <!-- Customer Details Form (Submits to place_order.php) -->
                <form action="place_order.php" method="POST" class="checkout-form" onsubmit="return validateCheckoutForm()">
                    <!-- Hidden field containing stringified cart items -->
                    <input type="hidden" name="cart_items_json" id="cart_items_json" value="">

                    <div class="form-group">
                        <label for="full_name">Full Name *</label>
                        <input type="text" id="full_name" name="full_name" class="form-input" placeholder="e.g. Rahul Sharma" required>
                    </div>

                    <div class="form-group">
                        <label for="email">Email Address *</label>
                        <input type="email" id="email" name="email" class="form-input" placeholder="e.g. rahul@example.com" required>
                    </div>

                    <div class="form-group">
                        <label for="phone">Mobile Phone *</label>
                        <input type="tel" id="phone" name="phone" class="form-input" placeholder="e.g. 9876543210" pattern="[0-9]{10}" title="Please enter a 10-digit mobile number" required>
                    </div>

                    <div class="form-group">
                        <label for="delivery_address">Complete Delivery Address *</label>
                        <textarea id="delivery_address" name="delivery_address" rows="3" class="form-textarea" placeholder="Flat No., Hostel Room, Street / Sector, Landmark" required></textarea>
                    </div>

                    <div class="form-group">
                        <label for="payment_method">Payment Mode</label>
                        <select id="payment_method" name="payment_method" class="form-select">
                            <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                            <option value="UPI / Online Simulation">Instant UPI / QR Code</option>
                        </select>
                    </div>

                    <button type="submit" class="btn-checkout">
                        🚀 Place 10-Min Order
                    </button>
                </form>

            </div>

        </div>
    </main>

    <footer class="footer">
        <p><strong>QuickKart</strong> – Database Management Systems Coursework Project.</p>
    </footer>

    <script src="js/app.js"></script>
    <script>
        function validateCheckoutForm() {
            const cart = getCart();
            if (!cart || cart.length === 0) {
                alert("Your cart is empty! Please add products before placing an order.");
                return false;
            }
            return true;
        }
    </script>
</body>
</html>
