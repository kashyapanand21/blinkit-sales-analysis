// ============================================================================
// QuickKart - Browser-side cart (public/js/app.js)
// The cart lives in localStorage until checkout. On "Place Order" the cart is
// sent to the server, which re-reads prices and stock from MySQL.
// ============================================================================

const CART_STORAGE_KEY = 'quickkart_cart_items';

// Escape text before putting it into HTML (stops broken markup / XSS)
function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function inr(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- Storage ----------
function getCart() {
    try {
        const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (e) {
        console.error('Failed to read cart:', e);
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartCountBadge();
}

function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
    updateCartCountBadge();
}

function updateCartCountBadge() {
    const badge = document.getElementById('navbar-cart-count');
    if (!badge) return;
    badge.textContent = getCart().reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
}

// ---------- Cart actions ----------
function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);

    if (existing) {
        if (existing.quantity >= product.stock) {
            alert(`Only ${product.stock} of "${product.name}" in stock.`);
            return false;
        }
        existing.quantity += 1;
        existing.stock = product.stock;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart(cart);
    return true;
}

function changeQuantity(productId, delta) {
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    if (delta > 0 && item.stock && item.quantity >= item.stock) {
        alert(`Only ${item.stock} of "${item.name}" in stock.`);
        return;
    }
    item.quantity += delta;
    saveCart(item.quantity > 0 ? cart : cart.filter(i => i.id !== productId));
    renderCartPage();
}

function removeFromCart(productId) {
    saveCart(getCart().filter(item => item.id !== productId));
    renderCartPage();
}

// ---------- Cart page ----------
function renderCartPage() {
    const tableBody = document.getElementById('cart-table-body');
    if (!tableBody) return; // not on /cart

    const layout = document.getElementById('cart-active-layout');
    const empty = document.getElementById('cart-empty-state');
    const cart = getCart();

    if (cart.length === 0) {
        layout.hidden = true;
        empty.hidden = false;
        return;
    }
    layout.hidden = false;
    empty.hidden = true;

    let subtotal = 0;
    tableBody.innerHTML = cart.map(item => {
        const lineTotal = item.price * item.quantity;
        subtotal += lineTotal;
        return `
            <tr>
                <td>
                    <div class="cart-product">
                        <img src="${esc(item.image)}" alt="" class="thumb" onerror="this.onerror=null;this.src='/img/placeholder.svg'">
                        <div>
                            <div class="strong">${esc(item.name)}</div>
                            <div class="muted-small">${esc(item.unit)}</div>
                        </div>
                    </div>
                </td>
                <td class="strong">${inr(item.price)}</td>
                <td>
                    <div class="qty-control">
                        <button type="button" class="qty-btn" data-action="dec" data-id="${item.id}" aria-label="Decrease">−</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button type="button" class="qty-btn" data-action="inc" data-id="${item.id}" aria-label="Increase">+</button>
                    </div>
                </td>
                <td class="strong text-green">${inr(lineTotal)}</td>
                <td><button type="button" class="btn-remove" data-action="remove" data-id="${item.id}">Remove</button></td>
            </tr>`;
    }).join('');

    // Same rule as the server (routes/store.js): free delivery above ₹199
    const deliveryFee = subtotal > 199 ? 0 : 25;
    document.getElementById('cart-subtotal').textContent = inr(subtotal);
    const feeEl = document.getElementById('cart-delivery-fee');
    feeEl.textContent = deliveryFee === 0 ? 'FREE' : inr(deliveryFee);
    feeEl.classList.toggle('text-green', deliveryFee === 0);
    document.getElementById('cart-grand-total').textContent = inr(subtotal + deliveryFee);

    // Only id + quantity are needed; the server looks up everything else in MySQL
    document.getElementById('cart_items_json').value =
        JSON.stringify(cart.map(({ id, quantity }) => ({ id, quantity })));
}

// ---------- Event wiring ----------
document.addEventListener('click', e => {
    // "+ ADD" buttons on the store page
    const addBtn = e.target.closest('.btn-add-cart');
    if (addBtn) {
        const d = addBtn.dataset;
        const added = addToCart({
            id: Number(d.id), name: d.name, price: Number(d.price),
            unit: d.unit, image: d.image, stock: Number(d.stock)
        });
        if (added) {
            addBtn.textContent = '✓ Added';
            addBtn.classList.add('added');
            setTimeout(() => { addBtn.textContent = '+ ADD'; addBtn.classList.remove('added'); }, 900);
        }
        return;
    }

    // +, −, Remove on the cart page
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
        const id = Number(actionBtn.dataset.id);
        if (actionBtn.dataset.action === 'inc') changeQuantity(id, 1);
        if (actionBtn.dataset.action === 'dec') changeQuantity(id, -1);
        if (actionBtn.dataset.action === 'remove') removeFromCart(id);
        return;
    }

    if (e.target.id === 'clear-cart' && confirm('Remove all items from your cart?')) {
        clearCart();
        renderCartPage();
    }
});

// Confirm before destructive admin actions (e.g. Delete product)
document.addEventListener('submit', e => {
    const form = e.target;
    if (form.classList.contains('js-confirm') && !confirm(form.dataset.confirm)) e.preventDefault();

    if (form.id === 'checkout-form' && getCart().length === 0) {
        e.preventDefault();
        alert('Your cart is empty! Please add products before placing an order.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    updateCartCountBadge();
    renderCartPage();
});
