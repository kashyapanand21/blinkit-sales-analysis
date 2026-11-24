// ============================================================================
// QuickKart - Frontend JavaScript Engine (public/js/app.js)
// Tech: Vanilla JS (Fetch API, DOM manipulation, localStorage for cart)
// ============================================================================

const CART_STORAGE_KEY = 'quickkart_cart_items';

// ============================================================================
// 1. Cart Management (localStorage)
// ============================================================================
function getCart() {
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error reading cart:', e);
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartCountBadge();
}

function updateCartCountBadge() {
    const badge = document.getElementById('navbar-cart-count');
    if (!badge) return;
    const cart = getCart();
    const totalQty = cart.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0);
    badge.textContent = totalQty;
}

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

    // Visual button feedback
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
        }, 800);
    }
}

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

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    renderCartPage();
}

function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
    updateCartCountBadge();
}

// ============================================================================
// 2. Catalog Page (index.html)
// ============================================================================
async function initCatalogPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const category = parseInt(urlParams.get('category'), 10) || 0;
    const sort = urlParams.get('sort') || 'default';

    // Populate search input and sort select if set
    const searchInput = document.getElementById('search-input');
    if (searchInput && search) searchInput.value = search;

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect && sort) sortSelect.value = sort;

    await loadCategories(category, search);
    await loadProducts(search, category, sort);
}

async function loadCategories(activeCatId, searchKeyword) {
    const container = document.getElementById('category-chips');
    if (!container) return;

    try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        let html = `
            <a href="index.html${searchKeyword ? '?search=' + encodeURIComponent(searchKeyword) : ''}" 
               class="category-chip ${activeCatId === 0 ? 'active' : ''}">
                🛍️ All Items
            </a>
        `;

        json.data.forEach(cat => {
            const queryParams = new URLSearchParams();
            queryParams.set('category', cat.category_id);
            if (searchKeyword) queryParams.set('search', searchKeyword);

            html += `
                <a href="index.html?${queryParams.toString()}" 
                   class="category-chip ${activeCatId === cat.category_id ? 'active' : ''}">
                    ${cat.category_icon || '🛒'} ${cat.category_name}
                </a>
            `;
        });

        container.innerHTML = html;
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

async function loadProducts(search, category, sort) {
    const grid = document.getElementById('product-grid');
    const countDisplay = document.getElementById('product-count-display');
    const sectionTitle = document.getElementById('section-title');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #718096;">Loading fresh groceries from MySQL...</div>';

    try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category > 0) params.set('category', category);
        if (sort && sort !== 'default') params.set('sort', sort);

        const res = await fetch(`/api/products?${params.toString()}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        const products = json.data;

        if (countDisplay) countDisplay.textContent = `${products.length} items found in database`;

        if (sectionTitle) {
            if (search) {
                sectionTitle.textContent = `Search results for "${search}"`;
            } else if (category > 0 && products.length > 0) {
                sectionTitle.textContent = products[0].category_name;
            } else {
                sectionTitle.textContent = 'Popular Grocery Essentials';
            }
        }

        if (products.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: #fff; border-radius: 12px; border: 1px dashed #cbd5e0;">
                    <div style="font-size: 3rem; margin-bottom: 12px;">🔍</div>
                    <h3 style="margin-bottom: 6px;">No products match your criteria</h3>
                    <p style="color: #718096; margin-bottom: 16px;">Try adjusting your search terms or picking another category.</p>
                    <a href="index.html" class="btn-checkout" style="display:inline-block; width:auto; padding: 8px 18px; text-decoration:none;">View All Products</a>
                </div>
            `;
            return;
        }

        let html = '';
        products.forEach(p => {
            const isOutOfStock = p.stock_quantity <= 0;
            html += `
                <div class="product-card">
                    <div>
                        <div class="product-img-wrap">
                            <img src="${p.image_url}" alt="${p.product_name}" loading="lazy">
                        </div>
                        <span class="category-tag">${p.category_name}</span>
                        <h3 class="product-name" title="${p.product_name}">${p.product_name}</h3>
                        <div class="product-unit">${p.unit}</div>
                    </div>
                    <div class="product-bottom-row">
                        <div class="product-price">₹${parseFloat(p.price).toFixed(2)}</div>
                        ${isOutOfStock 
                            ? '<span class="out-of-stock-badge">Sold Out</span>'
                            : `<button type="button" id="btn-add-${p.product_id}" class="btn-add-cart" onclick="addToCart(${p.product_id}, '${escapeQuotes(p.product_name)}', ${p.price}, '${escapeQuotes(p.unit)}', '${escapeQuotes(p.image_url)}')">+ ADD</button>`
                        }
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;

    } catch (err) {
        grid.innerHTML = `<div style="grid-column: 1/-1; color: red; text-align: center; padding: 30px;">Error loading products: ${err.message}</div>`;
    }
}

function escapeQuotes(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ============================================================================
// 3. Cart & Checkout Page (cart.html)
// ============================================================================
function renderCartPage() {
    const tableBody = document.getElementById('cart-table-body');
    const emptyNotice = document.getElementById('cart-empty-state');
    const layoutWrapper = document.getElementById('cart-active-layout');
    const subtotalDisplay = document.getElementById('cart-subtotal');
    const deliveryFeeEl = document.getElementById('cart-delivery-fee');
    const grandTotalDisplay = document.getElementById('cart-grand-total');

    if (!tableBody) return;

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
        const lineTotal = item.price * item.quantity;
        subtotal += lineTotal;
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
                <td style="font-weight: 700; color: #0c831f;">₹${lineTotal.toFixed(2)}</td>
                <td>
                    <button type="button" class="btn-remove" onclick="removeFromCart(${item.id})">Remove</button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;

    const deliveryFee = subtotal > 199 ? 0.00 : 25.00;
    const grandTotal = subtotal + deliveryFee;

    if (subtotalDisplay) subtotalDisplay.textContent = `₹${subtotal.toFixed(2)}`;
    if (deliveryFeeEl) {
        deliveryFeeEl.textContent = deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`;
        deliveryFeeEl.style.color = deliveryFee === 0 ? '#0c831f' : '#1a202c';
    }
    if (grandTotalDisplay) grandTotalDisplay.textContent = `₹${grandTotal.toFixed(2)}`;
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    const cart = getCart();

    if (!cart || cart.length === 0) {
        alert('Your cart is empty! Please add groceries before checkout.');
        return;
    }

    const payload = {
        full_name: document.getElementById('full_name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        delivery_address: document.getElementById('delivery_address').value.trim(),
        payment_method: document.getElementById('payment_method').value,
        cart_items: cart
    };

    const submitBtn = document.getElementById('btn-place-order');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Processing Order in MySQL...';
    }

    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        // Success! Clear cart and show order confirmation view
        clearCart();

        const activeLayout = document.getElementById('cart-active-layout');
        const confirmBox = document.getElementById('order-confirmation-box');

        if (activeLayout) activeLayout.style.display = 'none';
        if (confirmBox) {
            confirmBox.style.display = 'block';
            document.getElementById('confirm-order-id').textContent = `#${json.orderId}`;
            document.getElementById('confirm-total').textContent = `₹${parseFloat(json.totalAmount).toFixed(2)}`;
            document.getElementById('confirm-cust-name').textContent = payload.full_name;
            document.getElementById('confirm-address').textContent = payload.delivery_address;
        }

    } catch (err) {
        alert('Order failed: ' + err.message);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Place 10-Min Order';
        }
    }
}

// ============================================================================
// 4. Orders Report Page (orders.html)
// ============================================================================
async function initOrdersPage() {
    const listContainer = document.getElementById('orders-list');
    if (!listContainer) return;

    try {
        const res = await fetch('/api/orders');
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        // Fill Aggregate KPI Metrics
        const m = json.metrics;
        document.getElementById('metric-total-orders').textContent = m.total_orders || 0;
        document.getElementById('metric-total-sales').textContent = `₹${parseFloat(m.total_sales || 0).toFixed(2)}`;
        document.getElementById('metric-avg-order').textContent = `₹${parseFloat(m.average_order_value || 0).toFixed(2)}`;

        const orders = json.data;

        if (orders.length === 0) {
            listContainer.innerHTML = `
                <div class="admin-card" style="text-align: center; padding: 40px;">
                    <h3>No orders placed yet</h3>
                    <p style="color: #718096; margin-top: 6px;">Add some groceries to your cart and test placing an order!</p>
                </div>
            `;
            return;
        }

        let html = '';
        orders.forEach(ord => {
            let statusClass = 'badge-placed';
            if (ord.order_status === 'Preparing') statusClass = 'badge-preparing';
            if (ord.order_status === 'Out for Delivery') statusClass = 'badge-out';
            if (ord.order_status === 'Delivered') statusClass = 'badge-delivered';

            let itemsRows = '';
            (ord.items || []).forEach(it => {
                itemsRows += `
                    <tr>
                        <td><strong>${it.product_name}</strong></td>
                        <td><span class="category-tag">${it.category_name}</span></td>
                        <td>${it.unit}</td>
                        <td>₹${parseFloat(it.unit_price).toFixed(2)}</td>
                        <td><span style="background: #edf2f7; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${it.quantity}</span></td>
                        <td style="font-weight: 700; color: #0c831f;">₹${parseFloat(it.subtotal).toFixed(2)}</td>
                    </tr>
                `;
            });

            html += `
                <div class="admin-card" style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 14px;">
                        <div>
                            <span style="font-weight: 800; font-size: 1.1rem; color: #0c831f;">Order #${ord.order_id}</span>
                            <span style="color: #718096; font-size: 0.85rem; margin-left: 8px;">Date: ${new Date(ord.order_date).toLocaleString()}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="badge-status ${statusClass}">${ord.order_status}</span>
                            <span style="font-weight: 800; font-size: 1.15rem;">₹${parseFloat(ord.total_amount).toFixed(2)}</span>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 0.85rem; margin-bottom: 14px;">
                        <div>
                            <span style="color: #718096;">Customer:</span>
                            <strong style="display: block; color: #2d3748;">${ord.customer_name}</strong>
                        </div>
                        <div>
                            <span style="color: #718096;">Phone / Contact:</span>
                            <strong style="display: block; color: #2d3748;">${ord.phone}</strong>
                        </div>
                        <div>
                            <span style="color: #718096;">Payment Mode:</span>
                            <strong style="display: block; color: #2d3748;">${ord.payment_method}</strong>
                        </div>
                        <div>
                            <span style="color: #718096;">Delivery Address:</span>
                            <span style="display: block; color: #2d3748;">${ord.delivery_address}</span>
                        </div>
                    </div>

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
                            <tbody>${itemsRows}</tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;

    } catch (err) {
        listContainer.innerHTML = `<div style="color:red;">Error loading orders: ${err.message}</div>`;
    }
}

// ============================================================================
// 5. Admin Page (admin.html)
// ============================================================================
async function initAdminPage() {
    await loadAdminStats();
    await loadAdminCategories();
    await loadAdminProductsTable();

    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', handleAddProductSubmit);
    }
}

async function loadAdminStats() {
    const statsContainer = document.getElementById('admin-stats-container');
    if (!statsContainer) return;

    try {
        const res = await fetch('/api/admin/stats');
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        let html = '';
        json.data.forEach(stat => {
            html += `
                <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
                    <strong style="display: block; font-size: 0.9rem; color: #2d3748;">${stat.category_icon || '🛒'} ${stat.category_name}</strong>
                    <div style="font-size: 1.2rem; font-weight: 800; color: #0c831f; margin-top: 4px;">
                        ${stat.total_items} <span style="font-size:0.75rem; font-weight:500; color:#718096;">Products</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #718096; margin-top: 2px;">
                        Avg Price: ₹${parseFloat(stat.avg_price).toFixed(1)}
                    </div>
                </div>
            `;
        });

        statsContainer.innerHTML = html;
    } catch (err) {
        statsContainer.innerHTML = `<div style="color:red;">Failed to load category statistics: ${err.message}</div>`;
    }
}

async function loadAdminCategories() {
    const select = document.getElementById('category_id');
    if (!select) return;

    try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        let html = '<option value="">-- Choose Category --</option>';
        json.data.forEach(cat => {
            html += `<option value="${cat.category_id}">${cat.category_name}</option>`;
        });
        select.innerHTML = html;
    } catch (err) {
        console.error('Failed to load categories for form:', err);
    }
}

async function loadAdminProductsTable() {
    const tbody = document.getElementById('admin-products-table-body');
    const countDisplay = document.getElementById('admin-product-count');
    if (!tbody) return;

    try {
        const res = await fetch('/api/products');
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        const products = json.data;
        if (countDisplay) countDisplay.textContent = `(${products.length} Products in MySQL)`;

        let html = '';
        products.forEach(p => {
            html += `
                <tr>
                    <td>#${p.product_id}</td>
                    <td>
                        <img src="${p.image_url}" alt="" style="width: 44px; height: 44px; object-fit: contain; border-radius: 4px; border: 1px solid #edf2f7; background: #fff;">
                    </td>
                    <td><strong>${p.product_name}</strong></td>
                    <td><span class="category-tag">${p.category_name}</span></td>
                    <td>${p.unit}</td>
                    <td style="font-weight: 700;">₹${parseFloat(p.price).toFixed(2)}</td>
                    <td>
                        <span style="font-weight: 700; color: ${p.stock_quantity < 10 ? '#e53e3e' : '#2d3748'};">
                            ${p.stock_quantity}
                        </span>
                    </td>
                    <td>
                        <button type="button" class="btn-danger" onclick="deleteProduct(${p.product_id}, '${escapeQuotes(p.product_name)}')">Delete</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Failed to load products: ${err.message}</td></tr>`;
    }
}

async function handleAddProductSubmit(e) {
    e.preventDefault();
    const payload = {
        category_id: document.getElementById('category_id').value,
        product_name: document.getElementById('product_name').value.trim(),
        unit: document.getElementById('unit').value.trim(),
        price: document.getElementById('price').value,
        stock_quantity: document.getElementById('stock_quantity').value,
        image_url: document.getElementById('image_url').value.trim()
    };

    try {
        const res = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        alert(json.message);
        document.getElementById('add-product-form').reset();

        // Refresh stats and table
        await loadAdminStats();
        await loadAdminProductsTable();

    } catch (err) {
        alert('Failed to add product: ' + err.message);
    }
}

async function deleteProduct(productId, productName) {
    if (!confirm(`Are you sure you want to delete "${productName}" from MySQL?`)) {
        return;
    }

    try {
        const res = await fetch(`/api/admin/products/${productId}`, {
            method: 'DELETE'
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        alert(json.message);
        await loadAdminStats();
        await loadAdminProductsTable();

    } catch (err) {
        alert(err.message);
    }
}

// ============================================================================
// Auto-Run on DOM Load
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    updateCartCountBadge();

    if (document.getElementById('product-grid')) {
        initCatalogPage();
    }
    if (document.getElementById('cart-table-body')) {
        renderCartPage();
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', handleCheckoutSubmit);
        }
    }
    if (document.getElementById('orders-list')) {
        initOrdersPage();
    }
    if (document.getElementById('admin-stats-container')) {
        initAdminPage();
    }
});
