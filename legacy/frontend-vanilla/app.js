// ============================================================
// TAGG — frontend logic (vanilla JS, no build step)
// Talks to user-service, listing-service, chat-service directly.
// API base URLs come from config.js
// ============================================================

const appEl = document.getElementById('app');
const topbarAuthEl = document.getElementById('topbarAuth');
const toastEl = document.getElementById('toast');

let chatPollTimer = null;

// ---------- theme (light / dark) ----------

function getThemePref() {
  return localStorage.getItem('tagg_theme') || 'system';
}
function resolvedTheme() {
  const pref = getThemePref();
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref;
}
function applyTheme() {
  document.documentElement.setAttribute('data-theme', resolvedTheme());
}
function setThemePref(pref) {
  localStorage.setItem('tagg_theme', pref);
  applyTheme();
}
applyTheme(); // run immediately so there's no flash of the wrong theme
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemePref() === 'system') applyTheme();
  });
}

// ---------- auth state ----------

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem('tagg_auth') || 'null');
  } catch {
    return null;
  }
}
function setAuth(auth) {
  localStorage.setItem('tagg_auth', JSON.stringify(auth));
  renderTopbar();
}
function clearAuth() {
  localStorage.removeItem('tagg_auth');
  renderTopbar();
}
function isLoggedIn() {
  return !!getAuth()?.token;
}
function authHeader() {
  const auth = getAuth();
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
}
function getMode() {
  return getAuth()?.mode || null;
}
function setMode(mode) {
  const auth = getAuth();
  if (!auth) return;
  auth.mode = mode;
  localStorage.setItem('tagg_auth', JSON.stringify(auth));
  renderTopbar();
}
function applyModeTheme() {
  const mode = getMode();
  document.body.classList.toggle('mode-buyer', mode === 'buyer');
  document.body.classList.toggle('mode-seller', mode === 'seller');
}

// ---------- cart + wishlist state ----------
// Stored client-side (per logged-in user), as arrays of listing ids.
// "Cart" = ready to buy now. "Wishlist" = save for later, doesn't affect checkout.

function cartKey() {
  const auth = getAuth();
  return auth ? `tagg_cart_${auth.id}` : null;
}
function wishlistKey() {
  const auth = getAuth();
  return auth ? `tagg_wishlist_${auth.id}` : null;
}
function readIdList(key) {
  if (!key) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}
function writeIdList(key, ids) {
  if (!key) return;
  localStorage.setItem(key, JSON.stringify([...new Set(ids.map(String))]));
  updateCartBadge();
}
function getCartIds() { return readIdList(cartKey()); }
function getWishlistIds() { return readIdList(wishlistKey()); }

function addToCart(id) {
  const ids = getCartIds();
  if (ids.includes(String(id))) return false;
  ids.push(String(id));
  writeIdList(cartKey(), ids);
  // adding to cart implies "not saving for later" anymore
  removeFromWishlist(id, { silent: true });
  return true;
}
function removeFromCart(id) {
  writeIdList(cartKey(), getCartIds().filter(x => x !== String(id)));
}
function addToWishlist(id) {
  const ids = getWishlistIds();
  if (ids.includes(String(id))) return false;
  ids.push(String(id));
  writeIdList(wishlistKey(), ids);
  return true;
}
function removeFromWishlist(id, { silent } = {}) {
  writeIdList(wishlistKey(), getWishlistIds().filter(x => x !== String(id)));
}
function isInCart(id) { return getCartIds().includes(String(id)); }
function isInWishlist(id) { return getWishlistIds().includes(String(id)); }

function updateCartBadge() {
  const badge = document.getElementById('cartCountBadge');
  if (!badge) return;
  const count = getCartIds().length;
  badge.textContent = count > 0 ? String(count) : '';
  badge.classList.toggle('hidden', count === 0);
}

// ---------- toast ----------

let toastTimer = null;
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.style.borderLeftColor = isError ? 'var(--red)' : 'var(--red)';
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

// ---------- fetch helpers ----------

async function apiFetch(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    throw new Error('Could not reach the server. Is it running?');
  }
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// ---------- topbar + nav ----------

const mainNavEl = document.getElementById('mainNav');

function renderTopbar() {
  applyModeTheme();
  const auth = getAuth();
  if (auth?.token) {
    const modeLabel = auth.mode === 'seller' ? 'Selling' : auth.mode === 'buyer' ? 'Buying' : '';
    topbarAuthEl.innerHTML = `
      ${modeLabel ? `<button id="switchRoleBtn" class="mode-pill">${modeLabel} · Switch</button>` : ''}
      <span class="user-name">${escapeHtml(auth.name || auth.email || 'You')}</span>
      <button id="logoutBtn">Log out</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => {
      clearAuth();
      showToast('Logged out');
      navigate('#/browse');
    });
    const switchBtn = document.getElementById('switchRoleBtn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => navigate('#/choose-role'));
    }
  } else {
    topbarAuthEl.innerHTML = `<a href="#/auth" class="btn btn-primary">Log in</a>`;
  }
  renderNav();
}

function renderNav() {
  const auth = getAuth();
  const mode = auth?.mode;
  const links = [];

  links.push({ href: '#/browse', label: 'Browse', key: 'browse' });
  if (auth) {
    if (mode === 'seller') {
      links.push({ href: '#/sell', label: 'Sell', key: 'sell' });
      links.push({ href: '#/my-listings', label: 'My Listings', key: 'my-listings' });
    }
    if (mode === 'buyer') {
      links.push({ href: '#/cart', label: 'Cart<span id="cartCountBadge" class="cart-count-badge hidden"></span>', key: 'cart' });
    }
    links.push({ href: '#/messages', label: 'Messages', key: 'messages' });
    links.push({ href: '#/orders', label: mode === 'seller' ? 'Sales' : 'Orders', key: 'orders' });
  }

  mainNavEl.innerHTML = links
    .map(l => `<a href="${l.href}" data-nav="${l.key}">${l.label}</a>`)
    .join('');
  updateCartBadge();
}

function highlightNav(name) {
  document.querySelectorAll('.main-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.nav === name);
  });
}

// ---------- utils ----------

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
function formatPrice(price) {
  const n = Number(price);
  return '₹' + (Number.isFinite(n) ? n.toLocaleString('en-IN') : price);
}
function clone(templateId) {
  return document.getElementById(templateId).content.cloneNode(true);
}
function stopChatPolling() {
  if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
}

// ---------- router ----------

function parseHash() {
  let hash = location.hash || '#/browse';
  hash = hash.replace(/^#/, '');
  const [path, queryString] = hash.split('?');
  const segments = path.split('/').filter(Boolean);
  const query = new URLSearchParams(queryString || '');
  return { segments, query };
}

function navigate(hash) {
  if (location.hash === hash) {
    render();
  } else {
    location.hash = hash;
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  renderTopbar();
  render();
  document.getElementById('themeToggle').addEventListener('click', () => {
    setThemePref(resolvedTheme() === 'dark' ? 'light' : 'dark');
  });
});

function render() {
  stopChatPolling();
  const { segments, query } = parseHash();
  const [root, id, extra] = segments;

  // if logged in but hasn't picked a role yet, force the picker first
  // (except for the picker route itself and standalone views like auth/checkout-success)
  const exemptRoutes = ['choose-role', 'auth', 'checkout-success'];
  if (isLoggedIn() && !getMode() && !exemptRoutes.includes(root)) {
    return navigate('#/choose-role');
  }

  if (root === 'choose-role') { highlightNav(''); return renderChooseRole(); }
  if (!root || root === 'browse') { highlightNav('browse'); return renderBrowse(); }
  if (root === 'sell') { highlightNav('sell'); return renderSell(); }
  if (root === 'my-listings') { highlightNav('my-listings'); return renderMyListings(); }
  if (root === 'cart') { highlightNav('cart'); return renderCart(); }
  if (root === 'messages') { highlightNav('messages'); return renderMessages(); }
  if (root === 'orders') { highlightNav('orders'); return renderOrders(); }
  if (root === 'listing' && id) { highlightNav(''); return renderListingDetail(id, query); }
  if (root === 'checkout-details' && id === 'listing' && extra) { highlightNav(''); return renderCheckoutDetails({ type: 'listing', listingId: extra }); }
  if (root === 'checkout-details' && id === 'cart') { highlightNav(''); return renderCheckoutDetails({ type: 'cart' }); }
  if (root === 'checkout-success') { highlightNav(''); return renderCheckoutSuccess(query); }
  if (root === 'auth') { highlightNav(''); return renderAuth(); }

  navigate('#/browse');
}

// ============================================================
// AUTH VIEW
// ============================================================

function renderAuth() {
  appEl.innerHTML = '';
  appEl.appendChild(clone('tpl-auth'));

  const tabs = appEl.querySelectorAll('.auth-tab');
  const loginForm = appEl.querySelector('#loginForm');
  const registerForm = appEl.querySelector('#registerForm');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      loginForm.classList.toggle('hidden', !isLogin);
      registerForm.classList.toggle('hidden', isLogin);
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = appEl.querySelector('#loginError');
    errorEl.textContent = '';
    const fd = new FormData(loginForm);
    const email = fd.get('email');
    const password = fd.get('password');
    try {
      const { token } = await apiFetch(`${API.users}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const me = await apiFetch(`${API.users}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuth({ token, id: me.id, email: me.email, name: me.name, mode: null });
      showToast(`Welcome back, ${me.name || me.email}`);
      navigate('#/choose-role');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = appEl.querySelector('#registerError');
    errorEl.textContent = '';
    const fd = new FormData(registerForm);
    const name = fd.get('name');
    const email = fd.get('email');
    const password = fd.get('password');
    try {
      await apiFetch(`${API.users}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      // auto login right after registering
      const { token } = await apiFetch(`${API.users}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const me = await apiFetch(`${API.users}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuth({ token, id: me.id, email: me.email, name: me.name, mode: null });
      showToast(`Account created — welcome, ${me.name || me.email}`);
      navigate('#/choose-role');
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

// ============================================================
// CHOOSE ROLE VIEW
// ============================================================

function renderChooseRole() {
  appEl.innerHTML = '';
  appEl.appendChild(clone('tpl-choose-role'));

  appEl.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      setMode(role);
      showToast(role === 'seller' ? 'Switched to selling' : 'Switched to buying');
      navigate(role === 'seller' ? '#/sell' : '#/browse');
    });
  });
}

// ============================================================
// BROWSE VIEW
// ============================================================

async function renderBrowse() {
  appEl.innerHTML = '';
  appEl.appendChild(clone('tpl-browse'));

  const grid = appEl.querySelector('#listingsGrid');
  const emptyEl = appEl.querySelector('#browseEmpty');
  const form = appEl.querySelector('#filterForm');
  const newArrivalsSection = appEl.querySelector('#newArrivalsSection');
  const newArrivalsGrid = appEl.querySelector('#newArrivalsGrid');

  async function load(params = {}) {
    grid.innerHTML = '';
    emptyEl.classList.add('hidden');
    newArrivalsSection.classList.add('hidden');
    newArrivalsGrid.innerHTML = '';

    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    const isUnfiltered = Object.keys(params).length === 0;

    try {
      const data = await apiFetch(`${API.listings}?${qs.toString()}`);
      const listings = data.listings || [];
      if (listings.length === 0) {
        emptyEl.classList.remove('hidden');
        return;
      }

      // Newest-first is already how the API sorts these, so a quick way to
      // surface freshly uploaded products is a strip of whatever's newest —
      // only on the default, unfiltered view so it doesn't fight a search.
      if (isUnfiltered) {
        const fresh = listings.filter(isNewListing).slice(0, 8);
        if (fresh.length > 0) {
          fresh.forEach(listing => newArrivalsGrid.appendChild(buildListingCard(listing)));
          newArrivalsSection.classList.remove('hidden');
        }
      }

      listings.forEach(listing => grid.appendChild(buildListingCard(listing)));
    } catch (err) {
      showToast(err.message, true);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    load(Object.fromEntries(fd.entries()));
  });

  load();
}

function isNewListing(listing) {
  if (!listing.created_at) return false;
  const ageMs = Date.now() - new Date(listing.created_at).getTime();
  return ageMs >= 0 && ageMs <= 1000 * 60 * 60 * 48; // 48 hours
}

function buildListingCard(listing) {
  const node = clone('tpl-listing-card');
  const card = node.querySelector('.tag-card');
  card.dataset.category = (listing.category || 'other').toLowerCase();
  const link = node.querySelector('.tag-card-link');
  link.href = `#/listing/${listing.id}`;

  const img = node.querySelector('.tag-card-img');
  if (listing.image_url) {
    img.src = listing.image_url;
    img.addEventListener('load', () => img.classList.add('loaded'));
  }
  node.querySelector('.tag-card-category').textContent = listing.category || '';
  node.querySelector('.tag-card-title').textContent = listing.title;
  node.querySelector('.tag-card-location').textContent = listing.location || '—';
  node.querySelector('.tag-card-price').textContent = formatPrice(listing.price);
  if (listing.is_sold) {
    node.querySelector('.tag-card-sold').classList.remove('hidden');
  } else if (isNewListing(listing)) {
    node.querySelector('.tag-card-new').classList.remove('hidden');
  }

  // Quick actions — only for a logged-in buyer, on someone else's active listing
  const auth = getAuth();
  const canQuickAct = auth && getMode() === 'buyer' && !listing.is_sold &&
    String(auth.id) !== String(listing.user_id);

  if (canQuickAct) {
    const actionsEl = node.querySelector('.tag-card-quick-actions');
    actionsEl.classList.remove('hidden');

    const cartBtn = node.querySelector('.quick-cart');
    const wishBtn = node.querySelector('.quick-wishlist');
    const msgBtn = node.querySelector('.quick-message');

    const syncButtons = () => {
      cartBtn.classList.toggle('quick-btn-active', isInCart(listing.id));
      cartBtn.title = isInCart(listing.id) ? 'In cart' : 'Add to cart';
      wishBtn.classList.toggle('quick-btn-active', isInWishlist(listing.id));
      wishBtn.textContent = isInWishlist(listing.id) ? '★' : '☆';
      wishBtn.title = isInWishlist(listing.id) ? 'Saved for later' : 'Save for later';
    };
    syncButtons();

    cartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isInCart(listing.id)) {
        removeFromCart(listing.id);
        showToast('Removed from cart');
      } else {
        addToCart(listing.id);
        showToast('Added to cart');
      }
      syncButtons();
    });
    wishBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isInWishlist(listing.id)) {
        removeFromWishlist(listing.id);
        showToast('Removed from saved items');
      } else {
        addToWishlist(listing.id);
        showToast('Saved for later');
      }
      syncButtons();
    });
    msgBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigate(`#/listing/${listing.id}?focus=chat`);
    });
  }

  return node;
}

// ============================================================
// SELL VIEW
// ============================================================

function renderSell() {
  if (!isLoggedIn()) {
    appEl.innerHTML = `
      <section class="view">
        <p class="empty-state">You need to <a href="#/auth">log in</a> before posting a listing.</p>
      </section>`;
    return;
  }
  if (getMode() !== 'seller') {
    appEl.innerHTML = `
      <section class="view">
        <p class="empty-state">
          You're currently in buying mode. <a href="#/choose-role" id="goSeller">Switch to selling</a> to post a listing.
        </p>
      </section>`;
    return;
  }

  appEl.innerHTML = '';
  appEl.appendChild(clone('tpl-sell'));

  const form = appEl.querySelector('#sellForm');
  const errorEl = appEl.querySelector('#sellError');
  const imageInput = appEl.querySelector('#imageInput');
  const imagePreview = appEl.querySelector('#imagePreview');
  const dropzoneLabel = appEl.querySelector('#dropzoneLabel');

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.classList.remove('hidden');
    dropzoneLabel.textContent = file.name;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    const auth = getAuth();
    const fd = new FormData(form);
    fd.set('userId', auth.id);

    try {
      const listing = await apiFetch(`${API.listings}`, {
        method: 'POST',
        body: fd,
      });
      showToast('Listing posted');
      navigate(`#/listing/${listing.id}`);
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

// ============================================================
// MY LISTINGS VIEW (seller's own listings + total earnings)
// ============================================================

async function renderMyListings() {
  if (!isLoggedIn()) {
    appEl.innerHTML = `
      <section class="view">
        <p class="empty-state">You need to <a href="#/auth">log in</a> to see your listings.</p>
      </section>`;
    return;
  }
  if (getMode() !== 'seller') {
    appEl.innerHTML = `
      <section class="view">
        <p class="empty-state">
          You're currently in buying mode. <a href="#/choose-role" id="goSeller">Switch to selling</a> to manage your listings.
        </p>
      </section>`;
    return;
  }

  appEl.innerHTML = '';
  appEl.appendChild(clone('tpl-my-listings'));

  const auth = getAuth();
  const earningsStrip = appEl.querySelector('#earningsStrip');
  const grid = appEl.querySelector('#myListingsGrid');
  const emptyEl = appEl.querySelector('#myListingsEmpty');

  // Total earnings, active count, sold count — all in one glance
  try {
    const earnings = await apiFetch(`${API.listings}/orders/earnings/${auth.id}`);
    earningsStrip.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-label">Total earned</div>
        <div class="stat-card-value">${formatPrice(earnings.total)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Items sold</div>
        <div class="stat-card-value">${earnings.count}</div>
      </div>
    `;
  } catch (err) {
    showToast(err.message, true);
  }

  try {
    const listings = await apiFetch(`${API.listings}/mine/${auth.id}`);
    if (listings.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    listings.forEach(listing => grid.appendChild(buildListingCard(listing)));
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================
// CART + WISHLIST VIEW
// ============================================================

async function renderCart() {
  if (!isLoggedIn()) {
    appEl.innerHTML = `
      <section class="view">
        <p class="empty-state">You need to <a href="#/auth">log in</a> to see your cart.</p>
      </section>`;
    return;
  }
  if (getMode() !== 'buyer') {
    appEl.innerHTML = `
      <section class="view">
        <p class="empty-state">
          You're currently in selling mode. <a href="#/choose-role">Switch to buying</a> to use your cart.
        </p>
      </section>`;
    return;
  }

  appEl.innerHTML = '';
  appEl.appendChild(clone('tpl-cart'));

  const cartListEl = appEl.querySelector('#cartItemsList');
  const cartEmptyEl = appEl.querySelector('#cartEmpty');
  const cartSummaryEl = appEl.querySelector('#cartSummary');
  const cartTotalEl = appEl.querySelector('#cartTotal');
  const checkoutBtn = appEl.querySelector('#cartCheckoutBtn');
  const checkoutErrorEl = appEl.querySelector('#cartCheckoutError');

  const wishListEl = appEl.querySelector('#wishlistItemsList');
  const wishEmptyEl = appEl.querySelector('#wishlistEmpty');

  const auth = getAuth();

  // Fetch full listing details for whatever ids are stored client-side,
  // and quietly drop any that no longer exist or got sold in the meantime.
  // Also resolves each item's effective price — the seller-accepted
  // negotiated price for this buyer, if one exists, otherwise the listing price.
  async function loadListings(ids) {
    const results = await Promise.all(ids.map(async id => {
      let listing;
      try {
        listing = await apiFetch(`${API.listings}/${id}`);
      } catch {
        return null;
      }
      if (listing.is_sold) return null;

      let effectivePrice = Number(listing.price);
      try {
        const negotiated = await apiFetch(`${API.listings}/${id}/negotiated-price/${auth.id}`);
        effectivePrice = Number(negotiated.price);
      } catch {
        // no negotiated price for this buyer — normal listing price stands
      }

      return { ...listing, effectivePrice };
    }));
    return results.filter(Boolean);
  }

  function buildCartRow(listing, { forWishlist }) {
    const row = document.createElement('div');
    row.className = 'cart-item-row';
    const hasDiscount = Number(listing.effectivePrice) !== Number(listing.price);
    const priceHtml = hasDiscount
      ? `<span class="cart-item-price-old">${formatPrice(listing.price)}</span><span class="cart-item-price">${formatPrice(listing.effectivePrice)}</span><span class="cart-item-negotiated-tag">Negotiated</span>`
      : `<span class="cart-item-price">${formatPrice(listing.price)}</span>`;
    row.innerHTML = `
      <a href="#/listing/${listing.id}" class="cart-item-media">
        ${listing.image_url
          ? `<img src="${listing.image_url}" alt="">`
          : `<div class="tag-card-noimg">No photo</div>`}
      </a>
      <div class="cart-item-body">
        <a href="#/listing/${listing.id}" class="cart-item-title">${escapeHtml(listing.title)}</a>
        ${priceHtml}
      </div>
      <div class="cart-item-actions"></div>
    `;
    const actions = row.querySelector('.cart-item-actions');

    if (forWishlist) {
      const moveBtn = document.createElement('button');
      moveBtn.className = 'btn btn-outline';
      moveBtn.textContent = 'Move to cart';
      moveBtn.addEventListener('click', () => {
        removeFromWishlist(listing.id);
        addToCart(listing.id);
        showToast('Moved to cart');
        renderCart();
      });
      actions.appendChild(moveBtn);
    } else {
      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-outline';
      saveBtn.textContent = 'Save for later';
      saveBtn.addEventListener('click', () => {
        removeFromCart(listing.id);
        addToWishlist(listing.id);
        showToast('Saved for later');
        renderCart();
      });
      actions.appendChild(saveBtn);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-outline btn-danger';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      if (forWishlist) removeFromWishlist(listing.id); else removeFromCart(listing.id);
      showToast('Removed');
      renderCart();
    });
    actions.appendChild(removeBtn);

    return row;
  }

  const [cartListings, wishlistListings] = await Promise.all([
    loadListings(getCartIds()),
    loadListings(getWishlistIds()),
  ]);

  // Drop stale ids (deleted/sold since they were added) from local storage
  writeIdList(cartKey(), cartListings.map(l => l.id));
  writeIdList(wishlistKey(), wishlistListings.map(l => l.id));

  if (cartListings.length === 0) {
    cartEmptyEl.classList.remove('hidden');
  } else {
    cartListings.forEach(l => cartListEl.appendChild(buildCartRow(l, { forWishlist: false })));
    const total = cartListings.reduce((sum, l) => sum + Number(l.effectivePrice), 0);
    cartTotalEl.textContent = formatPrice(total);
    cartSummaryEl.classList.remove('hidden');

    checkoutBtn.addEventListener('click', () => {
      navigate('#/checkout-details/cart');
    });
  }

  if (wishlistListings.length === 0) {
    wishEmptyEl.classList.remove('hidden');
  } else {
    wishlistListings.forEach(l => wishListEl.appendChild(buildCartRow(l, { forWishlist: true })));
  }
}

// ============================================================
// LISTING DETAIL + CHAT
// ============================================================

async function renderListingDetail(id, query) {
  appEl.innerHTML = '';
  appEl.appendChild(clone('tpl-listing-detail'));

  let listing;
  try {
    listing = await apiFetch(`${API.listings}/${id}`);
  } catch (err) {
    appEl.innerHTML = `<section class="view"><p class="empty-state">${escapeHtml(err.message)}</p></section>`;
    return;
  }

  const img = appEl.querySelector('#detailImg');
  if (listing.image_url) {
    img.src = listing.image_url;
    img.addEventListener('load', () => img.classList.add('loaded'));
  }
  appEl.querySelector('#detailCategory').textContent = listing.category || '';
  appEl.querySelector('#detailTitle').textContent = listing.title;
  appEl.querySelector('#detailPrice').textContent = formatPrice(listing.price);
  appEl.querySelector('#detailLocation').textContent = listing.location || 'Location not specified';
  appEl.querySelector('#detailDescription').textContent = listing.description || 'No description provided.';

  const auth = getAuth();
  const isOwner = auth && String(auth.id) === String(listing.user_id);

  if (listing.is_sold) {
    appEl.querySelector('#detailSoldBadge').classList.remove('hidden');
  }

  if (isOwner) {
    appEl.querySelector('#detailOwnerNote').classList.remove('hidden');
    const actions = appEl.querySelector('#detailOwnerActions');
    actions.classList.remove('hidden');
    appEl.querySelector('#markSoldBtn').addEventListener('click', async () => {
      try {
        await apiFetch(`${API.listings}/${id}/sold`, { method: 'PATCH' });
        showToast('Marked as sold');
        render();
      } catch (err) {
        showToast(err.message, true);
      }
    });
    appEl.querySelector('#deleteListingBtn').addEventListener('click', async () => {
      if (!confirm('Delete this listing? This cannot be undone.')) return;
      try {
        await fetch(`${API.listings}/${id}`, { method: 'DELETE' });
        showToast('Listing deleted');
        navigate('#/browse');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  } else if (!listing.is_sold) {
    if (!auth) {
      appEl.querySelector('#detailBuyLoginPrompt').classList.remove('hidden');
    } else if (getMode() === 'seller') {
      const note = appEl.querySelector('#detailBuyLoginPrompt');
      note.classList.remove('hidden');
      note.innerHTML = `You're in selling mode. <a href="#/choose-role">Switch to buying</a> to purchase this.`;
    } else {
      const buyerActions = appEl.querySelector('#detailBuyerActions');
      buyerActions.classList.remove('hidden');
      const buyBtn = appEl.querySelector('#buyNowBtn');

      // If this buyer's seller accepted a bargain, show their private price
      try {
        const negotiated = await apiFetch(`${API.listings}/${id}/negotiated-price/${auth.id}`);
        const priceEl = appEl.querySelector('#detailPrice');
        priceEl.innerHTML = `
          <span style="text-decoration:line-through; color:var(--ink-soft); font-size:0.7em; margin-right:8px;">${formatPrice(listing.price)}</span>
          ${formatPrice(negotiated.price)} <span style="font-size:0.55em; color:var(--ink-soft); font-weight:400;">(your negotiated price)</span>
        `;
      } catch (err) {
        // no negotiated price for this buyer — normal listing price stands, nothing to do
      }

      buyBtn.addEventListener('click', () => {
        navigate(`#/checkout-details/listing/${id}`);
      });

      const cartBtn = appEl.querySelector('#addToCartBtn');
      const wishBtn = appEl.querySelector('#addToWishlistBtn');
      const syncDetailButtons = () => {
        cartBtn.textContent = isInCart(id) ? '✓ In cart' : 'Add to cart';
        wishBtn.textContent = isInWishlist(id) ? '★ Saved' : '☆ Save for later';
      };
      syncDetailButtons();
      cartBtn.addEventListener('click', () => {
        if (isInCart(id)) {
          removeFromCart(id);
          showToast('Removed from cart');
        } else {
          addToCart(id);
          showToast('Added to cart');
        }
        syncDetailButtons();
      });
      wishBtn.addEventListener('click', () => {
        if (isInWishlist(id)) {
          removeFromWishlist(id);
          showToast('Removed from saved items');
        } else {
          addToWishlist(id);
          showToast('Saved for later');
        }
        syncDetailButtons();
      });
    }
  }

  setupChat(listing, query, isOwner);

  if (query.get('focus') === 'chat') {
    const chatCard = appEl.querySelector('#chatCard');
    if (chatCard) {
      chatCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      chatCard.focus({ preventScroll: true });
    }
  }
}

function setupChat(listing, query, isOwner) {
  const chatMessagesEl = appEl.querySelector('#chatMessages');
  const chatForm = appEl.querySelector('#chatForm');
  const chatInput = appEl.querySelector('#chatInput');
  const loginPrompt = appEl.querySelector('#chatLoginPrompt');
  const ownPrompt = appEl.querySelector('#chatOwnPrompt');
  const offerToggleBtn = appEl.querySelector('#offerToggleBtn');
  const offerForm = appEl.querySelector('#offerForm');
  const offerAmountInput = appEl.querySelector('#offerAmountInput');
  const auth = getAuth();

  if (!auth) {
    chatForm.classList.add('hidden');
    loginPrompt.classList.remove('hidden');
    return;
  }
  if (isOwner && !query.get('partner')) {
    // seller viewing their own listing with no specific buyer selected
    chatForm.classList.add('hidden');
    ownPrompt.classList.remove('hidden');
    ownPrompt.textContent = 'Reply to buyers from your Messages tab.';
    return;
  }

  const partnerId = isOwner ? query.get('partner') : listing.user_id;
  const myId = String(auth.id);

  // Only the buyer side of the conversation can propose a bargain
  if (!isOwner) {
    offerToggleBtn.classList.remove('hidden');
    offerToggleBtn.addEventListener('click', () => {
      offerForm.classList.toggle('hidden');
      if (!offerForm.classList.contains('hidden')) offerAmountInput.focus();
    });
    offerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = offerAmountInput.value;
      if (!amount || Number(amount) <= 0) return;
      try {
        await apiFetch(`${API.chat}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: String(listing.id),
            senderId: myId,
            receiverId: String(partnerId),
            text: `Offered ${formatPrice(amount)}`,
            type: 'offer',
            amount,
          }),
        });
        offerAmountInput.value = '';
        offerForm.classList.add('hidden');
        showToast('Offer sent to seller');
        loadMessages();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  async function respondToOffer(messageId, status, buyerId, amount) {
    try {
      await apiFetch(`${API.chat}/messages/${messageId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (status === 'accepted') {
        await apiFetch(`${API.listings}/${listing.id}/negotiated-price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buyerId, price: amount }),
        });
        showToast(`Offer accepted — this buyer now sees ${formatPrice(amount)}`);
      } else {
        showToast('Offer rejected');
      }
      loadMessages();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  function buildOfferBubble(m) {
    const bubble = document.createElement('div');
    const mine = String(m.senderId) === myId;
    bubble.className = `chat-bubble offer ${mine ? 'mine' : 'theirs'}`;

    bubble.innerHTML = `
      <div class="offer-label">${mine ? 'You offered' : 'Buyer offered'}</div>
      <div class="offer-amount">${formatPrice(m.amount)}</div>
    `;

    const canRespond = isOwner && !mine && m.status === 'pending';
    if (canRespond) {
      const actions = document.createElement('div');
      actions.className = 'offer-actions';
      actions.innerHTML = `
        <button class="btn btn-teal btn-accept">Accept</button>
        <button class="btn btn-outline btn-danger btn-reject">Reject</button>
      `;
      actions.querySelector('.btn-accept').addEventListener('click', () =>
        respondToOffer(m._id, 'accepted', m.senderId, m.amount)
      );
      actions.querySelector('.btn-reject').addEventListener('click', () =>
        respondToOffer(m._id, 'rejected', m.senderId, m.amount)
      );
      bubble.appendChild(actions);
    } else {
      const badge = document.createElement('span');
      badge.className = `offer-status-badge ${m.status}`;
      badge.textContent = m.status;
      bubble.appendChild(badge);
    }

    return bubble;
  }

  async function loadMessages() {
    try {
      const messages = await apiFetch(
        `${API.chat}/messages/${listing.id}/${myId}/${partnerId}`
      );
      chatMessagesEl.innerHTML = '';
      messages.forEach(m => {
        if (m.type === 'offer') {
          chatMessagesEl.appendChild(buildOfferBubble(m));
          return;
        }
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + (String(m.senderId) === myId ? 'mine' : 'theirs');
        bubble.textContent = m.text;
        chatMessagesEl.appendChild(bubble);
      });
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    } catch (err) {
      // stay quiet on poll errors, only surface on first load
    }
  }

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    try {
      await apiFetch(`${API.chat}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: String(listing.id),
          senderId: myId,
          receiverId: String(partnerId),
          text,
        }),
      });
      chatInput.value = '';
      loadMessages();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  loadMessages();
  chatPollTimer = setInterval(loadMessages, 4000);
}

// ============================================================
// MESSAGES VIEW
// ============================================================

async function renderMessages() {
  appEl.innerHTML = '';
  appEl.appendChild(clone('tpl-messages'));

  const auth = getAuth();
  const listEl = appEl.querySelector('#conversationsList');
  const emptyEl = appEl.querySelector('#messagesEmpty');
  const loginPromptEl = appEl.querySelector('#messagesLoginPrompt');

  if (!auth) {
    loginPromptEl.classList.remove('hidden');
    return;
  }

  try {
    const conversations = await apiFetch(`${API.chat}/conversations/${auth.id}`);
    if (conversations.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    conversations.forEach(c => {
      const row = document.createElement('a');
      row.className = 'conversation-row';
      row.href = `#/listing/${c.listingId}?partner=${encodeURIComponent(c.partner)}`;
      row.innerHTML = `
        <div class="conversation-main">
          <span class="conversation-partner">Conversation about listing #${escapeHtml(c.listingId)}</span>
          <span class="conversation-last">${escapeHtml(c.lastMessage)}</span>
        </div>
        <span class="conversation-arrow">→</span>
      `;
      listEl.appendChild(row);
    });
  } catch (err) {
    showToast(err.message, true);
  }
}

// ============================================================
// CHECKOUT DETAILS (delivery + contact, before payment)
// ============================================================

// Remembers a buyer's last-used phone + address (not their name — that
// always comes fresh from their account) so repeat purchases don't require
// retyping delivery info every time.
function getSavedShipping() {
  try {
    return JSON.parse(localStorage.getItem('tagg_shipping') || 'null');
  } catch {
    return null;
  }
}
function saveShipping(phone, address) {
  localStorage.setItem('tagg_shipping', JSON.stringify({ phone, address }));
}

async function renderCheckoutDetails({ type, listingId }) {
  const auth = getAuth();
  if (!auth) {
    appEl.innerHTML = `
      <section class="view">
        <p class="empty-state">You need to <a href="#/auth">log in</a> before checking out.</p>
      </section>`;
    return;
  }
  if (getMode() === 'seller') {
    appEl.innerHTML = `
      <section class="view">
        <p class="empty-state">
          You're currently in selling mode. <a href="#/choose-role">Switch to buying</a> to check out.
        </p>
      </section>`;
    return;
  }

  // Resolve the item(s) being bought and their effective (possibly
  // negotiated) price, the same way the cart and listing-detail pages do.
  async function withEffectivePrice(listing) {
    let effectivePrice = Number(listing.price);
    try {
      const negotiated = await apiFetch(`${API.listings}/${listing.id}/negotiated-price/${auth.id}`);
      effectivePrice = Number(negotiated.price);
    } catch {
      // no negotiated price for this buyer — normal listing price stands
    }
    return { ...listing, effectivePrice };
  }

  let items = [];
  try {
    if (type === 'listing') {
      const listing = await apiFetch(`${API.listings}/${listingId}`);
      if (listing.is_sold) {
        appEl.innerHTML = `<section class="view"><p class="empty-state">Sorry, that listing was just sold.</p></section>`;
        return;
      }
      if (String(listing.user_id) === String(auth.id)) {
        appEl.innerHTML = `<section class="view"><p class="empty-state">That's your own listing — you can't buy it.</p></section>`;
        return;
      }
      items = [await withEffectivePrice(listing)];
    } else {
      const ids = getCartIds();
      const results = await Promise.all(ids.map(async cid => {
        try {
          const listing = await apiFetch(`${API.listings}/${cid}`);
          if (listing.is_sold) return null;
          return await withEffectivePrice(listing);
        } catch {
          return null;
        }
      }));
      items = results.filter(Boolean);
      if (items.length === 0) {
        appEl.innerHTML = `<section class="view"><p class="empty-state">Your cart is empty — <a href="#/cart">go back to your cart</a>.</p></section>`;
        return;
      }
    }
  } catch (err) {
    appEl.innerHTML = `<section class="view"><p class="empty-state">${escapeHtml(err.message)}</p></section>`;
    return;
  }

  appEl.innerHTML = '';
  appEl.appendChild(clone('tpl-checkout-details'));

  const summaryEl = appEl.querySelector('#checkoutSummary');
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'checkout-summary-row';
    row.innerHTML = `
      <div class="checkout-summary-media">
        ${item.image_url ? `<img src="${item.image_url}" alt="">` : `<div class="tag-card-noimg">No photo</div>`}
      </div>
      <span class="checkout-summary-title">${escapeHtml(item.title)}</span>
      <span class="checkout-summary-price">${formatPrice(item.effectivePrice)}</span>
    `;
    summaryEl.appendChild(row);
  });
  const total = items.reduce((sum, l) => sum + Number(l.effectivePrice), 0);
  const totalRow = document.createElement('div');
  totalRow.className = 'checkout-summary-total';
  totalRow.innerHTML = `<span>Total</span><span class="checkout-summary-price">${formatPrice(total)}</span>`;
  summaryEl.appendChild(totalRow);

  const form = appEl.querySelector('#checkoutDetailsForm');
  const errorEl = appEl.querySelector('#checkoutDetailsError');
  const submitBtn = appEl.querySelector('#checkoutDetailsSubmit');
  const addressField = appEl.querySelector('#addressField');
  const addressInput = form.elements.buyerAddress;
  const pickupField = appEl.querySelector('#pickupField');
  const pickupSelect = appEl.querySelector('#pickupLocationSelect');
  const messageSellerLink = appEl.querySelector('#messageSellerLink');

  // Pickup only makes sense for a single-seller purchase, and only if that
  // seller listed at least one pickup spot when they posted the item.
  const pickupLocations = (type === 'listing')
    ? [items[0].pickup_location_1, items[0].pickup_location_2, items[0].pickup_location_3].filter(Boolean)
    : [];

  if (pickupLocations.length === 0) {
    // No pickup spots to offer (or this is a multi-item cart checkout) —
    // hide the choice entirely and keep the delivery-only flow.
    appEl.querySelector('#deliveryMethodChoice').classList.add('hidden');
  } else {
    pickupSelect.innerHTML = pickupLocations
      .map(loc => `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`)
      .join('');
    messageSellerLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(`#/listing/${listingId}?focus=chat`);
    });

    form.querySelectorAll('input[name="deliveryMethod"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const isPickup = form.querySelector('input[name="deliveryMethod"]:checked').value === 'pickup';
        addressField.classList.toggle('hidden', isPickup);
        addressInput.required = !isPickup;
        addressInput.disabled = isPickup;
        pickupField.classList.toggle('hidden', !isPickup);
        pickupSelect.required = isPickup;
      });
    });
  }

  form.elements.buyerName.value = auth.name || '';
  const saved = getSavedShipping();
  if (saved) {
    form.elements.buyerPhone.value = saved.phone || '';
    form.elements.buyerAddress.value = saved.address || '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    const buyerName = form.elements.buyerName.value.trim();
    const buyerPhone = form.elements.buyerPhone.value.trim();
    const isPickup = pickupLocations.length > 0 &&
      form.querySelector('input[name="deliveryMethod"]:checked').value === 'pickup';
    const buyerAddress = addressInput.value.trim();
    const pickupLocation = pickupSelect.value;

    if (!buyerName || !buyerPhone) {
      errorEl.textContent = 'Please fill in your name and phone number.';
      return;
    }
    if (isPickup && !pickupLocation) {
      errorEl.textContent = 'Please choose a pickup spot.';
      return;
    }
    if (!isPickup && !buyerAddress) {
      errorEl.textContent = 'Please fill in your delivery address.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Redirecting to payment…';
    try {
      const deliveryMethod = isPickup ? 'pickup' : 'delivery';
      const body = type === 'listing'
        ? { buyerId: auth.id, buyerName, buyerPhone, buyerAddress, deliveryMethod, pickupLocation: isPickup ? pickupLocation : undefined }
        : { buyerId: auth.id, listingIds: items.map(i => i.id), buyerName, buyerPhone, buyerAddress };
      const endpoint = type === 'listing'
        ? `${API.listings}/${listingId}/checkout`
        : `${API.listings}/checkout/cart`;

      const { url } = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!isPickup) saveShipping(buyerPhone, buyerAddress);
      window.location.href = url;
    } catch (err) {
      errorEl.textContent = err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue to payment';
    }
  });
}

// ============================================================
// CHECKOUT SUCCESS (Stripe redirects here after payment)
// ============================================================

async function renderCheckoutSuccess(query) {
  appEl.innerHTML = '';
  appEl.appendChild(clone('tpl-checkout-success'));
  const statusEl = appEl.querySelector('#checkoutStatus');

  const sessionId = query.get('session_id');
  const listingId = query.get('listingId');

  if (!sessionId) {
    statusEl.innerHTML = `
      <h1 class="page-title">Something's missing</h1>
      <p class="page-sub">No checkout session was found. If you completed a payment, check your Orders tab.</p>
      <a href="#/browse" class="btn btn-outline">Back to browse</a>
    `;
    return;
  }

  try {
    const { listings } = await apiFetch(`${API.listings}/orders/confirm?session_id=${encodeURIComponent(sessionId)}`);

    // Whatever just got paid for is no longer "in the cart" — clear those
    // ids out of local storage regardless of which flow (Buy now vs cart
    // checkout) put them there.
    const paidIds = listings.map(l => String(l.id));
    writeIdList(cartKey(), getCartIds().filter(id => !paidIds.includes(id)));
    writeIdList(wishlistKey(), getWishlistIds().filter(id => !paidIds.includes(id)));

    const total = listings.reduce((sum, l) => sum + Number(l.price), 0);
    const itemsHtml = listings.map(l => `
      <div class="cart-item-row" style="margin-bottom:8px;">
        <a href="#/listing/${l.id}" class="cart-item-media">
          ${l.image_url ? `<img src="${l.image_url}" alt="">` : `<div class="tag-card-noimg">No photo</div>`}
        </a>
        <div class="cart-item-body">
          <a href="#/listing/${l.id}" class="cart-item-title">${escapeHtml(l.title)}</a>
          <span class="cart-item-price">${formatPrice(l.price)}</span>
        </div>
      </div>
    `).join('');

    statusEl.innerHTML = `
      <h1 class="page-title">Payment successful</h1>
      <p class="page-sub">${listings.length > 1 ? `You bought ${listings.length} items` : 'You bought'} for a total of ${formatPrice(total)}.</p>
      <div class="cart-items-list">${itemsHtml}</div>
      <div class="detail-actions">
        <a href="#/orders" class="btn btn-primary">See your orders</a>
      </div>
    `;
  } catch (err) {
    statusEl.innerHTML = `
      <h1 class="page-title">Couldn't confirm payment</h1>
      <p class="page-sub">${escapeHtml(err.message)}</p>
      <a href="#/listing/${listingId || ''}" class="btn btn-outline">Back to listing</a>
    `;
  }
}

// ============================================================
// ORDERS VIEW
// ============================================================

async function renderOrders() {
  appEl.innerHTML = '';
  appEl.appendChild(clone('tpl-orders'));

  const auth = getAuth();
  if (!auth) {
    appEl.querySelector('#ordersLoginPrompt').classList.remove('hidden');
    return;
  }

  const mode = getMode();
  const subheads = appEl.querySelectorAll('.orders-subhead');
  const purchasesSubhead = subheads[0];
  const salesSubhead = subheads[1];
  const purchasesList = appEl.querySelector('#purchasesList');
  const purchasesEmpty = appEl.querySelector('#purchasesEmpty');
  const salesList = appEl.querySelector('#salesList');
  const salesEmpty = appEl.querySelector('#salesEmpty');

  // Only show the half of Orders that matches the current mode
  if (mode === 'seller') {
    purchasesSubhead.classList.add('hidden');
    purchasesList.classList.add('hidden');
    purchasesEmpty.classList.add('hidden');
  } else {
    salesSubhead.classList.add('hidden');
    salesList.classList.add('hidden');
    salesEmpty.classList.add('hidden');
  }

  function buildOrderRow(order, label) {
    const row = document.createElement('a');
    row.className = 'conversation-row';
    row.href = `#/listing/${order.listing_id}`;
    const deliveryHtml = (label === 'Sold' && order.buyer_name)
      ? (order.delivery_method === 'pickup'
          ? `<div class="order-delivery-info">Pickup: ${escapeHtml(order.buyer_name)} · ${escapeHtml(order.buyer_phone || '')} · at ${escapeHtml(order.pickup_location || '')}</div>`
          : `<div class="order-delivery-info">Ship to: ${escapeHtml(order.buyer_name)} · ${escapeHtml(order.buyer_phone || '')} · ${escapeHtml(order.buyer_address || '')}</div>`)
      : '';
    row.innerHTML = `
      <div class="conversation-main">
        <span class="conversation-partner">${escapeHtml(order.title)}</span>
        <span class="conversation-last">${label} — ${formatPrice(order.amount)}</span>
        ${deliveryHtml}
      </div>
      <span class="conversation-arrow">→</span>
    `;
    return row;
  }

  try {
    if (mode === 'seller') {
      const earnings = await apiFetch(`${API.listings}/orders/earnings/${auth.id}`);
      const earningsStrip = document.createElement('div');
      earningsStrip.className = 'stat-strip';
      earningsStrip.innerHTML = `
        <div class="stat-card">
          <div class="stat-card-label">Total earned</div>
          <div class="stat-card-value">${formatPrice(earnings.total)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Items sold</div>
          <div class="stat-card-value">${earnings.count}</div>
        </div>
      `;
      salesSubhead.insertAdjacentElement('beforebegin', earningsStrip);

      const sales = await apiFetch(`${API.listings}/orders/selling/${auth.id}`);
      if (sales.length === 0) {
        salesEmpty.classList.remove('hidden');
      } else {
        sales.forEach(o => salesList.appendChild(buildOrderRow(o, 'Sold')));
      }
    } else {
      const purchases = await apiFetch(`${API.listings}/orders/mine/${auth.id}`);
      if (purchases.length === 0) {
        purchasesEmpty.classList.remove('hidden');
      } else {
        purchases.forEach(o => purchasesList.appendChild(buildOrderRow(o, 'Bought')));
      }
    }
  } catch (err) {
    showToast(err.message, true);
  }
}
