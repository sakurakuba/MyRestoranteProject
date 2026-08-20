let MENU = null;
let DISCOUNT_RATE = 0.10;
let currentUser = null;
let cart = {}; // id -> qty

function fmt(n) { return '$' + n.toFixed(2); }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function allItems() {
  if (!MENU) return [];
  return [...MENU.entrees, ...MENU.plats, ...MENU.desserts, ...MENU.boissons];
}

function findItem(id) {
  return allItems().find((i) => i.id === id);
}

// ---------- menu ----------
async function loadMenu() {
  const data = await api('/api/menu');
  MENU = data.menu;
  DISCOUNT_RATE = data.discountRate;
  renderMenu();
}

function renderMenu() {
  const sections = [
    ['menu-entrees', MENU.entrees],
    ['menu-plats', MENU.plats],
    ['menu-desserts', MENU.desserts],
    ['menu-boissons', MENU.boissons],
  ];
  sections.forEach(([elId, items]) => {
    const el = document.getElementById(elId);
    el.innerHTML = items.map((item) => `
      <div class="menu-item">
        <h4>${item.name}</h4>
        <p class="desc">${item.desc}</p>
        <div class="price-row">
          <span class="price">${fmt(item.price)}</span>
          <button class="add-btn" data-id="${item.id}">Add to Order</button>
        </div>
      </div>
    `).join('');
  });
}

// ---------- cart ----------
function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
}
function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id] += delta;
  if (cart[id] <= 0) delete cart[id];
  renderCart();
}
function removeFromCart(id) {
  delete cart[id];
  renderCart();
}
function cartSubtotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => sum + findItem(id).price * qty, 0);
}
function cartCount() {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}
function cartDiscount(subtotal) {
  return currentUser ? subtotal * DISCOUNT_RATE : 0;
}

function renderCart() {
  const ids = Object.keys(cart);
  document.getElementById('cartCount').textContent = cartCount();

  const cartItemsEl = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  const checkoutForm = document.getElementById('checkoutForm');

  if (ids.length === 0) {
    cartItemsEl.innerHTML = '<p class="empty-msg">Your cart is empty. Add items from the menu above.</p>';
    totalEl.style.display = 'none';
    checkoutForm.style.display = 'none';
  } else {
    cartItemsEl.innerHTML = ids.map((id) => {
      const item = findItem(id);
      const qty = cart[id];
      return `
        <div class="cart-row">
          <span class="name">${item.name}</span>
          <span class="qty-controls">
            <button data-action="dec" data-id="${id}">−</button>
            ${qty}
            <button data-action="inc" data-id="${id}">+</button>
          </span>
          <span class="line-price">${fmt(item.price * qty)}</span>
          <button class="remove-btn" data-action="remove" data-id="${id}">Remove</button>
        </div>
      `;
    }).join('');

    const subtotal = cartSubtotal();
    const discount = cartDiscount(subtotal);
    const total = subtotal - discount;

    totalEl.style.display = 'block';
    document.getElementById('cartSubtotalAmount').textContent = fmt(subtotal);
    document.getElementById('cartTotalAmount').textContent = fmt(total);

    const discountLine = document.getElementById('discountLine');
    const discountHint = document.getElementById('discountHint');
    if (currentUser) {
      discountLine.style.display = 'flex';
      document.getElementById('cartDiscountAmount').textContent = '-' + fmt(discount);
      discountHint.style.display = 'none';
    } else {
      discountLine.style.display = 'none';
      discountHint.style.display = 'block';
    }

    checkoutForm.style.display = 'block';
  }

  // Drawer
  const drawerItemsEl = document.getElementById('drawerItems');
  if (ids.length === 0) {
    drawerItemsEl.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
  } else {
    drawerItemsEl.innerHTML = ids.map((id) => {
      const item = findItem(id);
      const qty = cart[id];
      return `<div class="cart-row"><span class="name">${item.name} × ${qty}</span><span class="line-price">${fmt(item.price * qty)}</span></div>`;
    }).join('');
  }
  const subtotal = cartSubtotal();
  const discount = cartDiscount(subtotal);
  document.getElementById('drawerTotal').textContent = fmt(subtotal - discount);
}

// ---------- auth ----------
function renderAuthArea() {
  const el = document.getElementById('authArea');
  if (currentUser) {
    el.innerHTML = `
      <span class="user-chip">👤 ${escapeHtml(currentUser.name)} (10% off)</span>
      <button class="auth-btn" id="logoutBtn">Log Out</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  } else {
    el.innerHTML = `
      <button class="auth-btn" id="loginToggle">Log In</button>
      <button class="auth-btn" id="registerToggle">Sign Up</button>
    `;
    document.getElementById('loginToggle').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('registerToggle').addEventListener('click', () => openAuthModal('register'));
  }
}

async function refreshCurrentUser() {
  const data = await api('/api/auth/me');
  currentUser = data.user;
  renderAuthArea();
  renderCart();
}

async function handleLogout() {
  await api('/api/auth/logout', { method: 'POST' });
  currentUser = null;
  renderAuthArea();
  renderCart();
}

function openAuthModal(pane) {
  document.getElementById('authOverlay').classList.add('open');
  document.getElementById('loginPane').style.display = pane === 'login' ? 'block' : 'none';
  document.getElementById('registerPane').style.display = pane === 'register' ? 'block' : 'none';
  document.getElementById('loginError').textContent = '';
  document.getElementById('registerError').textContent = '';
}
function closeAuthModal() {
  document.getElementById('authOverlay').classList.remove('open');
}

document.getElementById('authModalClose').addEventListener('click', closeAuthModal);
document.getElementById('authOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'authOverlay') closeAuthModal();
});
document.getElementById('switchToRegister').addEventListener('click', (e) => { e.preventDefault(); openAuthModal('register'); });
document.getElementById('switchToLogin').addEventListener('click', (e) => { e.preventDefault(); openAuthModal('login'); });

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    currentUser = data.user;
    renderAuthArea();
    renderCart();
    closeAuthModal();
    e.target.reset();
  } catch (err) {
    document.getElementById('loginError').textContent = err.message;
  }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  try {
    const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    currentUser = data.user;
    renderAuthArea();
    renderCart();
    closeAuthModal();
    e.target.reset();
  } catch (err) {
    document.getElementById('registerError').textContent = err.message;
  }
});

// ---------- event wiring: menu + cart ----------
document.addEventListener('click', (e) => {
  const addBtn = e.target.closest('.add-btn');
  if (addBtn) { addToCart(addBtn.dataset.id); return; }

  const qtyBtn = e.target.closest('[data-action]');
  if (qtyBtn) {
    const { action, id } = qtyBtn.dataset;
    if (action === 'inc') changeQty(id, 1);
    if (action === 'dec') changeQty(id, -1);
    if (action === 'remove') removeFromCart(id);
  }
});

const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
document.getElementById('cartToggle').addEventListener('click', () => {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
});
document.getElementById('closeCart').addEventListener('click', closeDrawer);
cartOverlay.addEventListener('click', closeDrawer);
document.getElementById('goToOrder').addEventListener('click', closeDrawer);
function closeDrawer() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('open');
}

// Card number formatting (visual only, demo)
const cardNumberEl = document.getElementById('cardNumber');
cardNumberEl.addEventListener('input', () => {
  let v = cardNumberEl.value.replace(/\D/g, '').slice(0, 16);
  cardNumberEl.value = v.replace(/(.{4})/g, '$1 ').trim();
});
const cardExpiryEl = document.getElementById('cardExpiry');
cardExpiryEl.addEventListener('input', () => {
  let v = cardExpiryEl.value.replace(/\D/g, '').slice(0, 4);
  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
  cardExpiryEl.value = v;
});

// ---------- order submit ----------
document.getElementById('orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('orderName').value.trim();
  const phone = document.getElementById('orderPhone').value.trim();
  const pickup = document.getElementById('orderPickup').value;

  const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));

  try {
    const data = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items, name, phone, pickup }),
    });
    const order = data.order;

    const confEl = document.getElementById('orderConfirmation');
    confEl.style.display = 'block';
    confEl.innerHTML = `
      ✅ <strong>Order confirmed!</strong><br>
      Order #${order.id}<br>
      Thanks, ${escapeHtml(name)}! Subtotal ${fmt(order.subtotal)}${order.discountApplied ? `, member discount -${fmt(order.discount)}` : ''}.<br>
      Total "charged" (demo): <strong>${fmt(order.total)}</strong><br>
      Pickup time: ${escapeHtml(order.pickup)}
    `;

    cart = {};
    renderCart();
    e.target.reset();
  } catch (err) {
    alert('Could not place order: ' + err.message);
  }
});

// ---------- booking submit ----------
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('bookName').value.trim();
  const phone = document.getElementById('bookPhone').value.trim();
  const guests = Number(document.getElementById('bookGuests').value);
  const date = document.getElementById('bookDate').value;
  const time = document.getElementById('bookTime').value;

  try {
    const data = await api('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ name, phone, guests, date, time }),
    });
    const booking = data.booking;

    const confEl = document.getElementById('bookingConfirmation');
    confEl.style.display = 'block';
    confEl.innerHTML = `
      ✅ <strong>Table reserved!</strong><br>
      Confirmation #${booking.id}<br>
      ${escapeHtml(name)}, table for ${escapeHtml(guests)} on ${escapeHtml(date)} at ${escapeHtml(time)}.<br>
      We'll call you at ${escapeHtml(phone)} to confirm.
    `;
    e.target.reset();
    document.getElementById('bookGuests').value = 2;
  } catch (err) {
    alert('Could not book table: ' + err.message);
  }
});

// ---------- init ----------
(async function init() {
  await loadMenu();
  renderCart();
  await refreshCurrentUser();
})();
