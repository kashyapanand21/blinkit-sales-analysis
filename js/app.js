// ============================================================================
// QuickKart - Client-side Cart & Interaction Engine
// Uses localStorage to manage shopping cart state seamlessly
// ============================================================================

const CART_STORAGE_KEY = 'quickkart_cart_items';

// Retrieve cart items from browser localStorage
function getCart() {
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to read cart:", e);
        return [];
    }
}

// Save cart items to browser localStorage and update UI badge
function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartCountBadge();
}

// Update the navbar cart counter badge
function updateCartCountBadge() {
    const badge = document.getElementById('navbar-cart-count');
    if (!badge) return;
    const cart = getCart();
    const totalQty = cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
    badge.textContent = totalQty;
}

// Add product to cart (called from product cards)
function addToCart(productId, name, price, unit, image) {
    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === productId);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: name,
            price: parseFloat(price),
            unit: unit,
            image: image,
            quantity: 1
        });
    }

    saveCart(cart);

    // Visual feedback on button
    const btn = document.getElementById(`btn-add-${productId}`);
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ Added';
        btn.style.backgroundColor = '#0c831f';
        btn.style.color = '#ffffff';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '';
            btn.style.color = '';
        }, 900);
    }
}

// Change quantity (+1 or -1) on the cart page
function changeQuantity(productId, delta) {
    let cart = getCart();
    const index = cart.findIndex(item => item.id === productId);
    if (index > -1) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart(cart);
        renderCartPage();
    }
}

// Remove single product completely from cart
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    renderCartPage();
}

// Clear cart completely after successful checkout
function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
    updateCartCountBadge();
}

// Render dynamic cart contents on cart.php
function renderCartPage() {
    const tableBody = document.getElementById('cart-table-body');
    const emptyNotice = document.getElementById('cart-empty-state');
    const layoutWrapper = document.getElementById('cart-active-layout');
    const subtotalDisplay = document.getElementById('cart-subtotal');
    const grandTotalDisplay = document.getElementById('cart-grand-total');
    const hiddenCartInput = document.getElementById('cart_items_json');

    if (!tableBody) return; // Not on cart.php

    const cart = getCart();

    if (cart.length === 0) {
        if (layoutWrapper) layoutWrapper.style.display = 'none';
        if (emptyNotice) emptyNotice.style.display = 'block';
        return;
    }

    if (layoutWrapper) layoutWrapper.style.display = 'grid';
    if (emptyNotice) emptyNotice.style.display = 'none';

    let html = '';
    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        html += `
            <tr>
                <td style="display: flex; align-items: center; gap: 12px;">
                    <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px; background: #fff; border: 1px solid #edf2f7;">
                    <div>
                        <div style="font-weight: 700; font-size: 0.95rem;">${item.name}</div>
                        <div style="font-size: 0.8rem; color: #718096;">${item.unit}</div>
                    </div>
                </td>
                <td style="font-weight: 600;">₹${item.price.toFixed(2)}</td>
                <td>
                    <div class="qty-control">
                        <button type="button" class="qty-btn" onclick="changeQuantity(${item.id}, -1)">−</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button type="button" class="qty-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
                    </div>
                </td>
                <td style="font-weight: 700; color: #0c831f;">₹${itemTotal.toFixed(2)}</td>
                <td>
                    <button type="button" class="btn-remove" onclick="removeFromCart(${item.id})">Remove</button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;

    const deliveryFee = subtotal > 199 ? 0 : 25;
    const grandTotal = subtotal + deliveryFee;

    if (subtotalDisplay) subtotalDisplay.textContent = `₹${subtotal.toFixed(2)}`;
    
    const deliveryFeeEl = document.getElementById('cart-delivery-fee');
    if (deliveryFeeEl) {
        deliveryFeeEl.textContent = deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`;
        deliveryFeeEl.style.color = deliveryFee === 0 ? '#0c831f' : '#1a202c';
    }

    if (grandTotalDisplay) grandTotalDisplay.textContent = `₹${grandTotal.toFixed(2)}`;

    // Pass cart data into hidden input field for PHP order processing
    if (hiddenCartInput) {
        hiddenCartInput.value = JSON.stringify(cart);
    }
}

// Auto-run on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCartCountBadge();
    renderCartPage();
});
