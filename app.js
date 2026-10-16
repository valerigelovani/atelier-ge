const SUPABASE_URL = 'https://qcmelnjczbekwtcempxq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OTJ1pzTmKXV4Ii6M-Zx7LQ__tQt4zgR';

// Initial fallback data (synced with Supabase on load)
let products = [
  {
    id: 'prod-1',
    title: 'ოვერსაიზ შალის პალტო (Double-Breasted)',
    brand: 'ZARA STUDIO',
    price: 349,
    originalPrice: 450,
    category: 'women',
    sizes: ['XS', 'S', 'M', 'L'],
    condition: 'ახალი (იარლიყით)',
    images: [
      'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&w=900&q=80',
    ],
    description: 'პრემიუმ ხარისხის იტალიური შალის ნაზავისგან შექმნილი ოვერსაიზ პალტო.',
    color: 'კრემისფერი / ბეჟი',
    material: '75% შალი, 25% პოლიამიდი',
    rating: 4.9,
    reviewsCount: 42,
    isNewArrival: true,
  },
  {
    id: 'prod-2',
    title: 'ტყავის ბომბერი ვინტაჟური ეფექტით',
    brand: 'MASSIMO DUTTI',
    price: 420,
    originalPrice: 560,
    category: 'men',
    sizes: ['M', 'L', 'XL'],
    condition: 'ახალი (იარლიყით)',
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80'],
    description: '100% ნატურალური რბილი ტყავის ქურთუკი მინიმალისტური დიზაინით.',
    color: 'შავი ესპრესო',
    material: '100% ნატურალური ტყავი',
    rating: 4.8,
    reviewsCount: 29,
    isNewArrival: true,
  },
];


let favorites = JSON.parse(localStorage.getItem('atelier_web_favs') || '[]');
let cart = JSON.parse(localStorage.getItem('atelier_web_cart') || '[]');
let dbProducts = []; // every product row in the database, including hidden ones (admin panel)
let orders = [];
let chatMessages = [];

localStorage.removeItem('atelier_web_user');
let currentUser = JSON.parse(localStorage.getItem('atelier_web_user_v2') || 'null') || {
  name: '',
  email: '',
  phone: '',
  city: 'თბილისი',
  address: '',
  role: 'customer',
  isLoggedIn: false,
};

// Supabase Auth session (access/refresh tokens). Admin rights are decided by the
// database (public.is_admin() + RLS), never by anything stored in the browser.
let authSession = JSON.parse(localStorage.getItem('atelier_auth_session') || 'null');

function saveAuthSession(data) {
  authSession = data
    ? {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
        user: { id: data.user?.id, email: data.user?.email, isAnonymous: Boolean(data.user?.is_anonymous) },
      }
    : null;
  if (authSession) localStorage.setItem('atelier_auth_session', JSON.stringify(authSession));
  else localStorage.removeItem('atelier_auth_session');
}

async function authRequest(path, body, token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {}
  return { ok: res.ok, status: res.status, data };
}

// Guests get an anonymous Supabase session so they can chat without registering;
// RLS still limits them to their own messages.
function isGuestSession() {
  return Boolean(authSession && authSession.user.isAnonymous);
}

async function ensureGuestSession() {
  if (authSession) return true;
  const res = await authRequest('signup', { data: {} }).catch(() => ({ ok: false }));
  if (!res.ok || !res.data?.access_token) return false;
  saveAuthSession(res.data);
  return true;
}

let refreshPromise = null;
async function getAccessToken() {
  if (!authSession) return null;
  if (authSession.expires_at - 60 > Date.now() / 1000) return authSession.access_token;
  if (!refreshPromise) {
    refreshPromise = authRequest('token?grant_type=refresh_token', {
      refresh_token: authSession.refresh_token,
    })
      .then((r) => {
        if (r.ok && r.data?.access_token) saveAuthSession(r.data);
        else if (r.status >= 400 && r.status < 500) logoutLocal();
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  await refreshPromise;
  return authSession ? authSession.access_token : null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMPTY_USER = {
  name: '',
  email: '',
  phone: '',
  city: 'თბილისი',
  address: '',
  role: 'customer',
  isLoggedIn: false,
};

let filterState = {
  category: 'all',
  size: '',
  maxPrice: '',
  search: '',
  sort: 'featured',
};

// Supabase REST helper
async function sbFetch(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {}
  return { ok: res.ok, status: res.status, data };
}

let seenMessageIds = new Set();
let seenOrderIds = new Set();
let initialSyncDone = false;
let lastAdminFingerprint = '';
let lastProductsSig = '';

function playNotifChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

function showToast(msg, onClickAction = null, duration = 3200) {
  const el = document.getElementById('toastBanner');
  el.textContent = msg;
  el.style.cursor = onClickAction ? 'pointer' : 'default';
  el.onclick = onClickAction
    ? () => {
        el.classList.add('hidden');
        onClickAction();
      }
    : null;
  el.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

function saveLocalState() {
  localStorage.setItem('atelier_web_favs', JSON.stringify(favorites));
  localStorage.setItem('atelier_web_cart', JSON.stringify(cart));
  localStorage.setItem('atelier_web_user_v2', JSON.stringify(currentUser));
  updateBadges();
}

function updateBadges() {
  document.getElementById('favCountBadge').textContent = favorites.length;
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
  document.getElementById('cartCountBadge').textContent = totalQty;
  document.getElementById('drawerCartCount').textContent = totalQty;
  document.getElementById('headerUserName').textContent = currentUser.isLoggedIn
    ? currentUser.name
    : 'შესვლა';

  const isAdmin = Boolean(currentUser.isLoggedIn && currentUser.role === 'seller_admin');
  const adminBtn = document.getElementById('openAdminBtn');
  const heroAddBtn = document.getElementById('heroAddProdBtn');
  if (adminBtn) {
    adminBtn.classList.toggle('hidden', !isAdmin);
    const alerts = isAdmin ? adminUnreadTotal() : 0;
    adminBtn.innerHTML =
      alerts > 0
        ? `მართვა <span style="background:#dc2626;color:#fff;padding:1px 6px;border-radius:99px;font-size:10px;margin-left:4px;">${alerts}</span>`
        : 'მართვა';
  }
  if (heroAddBtn) heroAddBtn.classList.toggle('hidden', !isAdmin);
}

// Load live data from Supabase
async function loadFromSupabase() {
  try {
    const loggedIn = Boolean(authSession && currentUser.isLoggedIn);
    const empty = Promise.resolve({ ok: true, data: [] });
    const [prodRes, ordRes, msgRes] = await Promise.all([
      sbFetch('products?select=*&order=created_at.desc'),
      loggedIn ? sbFetch('orders?select=*&order=created_at.desc') : empty,
      authSession ? sbFetch('messages?select=*&order=created_at.asc') : empty,
    ]);

    const isAdmin = Boolean(currentUser.isLoggedIn && currentUser.role === 'seller_admin');

    const productsSig = prodRes.ok && Array.isArray(prodRes.data) ? JSON.stringify(prodRes.data) : null;
    if (productsSig !== null && productsSig !== lastProductsSig) {
      lastProductsSig = productsSig;
      dbProducts = prodRes.data.map((r) => ({
        id: r.id,
        title: r.title,
        brand: r.brand,
        price: Number(r.price),
        originalPrice: r.original_price ? Number(r.original_price) : undefined,
        category: r.category,
        sizes: r.sizes || ['M'],
        condition: r.condition || 'ახალი (იარლიყით)',
        images: r.images || [],
        description: r.description || '',
        color: r.color || 'შავი',
        material: r.material || '100% ბამბა',
        rating: Number(r.rating || 4.9),
        reviewsCount: Number(r.reviews_count || 12),
        isNewArrival: r.is_new_arrival ?? true,
        inStock: r.in_stock ?? true,
        rawColor: r.color || '',
        rawMaterial: r.material || '',
      }));

      // Storefront shows only products marked "in stock"; keeps demo items if the DB is empty.
      if (dbProducts.length > 0) {
        products = dbProducts.filter((p) => p.inStock !== false);
        renderCatalog();
        renderHome();
        updateBadges();
      }
    }

    if (ordRes.ok && Array.isArray(ordRes.data)) {
      if (initialSyncDone && isAdmin) {
        ordRes.data.forEach((o) => {
          if (!seenOrderIds.has(o.id)) {
            playNotifChime();
            showToast(
              `🔔 ახალი შეკვეთა #${o.id} (${o.total} ₾) — დააჭირე სანახავად`,
              () => openAdminPanel('orders', { order: o.id }),
              6000
            );
          }
        });
      }
      ordRes.data.forEach((o) => seenOrderIds.add(o.id));
      orders = ordRes.data;
    }

    if (msgRes.ok && Array.isArray(msgRes.data)) {
      if (initialSyncDone) {
        msgRes.data.forEach((m) => {
          if (!seenMessageIds.has(m.id)) {
            if (isAdmin && m.sender === 'user') {
              playNotifChime();
              showToast(
                `💬 ახალი მესიჯი: "${messageBody(m)}" — დააჭირე საპასუხოდ`,
                () => openAdminPanel('chat', { thread: m.user_id }),
                6000
              );
            } else if (!isAdmin && m.sender === 'store') {
              playNotifChime();
              showToast(
                `💬 ახალი პასუხი ATELIER-ისგან: "${m.text}"`,
                () => {
                  document.getElementById('chatWindow').classList.remove('hidden');
                  renderChatMessages();
                },
                5500
              );
            }
          }
        });
      }
      msgRes.data.forEach((m) => seenMessageIds.add(m.id));
      chatMessages = msgRes.data;
      renderChatMessages();
    }

    if (isAdmin) {
      const fingerprint = `${orders.map((o) => o.id + o.status).join()}|${chatMessages.length}|${dbProducts.length}`;
      if (fingerprint !== lastAdminFingerprint) {
        lastAdminFingerprint = fingerprint;
        refreshAdminDrawerIfOpen();
      }
      updateBadges();
    }

    initialSyncDone = true;
  } catch (e) {
    console.warn('Using local fallback', e);
  }
}


// ===================== Home page sections =====================
const unsplash = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
const DEFAULT_HOME = {
  hero: {
    eyebrow: 'AUTUMN / WINTER ’26 • NEW COLLECTION',
    title: 'მინიმალიზმი და თანამედროვე სილუეტი.',
    text: 'შერჩეული კოლექცია იტალიური შალის, ნატურალური ტყავისა და აბრეშუმისგან. შექმნილია თანამედროვე გარდერობისთვის.',
    image: unsplash('1490481651871-ab68de25d43d', 1400),
  },
  categories: {
    women: unsplash('1539533018447-63fcce2678e3', 700),
    men: unsplash('1551028719-00167b16eac5', 700),
    shoes: unsplash('1543163521-1bf539c55dd2', 700),
    accessories: unsplash('1584917865442-de89df76afd3', 700),
  },
  editorial: {
    eyebrow: 'SEASON EDIT',
    title: 'სეზონის მთავარი ნივთები',
    text: 'თბილი ქსოვილები, სუფთა ხაზები და ფერები, რომლებიც ერთმანეთს ერწყმის. შეარჩიეთ ნივთები, რომლებიც წლების განმავლობაში გემსახურებათ.',
    image: unsplash('1515886657613-9f3515b0c78f', 1400),
    button: 'კოლექციის ნახვა',
    category: 'women',
  },
};

let homeContent = mergeHome({});

function mergeHome(v) {
  return {
    hero: { ...DEFAULT_HOME.hero, ...(v.hero || {}) },
    categories: { ...DEFAULT_HOME.categories, ...(v.categories || {}) },
    editorial: { ...DEFAULT_HOME.editorial, ...(v.editorial || {}) },
  };
}

async function loadHomeContent() {
  const res = await sbFetch('site_content?key=eq.home&select=value').catch(() => null);
  if (res && res.ok && Array.isArray(res.data) && res.data[0]) {
    homeContent = mergeHome(res.data[0].value || {});
    renderHome();
  }
}

window.goToCategory = function (cat) {
  const link = document.querySelector(`.nav-link[data-cat="${cat}"]`);
  if (link) link.click();
  document.getElementById('catalogAnchor').scrollIntoView({ behavior: 'smooth' });
};

function stripCard(p) {
  const hasSale = p.originalPrice && p.originalPrice > p.price;
  return `
    <article class="strip-card" data-id="${escapeHtml(p.id)}" onclick="openProductModal(this.dataset.id)">
      <div class="strip-img">
        <img src="${escapeHtml(p.images[0] || '')}" alt="${escapeHtml(p.title)}" loading="lazy" />
        ${hasSale ? `<span class="pill-sale">-${Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}%</span>` : ''}
      </div>
      <div class="strip-brand">${escapeHtml(p.brand)}</div>
      <div class="strip-title">${escapeHtml(p.title)}</div>
      <div class="strip-price">
        <span class="${hasSale ? 'sale' : ''}">${p.price} ₾</span>
        ${hasSale ? `<s>${p.originalPrice} ₾</s>` : ''}
      </div>
    </article>`;
}

function renderStrip(sectionId, stripId, list) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.classList.toggle('hidden', list.length === 0);
  document.getElementById(stripId).innerHTML = list.map(stripCard).join('');
}

function renderHome() {
  const { hero, categories, editorial } = homeContent;

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setText('heroEyebrow', hero.eyebrow);
  setText('heroTitle', hero.title);
  setText('heroDesc', hero.text);
  const heroImg = document.getElementById('heroImg');
  if (heroImg && hero.image && heroImg.getAttribute('src') !== hero.image) heroImg.src = hero.image;

  const catBox = document.getElementById('homeCategories');
  if (catBox) {
    catBox.innerHTML = Object.entries(CATEGORY_LABELS)
      .map(([cat, label]) => {
        const count = products.filter((p) => p.category === cat).length;
        return `
        <button class="cat-tile" data-cat="${cat}" onclick="goToCategory(this.dataset.cat)">
          <span class="cat-img"><img src="${escapeHtml(categories[cat] || '')}" alt="${label}" loading="lazy" /></span>
          <span class="cat-label">${label}</span>
          <span class="cat-count">${count} მოდელი</span>
        </button>`;
      })
      .join('');
  }

  renderStrip('homeNewSection', 'homeNewStrip', products.filter((p) => p.isNewArrival).slice(0, 12));
  renderStrip(
    'homeSaleSection',
    'homeSaleStrip',
    products.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, 12)
  );

  const ed = document.getElementById('homeEditorial');
  if (ed) {
    ed.innerHTML = `
      <div class="editorial-img"><img src="${escapeHtml(editorial.image)}" alt="" loading="lazy" /></div>
      <div class="editorial-copy">
        ${editorial.eyebrow ? `<div class="hero-eyebrow">${escapeHtml(editorial.eyebrow)}</div>` : ''}
        <h2 class="editorial-title">${escapeHtml(editorial.title)}</h2>
        <p class="hero-desc">${escapeHtml(editorial.text)}</p>
        ${
          editorial.button
            ? `<button class="btn-secondary" data-cat="${escapeHtml(editorial.category)}" onclick="goToCategory(this.dataset.cat)">${escapeHtml(editorial.button)}</button>`
            : ''
        }
      </div>`;
  }
}

function renderCatalog() {
  const grid = document.getElementById('productGrid');
  const filtered = products
    .filter((p) => {
      if (filterState.category === 'sale') {
        if (!p.originalPrice || p.originalPrice <= p.price) return false;
      } else if (filterState.category !== 'all' && p.category !== filterState.category) {
        return false;
      }
      if (filterState.size && !p.sizes.includes(filterState.size)) return false;
      if (filterState.maxPrice && p.price > Number(filterState.maxPrice)) return false;
      if (filterState.search) {
        const q = filterState.search.toLowerCase();
        const match =
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.color && p.color.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filterState.sort === 'price_asc') return a.price - b.price;
      if (filterState.sort === 'price_desc') return b.price - a.price;
      return 0;
    });

  document.getElementById('productsCountText').textContent = `${filtered.length} მოდელი`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
      <h3>მოდელები ვერ მოიძებნა</h3>
      <p class="muted-text" style="margin-top:6px;">სცადეთ სხვა ფილტრი ან საძიებო სიტყვა</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered
    .map((p) => {
      const isFav = favorites.includes(p.id);
      const hasSale = p.originalPrice && p.originalPrice > p.price;
      const discountPct = hasSale
        ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
        : 0;
      return `
      <article class="prod-card" onclick="openProductModal('${p.id}')">
        <div class="prod-img-wrap">
          <img src="${p.images[0]}" alt="${p.title}" loading="lazy" />
          <div class="prod-badges">
            ${hasSale ? `<span class="pill-sale">-${discountPct}%</span>` : ''}
            ${!hasSale && p.isNewArrival ? `<span class="pill-new">NEW</span>` : ''}
          </div>
          <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav('${p.id}')" aria-label="Favorite">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
          <button class="card-quick-add" onclick="event.stopPropagation(); addToBag('${p.id}', '${p.sizes[0] || 'M'}')">
            + კალათაში (${p.sizes[0] || 'M'})
          </button>
        </div>
        <div class="prod-info">
          <div class="prod-brand-row">
            <span>${p.brand}</span>
            <span>${p.sizes.join(' · ')}</span>
          </div>
          <div class="prod-title-price">
            <h3 class="prod-title">${p.title}</h3>
            <div class="prod-price-row">
              <span class="prod-price ${hasSale ? 'sale' : ''}">${p.price} ₾</span>
              ${hasSale ? `<span class="prod-old-price">${p.originalPrice} ₾</span>` : ''}
            </div>
          </div>
        </div>
      </article>
    `;
    })
    .join('');
}

window.toggleFav = function (prodId) {
  if (favorites.includes(prodId)) {
    favorites = favorites.filter((id) => id !== prodId);
    showToast('წაიშალა ფავორიტებიდან');
  } else {
    favorites.push(prodId);
    showToast('დაემატა ფავორიტებში');
  }
  saveLocalState();
  renderCatalog();
};

window.addToBag = function (prodId, size) {
  const prod = products.find((p) => p.id === prodId);
  if (!prod) return;
  const existing = cart.find((i) => i.product.id === prodId && i.size === size);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ product: prod, size, quantity: 1 });
  }
  saveLocalState();
  showToast(`კალათაში დაემატა: ${prod.title} (${size})`);
};

// Product Detail Modal with AI Outfit Builder & Reviews
window.openProductModal = function (prodId) {
  const prod = products.find((p) => p.id === prodId);
  if (!prod) return;
  const backdrop = document.getElementById('productModalBackdrop');
  const content = document.getElementById('productModalContent');
  const outfitMatches = products
    .filter((p) => p.id !== prod.id && p.category !== prod.category)
    .slice(0, 2);

  let selectedSz = prod.sizes[0] || 'M';

  function renderModalInner() {
    content.innerHTML = `
      <div class="pm-grid">
        <div>
          <img src="${prod.images[0]}" class="pm-img" alt="${prod.title}" />
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;color:#71717a;letter-spacing:1.2px;text-transform:uppercase;">${prod.brand}</div>
          <h2 style="font-size:22px;font-weight:600;margin:6px 0 12px;letter-spacing:-0.3px;">${prod.title}</h2>
          <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:20px;">
            <span style="font-size:22px;font-weight:600;">${prod.price} ₾</span>
            ${prod.originalPrice ? `<span style="font-size:15px;color:#a1a1aa;text-decoration:line-through;">${prod.originalPrice} ₾</span>` : ''}
            <span style="background:#f7f7f5;border:1px solid #ebebea;padding:3px 10px;border-radius:99px;font-size:11px;color:#71717a;">${prod.condition}</span>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:12.5px;font-weight:500;">ზომა</span>
            <button class="text-btn" onclick="document.getElementById('aiStylistModalBackdrop').classList.remove('hidden')">AI ზომის კალკულატორი</button>
          </div>

          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;" id="modalSizeBtns">
            ${prod.sizes
              .map(
                (sz) => `
              <button class="size-pill ${sz === selectedSz ? 'active' : ''}" onclick="window._pickModalSize('${sz}')">${sz}</button>
            `
              )
              .join('')}
          </div>

          <div class="box-card">
            <div style="font-size:12.5px;color:#3f3f46;"><strong>ფერი:</strong> ${prod.color} &nbsp;·&nbsp; <strong>მასალა:</strong> ${prod.material}</div>
            <p style="font-size:13px;color:#71717a;margin-top:8px;line-height:1.6;">${prod.description}</p>
          </div>

          <div style="display:flex;gap:10px;margin-bottom:20px;">
            <button class="btn-primary full-w" onclick="addToBag('${prod.id}', '${selectedSz}'); document.getElementById('productModalBackdrop').classList.add('hidden')">
              კალათაში დამატება — ${prod.price} ₾
            </button>
            <button class="btn-secondary" onclick="inquireProductInChat('${prod.id}')">მიწერა</button>
          </div>

          ${
            outfitMatches.length > 0
              ? `
            <div class="box-card">
              <div style="font-size:12px;font-weight:600;margin-bottom:10px;">შეუხამე სრული ლუქი</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                ${outfitMatches
                  .map(
                    (m) => `
                  <div style="display:flex;gap:10px;align-items:center;background:#fff;padding:8px;border-radius:8px;border:1px solid #ebebea;cursor:pointer;" onclick="openProductModal('${m.id}')">
                    <img src="${m.images[0]}" style="width:42px;height:54px;object-fit:cover;border-radius:4px;" />
                    <div style="overflow:hidden;">
                      <div style="font-size:11.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.title}</div>
                      <div style="font-size:12px;font-weight:600;margin-top:2px;">${m.price} ₾</div>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
              <button class="text-btn full-w" style="background:#fff;" onclick="addToBag('${prod.id}','${selectedSz}'); ${outfitMatches.map((m) => `addToBag('${m.id}','${m.sizes[0] || 'M'}');`).join('')} document.getElementById('productModalBackdrop').classList.add('hidden')">
                + სრული ლუქის დამატება (${prod.price + outfitMatches.reduce((s, i) => s + i.price, 0)} ₾)
              </button>
            </div>
          `
              : ''
          }

        </div>
      </div>
    `;
  }

  window._pickModalSize = function (sz) {
    selectedSz = sz;
    renderModalInner();
  };

  renderModalInner();
  backdrop.classList.remove('hidden');
};

window.inquireProductInChat = function (prodId) {
  const prod = products.find((p) => p.id === prodId);
  document.getElementById('productModalBackdrop').classList.add('hidden');
  document.getElementById('chatWindow').classList.remove('hidden');
  if (prod) {
    sendChatMessage(`გამარჯობა, მაინტერესებს "${prod.title}" (${prod.price} ₾) — არის მარაგში?`);
  }
};

// Shopping Bag & Checkout Drawer
function renderCartDrawer() {
  const body = document.getElementById('cartDrawerBody');
  if (cart.length === 0) {
    body.innerHTML = `<div style="text-align:center;padding:50px 10px;">
      <h4>თქვენი კალათა ცარიელია</h4>
      <p class="muted-text" style="margin-top:6px;">დაამატეთ სასურველი მოდელი კატალოგიდან</p>
    </div>`;
    return;
  }

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const promoApplied = window._webPromo === 'TBILISI20';
  const discount = promoApplied ? Math.round(subtotal * 0.2) : 0;
  const afterDisc = subtotal - discount;
  const delivery = afterDisc >= 200 ? 0 : 12;
  const total = afterDisc + delivery;

  body.innerHTML = `
    <div class="box-card" style="background:#ecfdf5;border-color:#a7f3d0;color:#065f46;font-size:12px;font-weight:700;">
      ${afterDisc >= 200 ? '🎉 გილოცავთ! მოქმედებს უფასო Express მიწოდება' : `დაამატეთ კიდევ ${200 - afterDisc} ₾ უფასო მიწოდებისთვის`}
    </div>

    <div>
      ${cart
        .map(
          (item, idx) => `
        <div class="cart-item-row">
          <img src="${item.product.images[0]}" alt="${item.product.title}" />
          <div style="flex:1;">
            <div style="font-size:10px;font-weight:800;color:#6b7280;">${item.product.brand}</div>
            <div style="font-size:13px;font-weight:700;">${item.product.title}</div>
            <div style="font-size:12px;color:#6b7280;">ზომა: ${item.size}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
              <strong>${item.product.price * item.quantity} ₾</strong>
              <div style="display:flex;align-items:center;gap:8px;">
                <button class="size-pill" onclick="changeCartQty(${idx}, -1)">-</button>
                <span style="font-size:12px;font-weight:700;">${item.quantity}</span>
                <button class="size-pill" onclick="changeCartQty(${idx}, 1)">+</button>
              </div>
            </div>
          </div>
        </div>
      `
        )
        .join('')}
    </div>

    <div class="box-card" style="margin-top:16px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
        <strong>პრომო კოდი</strong>
        <a href="#" onclick="event.preventDefault(); window._webPromo='TBILISI20'; renderCartDrawer(); showToast('TBILISI20 (-20%) გააქტიურდა!')" style="color:#e11d48;font-weight:700;">ჩასვი: TBILISI20 (-20%)</a>
      </div>
      <div style="display:flex;gap:8px;">
        <input type="text" id="promoInp" value="${window._webPromo || ''}" placeholder="TBILISI20" class="text-input" style="margin:0;" />
        <button class="btn-primary" style="padding:8px 14px;" onclick="window._webPromo=document.getElementById('promoInp').value.trim().toUpperCase(); renderCartDrawer();">OK</button>
      </div>
    </div>

    <div class="box-card">
      <strong style="font-size:12px;">მიწოდების დეტალები</strong>
      <label class="field-label" style="margin-top:10px;">სახელი და გვარი *</label>
      <input type="text" id="chkName" value="${escapeHtml(checkoutDraft.name)}" placeholder="მაგ: ნინო ბერიძე" class="text-input" oninput="checkoutDraft.name = this.value" />
      <label class="field-label">მობილურის ნომერი *</label>
      <input type="tel" id="chkPhone" value="${escapeHtml(checkoutDraft.phone)}" placeholder="5XX XX XX XX" class="text-input" oninput="checkoutDraft.phone = this.value" />
      <label class="field-label">ქალაქი *</label>
      <input type="text" id="chkCity" value="${escapeHtml(checkoutDraft.city)}" placeholder="მაგ: თბილისი" class="text-input" oninput="checkoutDraft.city = this.value" />
      <label class="field-label">მისამართი *</label>
      <input type="text" id="chkAddress" value="${escapeHtml(checkoutDraft.address)}" placeholder="ქუჩა, სახლი, ბინა" class="text-input" oninput="checkoutDraft.address = this.value" />
      <div class="muted-text" style="margin:0;font-size:12px;">💳 გადახდა ხდება ნივთის მიღებისას, კურიერთან.</div>
    </div>

    <div class="box-card">
      <div style="display:flex;justify-content:space-between;font-size:13px;"><span>ღირებულება:</span><strong>${subtotal} ₾</strong></div>
      ${discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#e11d48;"><span>ფასდაკლება (20%):</span><strong>-${discount} ₾</strong></div>` : ''}
      <div style="display:flex;justify-content:space-between;font-size:13px;"><span>მიწოდება:</span><strong>${delivery === 0 ? 'უფასო' : delivery + ' ₾'}</strong></div>
      <hr style="margin:10px 0;border:none;border-top:1px solid #e5e7eb;" />
      <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:900;"><span>სულ გადასახდელი:</span><span>${total} ₾</span></div>
      <button class="btn-primary full-w" style="margin-top:14px;" onclick="placeWebOrder(${subtotal},${discount},${delivery},${total})">
        შეკვეთის დადასტურება • ${total} ₾
      </button>
    </div>
  `;
}

window.changeCartQty = function (idx, delta) {
  cart[idx].quantity += delta;
  if (cart[idx].quantity <= 0) cart.splice(idx, 1);
  saveLocalState();
  renderCartDrawer();
};

// Checkout form values survive cart re-renders (quantity changes etc.)
let checkoutDraft = { name: '', phone: '', city: '', address: '' };
function fillCheckoutDraftFromProfile() {
  checkoutDraft = {
    name: checkoutDraft.name || currentUser.name || '',
    phone: checkoutDraft.phone || currentUser.phone || '',
    city: checkoutDraft.city || currentUser.city || 'თბილისი',
    address: checkoutDraft.address || currentUser.address || '',
  };
}

let placingOrder = false;
window.placeWebOrder = async function (subtotal, discount, deliveryFee, total) {
  if (placingOrder) return;
  const name = document.getElementById('chkName').value.trim();
  const phone = document.getElementById('chkPhone').value.trim();
  const city = document.getElementById('chkCity').value.trim();
  const address = document.getElementById('chkAddress').value.trim();

  if (!name) return showToast('შეიყვანეთ სახელი და გვარი');
  if (phone.replace(/\D/g, '').length < 9) return showToast('შეიყვანეთ სწორი მობილურის ნომერი');
  if (!city || !address) return showToast('შეიყვანეთ ქალაქი და მისამართი');
  const orderId = 'ORD-' + Date.now() + Math.floor(Math.random() * 1000);
  const now = new Date();
  const dateStr = `დღეს, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newOrder = {
    id: orderId,
    user_email: currentUser.isLoggedIn && authSession ? authSession.user.email : null,
    date: dateStr,
    items: cart,
    subtotal,
    discount,
    delivery_fee: deliveryFee,
    total,
    status: 'მუშავდება',
    address,
    city,
    customer_name: name,
    phone,
    payment_method: 'კურიერთან გადახდა',
  };

  placingOrder = true;
  const res = await sbFetch('orders', {
    method: 'POST',
    body: JSON.stringify(newOrder),
  }).catch(() => ({ ok: false }));
  placingOrder = false;

  // Keep the cart if sending failed, so the customer can just retry
  if (!res.ok) {
    showToast('შეკვეთის გაგზავნა ვერ მოხერხდა, სცადეთ თავიდან');
    return;
  }

  if (authSession) orders.unshift({ ...newOrder, user_id: authSession.user.id });
  cart = [];
  saveLocalState();
  renderCartDrawer();
  showToast(`✅ შეკვეთა #${orderId} მიღებულია! მალე დაგიკავშირდებით ნომერზე ${phone}`, null, 7000);
};

// ===================== Admin panel =====================
const ORDER_STATUSES = ['მუშავდება', 'გზაშია', 'ჩაბარებულია', 'გაუქმებულია'];
const STATUS_CLASS = {
  'მუშავდება': 'pending',
  'გზაშია': 'shipping',
  'ჩაბარებულია': 'done',
  'გაუქმებულია': 'cancelled',
};
const CATEGORY_LABELS = { women: 'ქალი', men: 'მამაკაცი', shoes: 'ფეხსაცმელი', accessories: 'აქსესუარები' };
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', 'ONE SIZE'];

let adminTab = 'overview'; // overview | orders | products | chat
let adminActiveThread = null;
let adminOrderFilter = 'all';
let adminOrderSearch = '';
let adminExpandedOrder = null;
let adminProductSearch = '';
let adminProductCat = 'all';
let adminEditingProduct = null; // null = list, 'new' or a product id = form
let adminSeen = JSON.parse(localStorage.getItem('atelier_admin_seen') || '{}');

function money(n) {
  return `${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ₾`;
}

function msgTime(m) {
  const t = new Date(m.created_at || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === new Date().toDateString()) return `დღეს, ${hm}`;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${hm}`;
}

// Customer messages are stored as "[Name] text"; show just the text.
function messageBody(m) {
  const prefix = m.sender_name ? `[${m.sender_name}] ` : '';
  return prefix && m.text.startsWith(prefix) ? m.text.slice(prefix.length) : m.text;
}

function adminChatThreads() {
  const byUser = new Map();
  const ensure = (userId) => {
    if (!byUser.has(userId)) {
      byUser.set(userId, { userId, label: '', email: '', last: 0, lastText: '', unread: 0 });
    }
    return byUser.get(userId);
  };
  chatMessages.forEach((m) => {
    if (!m.user_id) return;
    const t = ensure(m.user_id);
    const ts = msgTime(m);
    if (m.sender === 'user' && m.sender_name) t.label = m.sender_name;
    if (ts >= t.last) {
      t.last = ts;
      t.lastText = (m.sender === 'store' ? 'თქვენ: ' : '') + messageBody(m);
    }
    if (m.sender === 'user' && ts > (adminSeen[m.user_id] || 0)) t.unread += 1;
  });
  if (adminActiveThread && !byUser.has(adminActiveThread)) ensure(adminActiveThread);
  orders.forEach((o) => {
    if (o.user_id && o.user_email && byUser.has(o.user_id)) byUser.get(o.user_id).email = o.user_email;
  });
  byUser.forEach((t) => {
    if (!t.label) t.label = t.email || 'მყიდველი';
  });
  return [...byUser.values()].sort((a, b) => b.last - a.last);
}

function adminUnreadTotal() {
  return adminChatThreads().reduce((s, t) => s + t.unread, 0);
}

function markThreadSeen(userId) {
  const latest = chatMessages
    .filter((m) => m.user_id === userId)
    .reduce((mx, m) => Math.max(mx, msgTime(m)), 0);
  adminSeen[userId] = Math.max(Date.now(), latest);
  localStorage.setItem('atelier_admin_seen', JSON.stringify(adminSeen));
}

window.openAdminPanel = function (tab, opts = {}) {
  if (tab === 'products-new') {
    adminTab = 'products';
    adminEditingProduct = 'new';
  } else if (tab) {
    adminTab = tab;
    if (tab !== 'products') adminEditingProduct = null;
  }
  if (opts.thread) adminActiveThread = opts.thread;
  if (opts.order) {
    adminExpandedOrder = opts.order;
    adminOrderFilter = 'all';
    adminOrderSearch = '';
  }
  document.getElementById('authDrawerBackdrop').classList.add('hidden');
  renderAdminDrawer();
  document.getElementById('adminDrawerBackdrop').classList.remove('hidden');
};

window.setAdminTab = function (tab) {
  adminTab = tab;
  if (tab !== 'products') adminEditingProduct = null;
  renderAdminDrawer();
  document.getElementById('adminDrawerBody').scrollTop = 0;
};

// Re-render on new data without wiping what the admin is typing.
function refreshAdminDrawerIfOpen() {
  const backdrop = document.getElementById('adminDrawerBackdrop');
  if (!backdrop || backdrop.classList.contains('hidden')) return;
  if ((adminTab === 'products' && adminEditingProduct) || adminTab === 'home') return;
  const activeId = document.activeElement?.id;
  const reply = document.getElementById('admChatReplyInp')?.value;
  renderAdminDrawer();
  const replyInp = document.getElementById('admChatReplyInp');
  if (replyInp && reply) replyInp.value = reply;
  const el = activeId && document.getElementById(activeId);
  if (el) {
    el.focus();
    if (typeof el.value === 'string' && el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length);
  }
}

function renderAdminDrawer() {
  const body = document.getElementById('adminDrawerBody');
  if (adminTab === 'chat') {
    const threads = adminChatThreads();
    if (!adminActiveThread || !threads.some((t) => t.userId === adminActiveThread)) {
      adminActiveThread = threads[0]?.userId || null;
    }
    if (adminActiveThread) markThreadSeen(adminActiveThread);
  }
  const unread = adminUnreadTotal();
  const pending = orders.filter((o) => o.status === 'მუშავდება').length;
  const tabs = [
    ['overview', 'მიმოხილვა', 0],
    ['orders', 'შეკვეთები', pending],
    ['products', 'პროდუქტები', 0],
    ['chat', 'ჩატი', unread],
    ['home', 'მთავარი გვერდი', 0],
  ];
  const content = {
    overview: adminOverviewHtml,
    orders: adminOrdersHtml,
    products: adminProductsHtml,
    chat: adminChatHtml,
    home: adminHomeHtml,
  }[adminTab]();

  body.innerHTML = `
    <nav class="adm-tabs">
      ${tabs
        .map(
          ([id, label, count]) => `
        <button class="adm-tab ${adminTab === id ? 'active' : ''}" onclick="setAdminTab('${id}')">
          ${label}${count ? `<span class="adm-count">${count}</span>` : ''}
        </button>`
        )
        .join('')}
    </nav>
    ${content}
  `;

  if (adminTab === 'orders') renderAdminOrdersList();
  if (adminTab === 'products' && !adminEditingProduct) renderAdminProductsList();
  if (adminTab === 'products' && adminEditingProduct) updatePfPreview();
  if (adminTab === 'home') updateHomePreviews();
  if (adminTab === 'chat') {
    const box = document.getElementById('admChatMessages');
    if (box) box.scrollTop = box.scrollHeight;
  }
  updateBadges();
}

// ---------- Overview ----------
function adminOverviewHtml() {
  const active = orders.filter((o) => o.status !== 'გაუქმებულია');
  const revenue = active.reduce((s, o) => s + Number(o.total || 0), 0);
  const avg = active.length ? revenue / active.length : 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = active.filter((o) => new Date(o.created_at || 0) >= todayStart);
  const todayRevenue = today.reduce((s, o) => s + Number(o.total || 0), 0);
  const hidden = dbProducts.filter((p) => p.inStock === false).length;
  const unread = adminUnreadTotal();

  const sold = new Map();
  active.forEach((o) =>
    (Array.isArray(o.items) ? o.items : []).forEach((it) => {
      const p = it.product || {};
      const key = p.id || p.title;
      if (!key) return;
      const e = sold.get(key) || { title: p.title, image: (p.images || [])[0], qty: 0, revenue: 0 };
      const q = Number(it.quantity || 1);
      e.qty += q;
      e.revenue += Number(p.price || 0) * q;
      sold.set(key, e);
    })
  );
  const top = [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  const kpi = (label, value, sub) => `
    <div class="adm-kpi">
      <div class="adm-kpi-label">${label}</div>
      <div class="adm-kpi-value">${value}</div>
      ${sub ? `<div class="adm-sub">${sub}</div>` : ''}
    </div>`;

  return `
    <div class="adm-kpis">
      ${kpi('ბრუნვა', money(revenue), `${active.length} შეკვეთა`)}
      ${kpi('დღეს', money(todayRevenue), `${today.length} შეკვეთა`)}
      ${kpi('საშუალო შეკვეთა', money(avg))}
      ${kpi('პროდუქტები', dbProducts.length - hidden, hidden ? `${hidden} დამალული` : 'ყველა ჩანს')}
    </div>

    ${
      unread
        ? `<button class="adm-alert" onclick="setAdminTab('chat')">💬 ${unread} წაუკითხავი მესიჯი მყიდველებისგან <span>გახსნა →</span></button>`
        : ''
    }

    <div class="box-card">
      <h4 class="adm-h">შეკვეთები სტატუსის მიხედვით</h4>
      <div class="adm-status-grid">
        ${ORDER_STATUSES.map(
          (st) => `
          <button class="adm-status-cell" data-status="${st}" onclick="setAdminOrderFilter(this.dataset.status, true)">
            <span class="adm-badge ${STATUS_CLASS[st]}">${st}</span>
            <b>${orders.filter((o) => o.status === st).length}</b>
          </button>`
        ).join('')}
      </div>
    </div>

    <div class="box-card">
      <div class="adm-h-row">
        <h4 class="adm-h">ბოლო შეკვეთები</h4>
        <button class="adm-link" onclick="setAdminTab('orders')">ყველა →</button>
      </div>
      ${
        orders.length
          ? orders
              .slice(0, 5)
              .map(
                (o) => `
          <button class="adm-row" data-id="${escapeHtml(o.id)}" onclick="openAdminPanel('orders', { order: this.dataset.id })">
            <span><b>#${escapeHtml(o.id)}</b><span class="adm-sub"> · ${escapeHtml(o.customer_name || o.user_email || 'სტუმარი')}</span></span>
            <span class="adm-row-right">${money(o.total)} <span class="adm-badge ${STATUS_CLASS[o.status] || ''}">${escapeHtml(o.status)}</span></span>
          </button>`
              )
              .join('')
          : `<div class="adm-empty">შეკვეთები ჯერ არ არის</div>`
      }
    </div>

    <div class="box-card">
      <h4 class="adm-h">ყველაზე გაყიდვადი</h4>
      ${
        top.length
          ? top
              .map(
                (t, i) => `
          <div class="adm-row static">
            <span class="adm-row-left"><span class="adm-rank">${i + 1}</span>${t.image ? `<img src="${escapeHtml(t.image)}" alt="" />` : ''}<span class="adm-ellipsis">${escapeHtml(t.title)}</span></span>
            <span class="adm-row-right">${t.qty} ც · ${money(t.revenue)}</span>
          </div>`
              )
              .join('')
          : `<div class="adm-empty">გაყიდვები ჯერ არ არის</div>`
      }
    </div>
  `;
}

// ---------- Orders ----------
window.setAdminOrderFilter = function (status, openTab) {
  adminOrderFilter = status;
  if (openTab) setAdminTab('orders');
  else renderAdminDrawer();
};

window.toggleAdminOrder = function (id) {
  adminExpandedOrder = adminExpandedOrder === id ? null : id;
  renderAdminOrdersList();
};

function adminOrdersHtml() {
  return `
    <input type="search" id="admOrderSearch" class="text-input" placeholder="ძებნა: ნომერი, სახელი, ტელეფონი, ელ-ფოსტა, მისამართი"
      value="${escapeHtml(adminOrderSearch)}" oninput="adminOrderSearch = this.value; renderAdminOrdersList()" />
    <div class="adm-pills">
      ${['all', ...ORDER_STATUSES]
        .map((st) => {
          const count = st === 'all' ? orders.length : orders.filter((o) => o.status === st).length;
          return `<button class="size-pill ${adminOrderFilter === st ? 'active' : ''}" data-status="${st}" onclick="setAdminOrderFilter(this.dataset.status)">${st === 'all' ? 'ყველა' : st} · ${count}</button>`;
        })
        .join('')}
    </div>
    <div id="admOrdersList"></div>
  `;
}

function renderAdminOrdersList() {
  const el = document.getElementById('admOrdersList');
  if (!el) return;
  const q = adminOrderSearch.trim().toLowerCase();
  const list = orders.filter(
    (o) =>
      (adminOrderFilter === 'all' || o.status === adminOrderFilter) &&
      (!q ||
        [o.id, o.user_email, o.customer_name, o.phone, o.city, o.address].some((v) =>
          String(v || '').toLowerCase().includes(q)
        ))
  );
  el.innerHTML = list.length ? list.map(adminOrderCard).join('') : `<div class="adm-empty">შეკვეთები ვერ მოიძებნა</div>`;
}

function adminOrderCard(o) {
  const open = adminExpandedOrder === o.id;
  const id = escapeHtml(o.id);
  const items = Array.isArray(o.items) ? o.items : [];
  const qty = items.reduce((s, i) => s + Number(i.quantity || 1), 0);
  return `
    <div class="adm-order ${open ? 'open' : ''}">
      <button class="adm-order-head" data-id="${id}" onclick="toggleAdminOrder(this.dataset.id)">
        <span>
          <span class="adm-order-id">#${id}</span>
          <span class="adm-sub">${escapeHtml(formatDateTime(o.created_at) || o.date || '')} · ${escapeHtml(o.customer_name || o.user_email || 'სტუმარი')} · ${qty} ნივთი</span>
        </span>
        <span class="adm-order-right">
          <b>${money(o.total)}</b>
          <span class="adm-badge ${STATUS_CLASS[o.status] || ''}">${escapeHtml(o.status)}</span>
        </span>
      </button>
      ${
        open
          ? `
      <div class="adm-order-body">
        ${items
          .map((it) => {
            const p = it.product || {};
            return `
          <div class="adm-item">
            ${p.images && p.images[0] ? `<img src="${escapeHtml(p.images[0])}" alt="" />` : '<span class="adm-item-ph"></span>'}
            <span class="adm-item-info">
              <span class="adm-ellipsis">${escapeHtml(p.title || 'პროდუქტი')}</span>
              <span class="adm-sub">${escapeHtml(p.brand || '')} · ზომა ${escapeHtml(it.size || '-')}</span>
            </span>
            <span class="adm-item-price">${Number(it.quantity || 1)} × ${money(p.price)}</span>
          </div>`;
          })
          .join('')}

        <div class="adm-kv">
          ${o.customer_name ? `<span>მყიდველი</span><span>${escapeHtml(o.customer_name)}</span>` : ''}
          ${o.phone ? `<span>ტელეფონი</span><span><a href="tel:${escapeHtml(o.phone.replace(/[^\d+]/g, ''))}">${escapeHtml(o.phone)}</a></span>` : ''}
          ${o.user_email ? `<span>ელ-ფოსტა</span><span>${escapeHtml(o.user_email)}</span>` : ''}
          <span>მიწოდება</span><span>${escapeHtml(o.city || '')}, ${escapeHtml(o.address || '')}</span>
          <span>გადახდა</span><span>${escapeHtml(o.payment_method || '-')}</span>
          <span>ჯამი</span><span>${money(o.subtotal)}</span>
          ${Number(o.discount) ? `<span>ფასდაკლება</span><span>−${money(o.discount)}</span>` : ''}
          <span>მიწოდების ფასი</span><span>${money(o.delivery_fee)}</span>
          <span><b>სულ</b></span><span><b>${money(o.total)}</b></span>
        </div>

        <div class="adm-sub" style="margin:12px 0 6px;">სტატუსის შეცვლა</div>
        <div class="adm-pills">
          ${ORDER_STATUSES.map(
            (st) =>
              `<button class="size-pill ${o.status === st ? 'active' : ''}" data-id="${id}" data-status="${st}" onclick="changeWebOrderStatus(this.dataset.id, this.dataset.status)">${st}</button>`
          ).join('')}
        </div>

        <div class="adm-actions">
          ${
            o.user_id
              ? `<button class="text-btn" data-uid="${escapeHtml(o.user_id)}" onclick="openAdminPanel('chat', { thread: this.dataset.uid })">💬 მიწერა მყიდველს</button>`
              : ''
          }
          <button class="text-btn danger" data-id="${id}" onclick="deleteWebOrder(this.dataset.id)">შეკვეთის წაშლა</button>
        </div>
      </div>`
          : ''
      }
    </div>
  `;
}

window.changeWebOrderStatus = async function (ordId, status) {
  const ord = orders.find((o) => o.id === ordId);
  if (!ord || ord.status === status) return;
  const prev = ord.status;
  ord.status = status;
  renderAdminDrawer();

  const res = await sbFetch(`orders?id=eq.${encodeURIComponent(ordId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    ord.status = prev;
    renderAdminDrawer();
    showToast('სტატუსის შეცვლა ვერ მოხერხდა');
    return;
  }
  showToast(`შეკვეთა #${ordId}: ${status}`);
};

window.deleteWebOrder = async function (ordId) {
  if (!confirm(`წავშალო შეკვეთა #${ordId}? ამის დაბრუნება შეუძლებელია.`)) return;
  const res = await sbFetch(`orders?id=eq.${encodeURIComponent(ordId)}`, { method: 'DELETE' });
  if (!res.ok) {
    showToast('შეკვეთის წაშლა ვერ მოხერხდა');
    return;
  }
  orders = orders.filter((o) => o.id !== ordId);
  adminExpandedOrder = null;
  renderAdminDrawer();
  showToast(`შეკვეთა #${ordId} წაიშალა`);
};

// ---------- Products ----------
window.setAdminProductCat = function (cat) {
  adminProductCat = cat;
  renderAdminDrawer();
};

window.editAdminProduct = function (id) {
  adminEditingProduct = id;
  renderAdminDrawer();
  document.getElementById('adminDrawerBody').scrollTop = 0;
};

function adminProductsHtml() {
  if (adminEditingProduct) return adminProductFormHtml();
  return `
    <div class="adm-toolbar">
      <input type="search" id="admProductSearch" class="text-input" placeholder="ძებნა: დასახელება, ბრენდი"
        value="${escapeHtml(adminProductSearch)}" oninput="adminProductSearch = this.value; renderAdminProductsList()" />
      <button class="btn-primary" onclick="editAdminProduct('new')">+ ახალი</button>
    </div>
    <div class="adm-pills">
      ${['all', ...Object.keys(CATEGORY_LABELS)]
        .map((c) => {
          const count = c === 'all' ? dbProducts.length : dbProducts.filter((p) => p.category === c).length;
          return `<button class="size-pill ${adminProductCat === c ? 'active' : ''}" data-cat="${c}" onclick="setAdminProductCat(this.dataset.cat)">${c === 'all' ? 'ყველა' : CATEGORY_LABELS[c]} · ${count}</button>`;
        })
        .join('')}
    </div>
    <div id="admProductsList"></div>
  `;
}

function renderAdminProductsList() {
  const el = document.getElementById('admProductsList');
  if (!el) return;
  const q = adminProductSearch.trim().toLowerCase();
  const list = dbProducts.filter(
    (p) =>
      (adminProductCat === 'all' || p.category === adminProductCat) &&
      (!q || `${p.title} ${p.brand}`.toLowerCase().includes(q))
  );
  el.innerHTML = list.length
    ? list
        .map((p) => {
          const id = escapeHtml(p.id);
          return `
      <div class="adm-prod ${p.inStock === false ? 'is-hidden' : ''}">
        ${p.images[0] ? `<img src="${escapeHtml(p.images[0])}" alt="" />` : '<span class="adm-item-ph"></span>'}
        <div class="adm-prod-info">
          <div class="adm-ellipsis"><b>${escapeHtml(p.title)}</b></div>
          <div class="adm-sub">${escapeHtml(p.brand)} · ${CATEGORY_LABELS[p.category] || escapeHtml(p.category)} · ${escapeHtml(p.sizes.join(', '))}</div>
          <div class="adm-prod-price">${money(p.price)} ${p.originalPrice && p.originalPrice > p.price ? `<s>${money(p.originalPrice)}</s>` : ''}</div>
        </div>
        <div class="adm-prod-actions">
          <label class="adm-switch">
            <input type="checkbox" ${p.inStock !== false ? 'checked' : ''} data-id="${id}" onchange="toggleProductStock(this.dataset.id, this.checked)" />
            <span>${p.inStock !== false ? 'ჩანს' : 'დამალული'}</span>
          </label>
          <button class="text-btn" data-id="${id}" onclick="editAdminProduct(this.dataset.id)">შეცვლა</button>
          <button class="text-btn danger" data-id="${id}" onclick="deleteWebProduct(this.dataset.id)">წაშლა</button>
        </div>
      </div>`;
        })
        .join('')
    : `<div class="adm-empty">${dbProducts.length ? 'პროდუქტი ვერ მოიძებნა' : 'ბაზაში პროდუქტები ჯერ არ არის — დაამატეთ პირველი'}</div>`;
}

function adminProductFormHtml() {
  const isNew = adminEditingProduct === 'new';
  const p = isNew
    ? {
        title: '',
        brand: 'ATELIER',
        category: 'women',
        price: '',
        originalPrice: '',
        sizes: ['XS', 'S', 'M', 'L'],
        images: [],
        description: '',
        rawColor: '',
        rawMaterial: '',
        condition: 'ახალი (იარლიყით)',
        isNewArrival: true,
        inStock: true,
      }
    : dbProducts.find((x) => x.id === adminEditingProduct);
  if (!p) {
    adminEditingProduct = null;
    return adminProductsHtml();
  }
  const sizes = [...new Set([...SIZE_OPTIONS, ...p.sizes])];

  return `
    <button class="adm-link" onclick="editAdminProduct(null)">← პროდუქტების სია</button>
    <h4 class="adm-title">${isNew ? 'ახალი პროდუქტი' : 'პროდუქტის რედაქტირება'}</h4>

    <div class="box-card">
      <label class="field-label">დასახელება *</label>
      <input type="text" id="pfTitle" class="text-input" value="${escapeHtml(p.title)}" placeholder="მაგ: ტყავის ქურთუკი" />

      <div class="form-row-2">
        <div>
          <label class="field-label">ბრენდი</label>
          <input type="text" id="pfBrand" class="text-input" value="${escapeHtml(p.brand)}" />
        </div>
        <div>
          <label class="field-label">კატეგორია</label>
          <select id="pfCat" class="text-input">
            ${Object.entries(CATEGORY_LABELS)
              .map(([v, l]) => `<option value="${v}" ${p.category === v ? 'selected' : ''}>${l}</option>`)
              .join('')}
          </select>
        </div>
      </div>

      <div class="form-row-2">
        <div>
          <label class="field-label">ფასი (₾) *</label>
          <input type="number" id="pfPrice" class="text-input" min="0" step="0.01" value="${escapeHtml(p.price)}" />
        </div>
        <div>
          <label class="field-label">ძველი ფასი (ფასდაკლებისთვის)</label>
          <input type="number" id="pfOldPrice" class="text-input" min="0" step="0.01" value="${escapeHtml(p.originalPrice || '')}" />
        </div>
      </div>

      <label class="field-label">ზომები * <span class="adm-sub">(დააჭირეთ ასარჩევად)</span></label>
      <div class="adm-pills" id="pfSizes">
        ${sizes
          .map(
            (s) =>
              `<button type="button" class="size-pill ${p.sizes.includes(s) ? 'active' : ''}" data-size="${escapeHtml(s)}" onclick="this.classList.toggle('active')">${escapeHtml(s)}</button>`
          )
          .join('')}
      </div>
    </div>

    <div class="box-card">
      <label class="field-label">ფოტოების ბმულები * <span class="adm-sub">(თითო ბმული ახალ ხაზზე, პირველი მთავარია)</span></label>
      <textarea id="pfImages" class="text-input" rows="3" placeholder="https://..." oninput="updatePfPreview()">${escapeHtml(p.images.join('\n'))}</textarea>
      <div class="adm-img-preview" id="pfPreview"></div>
    </div>

    <div class="box-card">
      <div class="form-row-2">
        <div>
          <label class="field-label">ფერი</label>
          <input type="text" id="pfColor" class="text-input" value="${escapeHtml(p.rawColor)}" placeholder="მაგ: შავი" />
        </div>
        <div>
          <label class="field-label">მასალა</label>
          <input type="text" id="pfMaterial" class="text-input" value="${escapeHtml(p.rawMaterial)}" placeholder="მაგ: 100% ბამბა" />
        </div>
      </div>
      <label class="field-label">მდგომარეობა</label>
      <input type="text" id="pfCondition" class="text-input" value="${escapeHtml(p.condition)}" />
      <label class="field-label">აღწერა</label>
      <textarea id="pfDesc" class="text-input" rows="3">${escapeHtml(p.description)}</textarea>

      <label class="adm-check"><input type="checkbox" id="pfNew" ${p.isNewArrival ? 'checked' : ''} /> ახალი კოლექცია</label>
      <label class="adm-check"><input type="checkbox" id="pfStock" ${p.inStock !== false ? 'checked' : ''} /> მარაგშია (ჩანს კატალოგში)</label>
    </div>

    <div class="adm-actions end">
      <button class="btn-secondary" onclick="editAdminProduct(null)">გაუქმება</button>
      <button class="btn-primary" id="pfSaveBtn" onclick="saveAdminProduct()">${isNew ? 'გამოქვეყნება' : 'ცვლილებების შენახვა'}</button>
    </div>
  `;
}

window.updatePfPreview = function () {
  const box = document.getElementById('pfPreview');
  const inp = document.getElementById('pfImages');
  if (!box || !inp) return;
  box.innerHTML = inp.value
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .map((u) => `<img src="${escapeHtml(u)}" alt="" onerror="this.classList.add('broken')" />`)
    .join('');
};

window.saveAdminProduct = async function () {
  const val = (id) => document.getElementById(id).value.trim();
  const title = val('pfTitle');
  const price = Number(val('pfPrice'));
  const oldPrice = Number(val('pfOldPrice'));
  const images = val('pfImages')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const sizes = [...document.querySelectorAll('#pfSizes .size-pill.active')].map((b) => b.dataset.size);

  if (!title) return showToast('შეიყვანეთ დასახელება');
  if (!(price > 0)) return showToast('შეიყვანეთ სწორი ფასი');
  if (!sizes.length) return showToast('აირჩიეთ მინიმუმ ერთი ზომა');
  if (!images.length) return showToast('დაამატეთ მინიმუმ ერთი ფოტოს ბმული');
  if (images.some((u) => !/^https?:\/\//i.test(u))) return showToast('ფოტოს ბმული უნდა იწყებოდეს https://-ით');

  const row = {
    title,
    brand: val('pfBrand') || 'ATELIER',
    category: val('pfCat'),
    price,
    original_price: oldPrice > price ? oldPrice : null,
    sizes,
    images,
    color: val('pfColor') || null,
    material: val('pfMaterial') || null,
    condition: val('pfCondition') || 'ახალი (იარლიყით)',
    description: val('pfDesc'),
    is_new_arrival: document.getElementById('pfNew').checked,
    in_stock: document.getElementById('pfStock').checked,
  };

  const btn = document.getElementById('pfSaveBtn');
  btn.disabled = true;
  btn.textContent = 'ინახება...';

  const isNew = adminEditingProduct === 'new';
  const res = isNew
    ? await sbFetch('products', {
        method: 'POST',
        body: JSON.stringify({
          ...row,
          id: 'prod-' + Date.now(),
          seller_name: 'ATELIER Official Store',
          rating: 5.0,
          reviews_count: 1,
        }),
      })
    : await sbFetch(`products?id=eq.${encodeURIComponent(adminEditingProduct)}`, {
        method: 'PATCH',
        body: JSON.stringify(row),
      });

  if (!res.ok) {
    btn.disabled = false;
    btn.textContent = isNew ? 'გამოქვეყნება' : 'ცვლილებების შენახვა';
    showToast('შენახვა ვერ მოხერხდა: ' + (res.data?.message || res.status));
    return;
  }

  adminEditingProduct = null;
  await loadFromSupabase();
  renderAdminDrawer();
  showToast(isNew ? 'პროდუქტი გამოქვეყნდა ✨' : 'ცვლილებები შენახულია');
};

window.toggleProductStock = async function (id, inStock) {
  const res = await sbFetch(`products?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ in_stock: inStock }),
  });
  if (!res.ok) {
    showToast('ცვლილება ვერ შეინახა');
    renderAdminDrawer();
    return;
  }
  await loadFromSupabase();
  renderAdminDrawer();
  showToast(inStock ? 'პროდუქტი კატალოგში გამოჩნდა' : 'პროდუქტი კატალოგიდან დაიმალა');
};

window.deleteWebProduct = async function (id) {
  const p = dbProducts.find((x) => x.id === id);
  if (!confirm(`წავშალო "${p ? p.title : id}"? ამის დაბრუნება შეუძლებელია.\n\nთუ მხოლოდ დროებით გინდათ დამალვა, გამოიყენეთ "ჩანს" გადამრთველი.`)) return;
  const res = await sbFetch(`products?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    showToast('წაშლა ვერ მოხერხდა');
    return;
  }
  await loadFromSupabase();
  renderAdminDrawer();
  showToast('პროდუქტი წაიშალა');
};


// ---------- Home page content ----------
function adminHomeHtml(content = homeContent) {
  const { hero, categories, editorial } = content;
  const field = (id, label, value, opts = {}) => `
    <label class="field-label">${label}</label>
    ${
      opts.textarea
        ? `<textarea id="${id}" class="text-input" rows="3">${escapeHtml(value)}</textarea>`
        : `<input type="text" id="${id}" class="text-input" value="${escapeHtml(value)}" ${opts.image ? 'oninput="updateHomePreviews()" placeholder="https://..."' : ''} />`
    }
    ${opts.image ? `<div class="adm-img-preview" data-preview-for="${id}"></div>` : ''}`;

  return `
    <p class="adm-sub" style="margin-bottom:14px;">აქ შეცვლილი ტექსტები და ფოტოები შენახვისთანავე გამოჩნდება მთავარ გვერდზე. "ახალი კოლექციის" და "ფასდაკლებების" ზოლები პროდუქტებიდან ავტომატურად ივსება.</p>

    <div class="box-card">
      <h4 class="adm-h">მთავარი ბანერი</h4>
      ${field('hmHeroEyebrow', 'ზედა პატარა ტექსტი', hero.eyebrow)}
      ${field('hmHeroTitle', 'სათაური', hero.title)}
      ${field('hmHeroText', 'ტექსტი', hero.text, { textarea: true })}
      ${field('hmHeroImage', 'ფოტოს ბმული', hero.image, { image: true })}
    </div>

    <div class="box-card">
      <h4 class="adm-h">კატეგორიების ფოტოები</h4>
      <div class="form-row-2">
        ${Object.entries(CATEGORY_LABELS)
          .map(([cat, label]) => `<div>${field('hmCat_' + cat, label, categories[cat], { image: true })}</div>`)
          .join('')}
      </div>
    </div>

    <div class="box-card">
      <h4 class="adm-h">ფოტო-ბანერი (გვერდის შუაში)</h4>
      ${field('hmEdEyebrow', 'ზედა პატარა ტექსტი', editorial.eyebrow)}
      ${field('hmEdTitle', 'სათაური', editorial.title)}
      ${field('hmEdText', 'ტექსტი', editorial.text, { textarea: true })}
      ${field('hmEdImage', 'ფოტოს ბმული', editorial.image, { image: true })}
      <div class="form-row-2">
        <div>${field('hmEdButton', 'ღილაკის ტექსტი (ცარიელი = ღილაკის გარეშე)', editorial.button)}</div>
        <div>
          <label class="field-label">ღილაკი გახსნის</label>
          <select id="hmEdCategory" class="text-input">
            ${[...Object.entries(CATEGORY_LABELS), ['sale', 'ფასდაკლებები'], ['all', 'ყველა მოდელი']]
              .map(([v, l]) => `<option value="${v}" ${editorial.category === v ? 'selected' : ''}>${l}</option>`)
              .join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="adm-actions end">
      <button class="btn-secondary" onclick="resetHomeForm()">საწყისი ტექსტები</button>
      <button class="btn-primary" id="hmSaveBtn" onclick="saveHomeContent()">შენახვა</button>
    </div>
  `;
}

window.updateHomePreviews = function () {
  document.querySelectorAll('[data-preview-for]').forEach((box) => {
    const url = document.getElementById(box.dataset.previewFor)?.value.trim();
    box.innerHTML = /^https?:\/\//i.test(url || '')
      ? `<img src="${escapeHtml(url)}" alt="" onerror="this.classList.add('broken')" />`
      : '';
  });
};

window.resetHomeForm = function () {
  if (!confirm('ფორმაში დავაბრუნო საწყისი ტექსტები და ფოტოები? (შეინახება მხოლოდ "შენახვაზე" დაჭერის შემდეგ)')) return;
  const body = document.getElementById('adminDrawerBody');
  const tabs = body.querySelector('.adm-tabs').outerHTML;
  body.innerHTML = tabs + adminHomeHtml(mergeHome({}));
  updateHomePreviews();
};

window.saveHomeContent = async function () {
  const val = (id) => document.getElementById(id).value.trim();
  const images = ['hmHeroImage', 'hmEdImage', ...Object.keys(CATEGORY_LABELS).map((c) => 'hmCat_' + c)];
  if (images.some((id) => !/^https?:\/\//i.test(val(id)))) {
    showToast('ყველა ფოტოს ბმული უნდა იწყებოდეს https://-ით');
    return;
  }
  if (!val('hmHeroTitle') || !val('hmEdTitle')) {
    showToast('სათაურები ცარიელი არ უნდა იყოს');
    return;
  }

  const value = {
    hero: { eyebrow: val('hmHeroEyebrow'), title: val('hmHeroTitle'), text: val('hmHeroText'), image: val('hmHeroImage') },
    categories: Object.fromEntries(Object.keys(CATEGORY_LABELS).map((c) => [c, val('hmCat_' + c)])),
    editorial: {
      eyebrow: val('hmEdEyebrow'),
      title: val('hmEdTitle'),
      text: val('hmEdText'),
      image: val('hmEdImage'),
      button: val('hmEdButton'),
      category: val('hmEdCategory'),
    },
  };

  const btn = document.getElementById('hmSaveBtn');
  btn.disabled = true;
  btn.textContent = 'ინახება...';
  const res = await sbFetch('site_content?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ key: 'home', value, updated_at: new Date().toISOString() }),
  });
  btn.disabled = false;
  btn.textContent = 'შენახვა';

  if (!res.ok) {
    showToast(
      res.status === 404
        ? 'ჯერ გაუშვით supabase/003_site_content.sql Supabase-ში'
        : 'შენახვა ვერ მოხერხდა: ' + (res.data?.message || res.status)
    );
    return;
  }
  homeContent = mergeHome(value);
  renderHome();
  showToast('მთავარი გვერდი განახლდა ✨');
};

// ---------- Chat ----------
window.openAdminThread = function (userId) {
  adminActiveThread = userId;
  renderAdminDrawer();
  document.getElementById('admChatReplyInp')?.focus();
};

function adminChatHtml() {
  const threads = adminChatThreads();
  const active = threads.find((t) => t.userId === adminActiveThread);
  const msgs = chatMessages.filter((m) => m.user_id && m.user_id === adminActiveThread);

  return `
    <div class="adm-chat">
      <div class="adm-threads">
        ${
          threads.length
            ? threads
                .map(
                  (t) => `
          <button class="adm-thread ${t.userId === adminActiveThread ? 'active' : ''}" data-uid="${escapeHtml(t.userId)}" onclick="openAdminThread(this.dataset.uid)">
            <span class="adm-thread-top">
              <b class="adm-ellipsis">${escapeHtml(t.label)}</b>
              ${t.unread ? `<span class="adm-count">${t.unread}</span>` : ''}
            </span>
            <span class="adm-thread-last">${escapeHtml(t.lastText || 'ახალი მიმოწერა')}</span>
            <span class="adm-sub">${escapeHtml(t.last ? formatDateTime(t.last) : '')}</span>
          </button>`
                )
                .join('')
            : `<div class="adm-empty">მესიჯები ჯერ არ არის</div>`
        }
      </div>
      <div class="adm-conv">
        ${
          active
            ? `
          <div class="adm-conv-head">
            <b>${escapeHtml(active.label)}</b>
            ${active.email && active.email !== active.label ? `<span class="adm-sub">${escapeHtml(active.email)}</span>` : ''}
          </div>
          <div class="adm-conv-msgs" id="admChatMessages">
            ${
              msgs.length
                ? msgs
                    .map(
                      (m) => `
              <div class="adm-msg ${m.sender === 'store' ? 'store' : 'user'}">
                <div>${escapeHtml(messageBody(m))}</div>
                <div class="adm-msg-time">${escapeHtml(formatDateTime(m.created_at) || m.timestamp || '')}</div>
              </div>`
                    )
                    .join('')
                : `<div class="adm-empty">მიმოწერა ჯერ არ არის — დაწერეთ პირველი მესიჯი</div>`
            }
          </div>
          <div class="adm-reply">
            <input type="text" id="admChatReplyInp" class="text-input" placeholder="დაწერეთ პასუხი..." onkeydown="if(event.key==='Enter') sendAdminWebReply()" />
            <button class="btn-primary" onclick="sendAdminWebReply()">გაგზავნა</button>
          </div>`
            : `<div class="adm-empty">აირჩიეთ მიმოწერა მარცხნივ</div>`
        }
      </div>
    </div>
  `;
}

window.sendAdminWebReply = async function () {
  const inp = document.getElementById('admChatReplyInp');
  if (!inp || !inp.value.trim() || !adminActiveThread) return;
  const text = inp.value.trim();
  inp.value = '';

  const now = new Date();
  const replyObj = {
    id: 'msg-admin-' + Date.now(),
    thread_id: 'thread-' + adminActiveThread,
    user_id: adminActiveThread,
    sender: 'store',
    text,
    timestamp: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    product_ref: null,
  };

  chatMessages.push({ ...replyObj, created_at: now.toISOString() });
  seenMessageIds.add(replyObj.id);
  renderAdminDrawer();
  document.getElementById('admChatReplyInp')?.focus();

  const res = await sbFetch('messages', {
    method: 'POST',
    body: JSON.stringify(replyObj),
  });
  if (!res.ok) {
    chatMessages = chatMessages.filter((m) => m.id !== replyObj.id);
    renderAdminDrawer();
    const again = document.getElementById('admChatReplyInp');
    if (again) again.value = text;
    showToast('მესიჯი ვერ გაიგზავნა, სცადეთ თავიდან');
  }
};

let webAuthTab = 'login'; // 'login' | 'register'

window.switchWebAuthTab = function (tab) {
  webAuthTab = tab;
  renderAuthDrawer();
};

// User Auth Drawer
function renderAuthDrawer() {
  const body = document.getElementById('authDrawerBody');
  const isAdmin = currentUser.isLoggedIn && currentUser.role === 'seller_admin';
  const myOrders = authSession ? orders.filter((o) => o.user_id === authSession.user.id) : [];

  if (currentUser.isLoggedIn) {
    body.innerHTML = `
      <div class="box-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:16px;font-weight:600;">${escapeHtml(currentUser.name)}</div>
          <span style="font-size:10.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:${isAdmin ? '#0f0f10' : '#ebebea'};color:${isAdmin ? '#fff' : '#0f0f10'};">
            ${isAdmin ? 'ADMIN' : 'მყიდველი'}
          </span>
        </div>
        <div style="font-size:12.5px;color:#71717a;margin-top:4px;">${escapeHtml(currentUser.email)} ${currentUser.phone ? '· ' + escapeHtml(currentUser.phone) : ''}</div>
        <div style="font-size:12.5px;color:#71717a;margin-top:3px;">${escapeHtml(currentUser.city)}${currentUser.address ? ', ' + escapeHtml(currentUser.address) : ''}</div>
      </div>

      ${
        isAdmin
          ? `
        <button class="btn-primary full-w" style="margin-bottom:14px;" onclick="openAdminPanel('overview')">
          მაღაზიის მართვის პანელი
        </button>
      `
          : ''
      }

      <div class="box-card">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px;">ჩემი შეკვეთები (${myOrders.length})</div>
        ${
          myOrders.length === 0
            ? `<div class="muted-text" style="margin:0;">შეკვეთები ჯერ არ გაქვთ.</div>`
            : myOrders
                .map(
                  (o) => `
              <div style="background:#fff;padding:10px;border-radius:8px;border:1px solid #ebebea;margin-bottom:6px;font-size:12px;">
                <div style="display:flex;justify-content:space-between;font-weight:600;">
                  <span>#${escapeHtml(o.id)} · ${escapeHtml(o.total)} ₾</span>
                  <span style="color:#71717a;">${escapeHtml(o.status)}</span>
                </div>
              </div>
            `
                )
                .join('')
        }
      </div>

      <button class="btn-secondary full-w" onclick="handleWebLogout()">
        ანგარიშიდან გამოსვლა
      </button>
    `;
  } else {
    body.innerHTML = `
      <!-- Segmented Switch: შესვლა | რეგისტრაცია -->
      <div style="display:grid;grid-template-columns:1fr 1fr;background:#f7f7f5;padding:4px;border-radius:99px;border:1px solid #ebebea;margin-bottom:18px;">
        <button
          onclick="switchWebAuthTab('login')"
          style="padding:9px;border-radius:99px;border:none;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;background:${webAuthTab === 'login' ? '#0f0f10' : 'transparent'};color:${webAuthTab === 'login' ? '#fff' : '#71717a'};"
        >
          შესვლა
        </button>
        <button
          onclick="switchWebAuthTab('register')"
          style="padding:9px;border-radius:99px;border:none;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;background:${webAuthTab === 'register' ? '#0f0f10' : 'transparent'};color:${webAuthTab === 'register' ? '#fff' : '#71717a'};"
        >
          რეგისტრაცია
        </button>
      </div>

      ${
        webAuthTab === 'login'
          ? `
        <div class="box-card">
          <div style="font-size:14px;font-weight:600;margin-bottom:4px;">ანგარიშზე შესვლა</div>
          <p class="muted-text" style="font-size:12px;margin-bottom:14px;">შეიყვანეთ თქვენი ელ-ფოსტა და პაროლი</p>

          <label class="field-label">ელ-ფოსტა</label>
          <input type="email" id="loginEmail" placeholder="name@example.com" class="text-input" />

          <label class="field-label">პაროლი</label>
          <input type="password" id="loginPass" placeholder="••••••••" class="text-input" />

          <button class="btn-primary full-w" style="margin-top:4px;" onclick="handleWebLogin()">შესვლა</button>
        </div>
      `
          : `
        <div class="box-card">
          <div style="font-size:14px;font-weight:600;margin-bottom:4px;">ახალი ანგარიშის შექმნა</div>
          <p class="muted-text" style="font-size:12px;margin-bottom:14px;">შეავსეთ მონაცემები სწრაფი შეკვეთისთვის</p>

          <label class="field-label">სახელი და გვარი *</label>
          <input type="text" id="regName" placeholder="მაგ: გიორგი ბერიძე" class="text-input" />

          <label class="field-label">ელ-ფოსტა *</label>
          <input type="email" id="regEmail" placeholder="name@example.com" class="text-input" />

          <label class="field-label">მობილურის ნომერი</label>
          <input type="text" id="regPhone" placeholder="+995 555 12 34 56" class="text-input" />

          <label class="field-label">ქალაქი და მისამართი</label>
          <input type="text" id="regAddress" placeholder="თბილისი, ჭავჭავაძის 37" class="text-input" />

          <label class="field-label">პაროლი *</label>
          <input type="password" id="regPass" placeholder="მინიმუმ 6 სიმბოლო" class="text-input" />

          <button class="btn-primary full-w" style="margin-top:4px;" onclick="handleWebRegister()">რეგისტრაციის დასრულება</button>
        </div>
      `
      }
    `;
  }
}

// Loads profile + admin flag for the signed-in Supabase user.
async function loadSignedInUser() {
  if (!authSession) return false;
  const uid = authSession.user.id;
  const [profRes, adminRes] = await Promise.all([
    sbFetch(`profiles?id=eq.${encodeURIComponent(uid)}&select=*`),
    sbFetch('rpc/is_admin', { method: 'POST', body: '{}' }),
  ]);
  if (!authSession) return false; // refresh token was rejected
  const prof = profRes.ok && Array.isArray(profRes.data) ? profRes.data[0] : null;
  currentUser = {
    name: prof?.name || authSession.user.email.split('@')[0],
    email: authSession.user.email,
    phone: prof?.phone || '',
    city: prof?.city || 'თბილისი',
    address: prof?.address || '',
    role: adminRes.ok && adminRes.data === true ? 'seller_admin' : 'customer',
    isLoggedIn: true,
  };
  saveLocalState();
  return true;
}

function logoutLocal() {
  saveAuthSession(null);
  currentUser = { ...EMPTY_USER };
  orders = [];
  chatMessages = [];
  seenOrderIds = new Set();
  seenMessageIds = new Set();
  initialSyncDone = false;
  lastAdminFingerprint = '';
  saveLocalState();
}

window.handleWebLogout = async function () {
  const token = authSession?.access_token;
  logoutLocal();
  document.getElementById('adminDrawerBackdrop').classList.add('hidden');
  renderAuthDrawer();
  renderChatMessages();
  showToast('გამოხვედით ანგარიშიდან');
  if (token) authRequest('logout', {}, token).catch(() => {});
};

window.handleWebLogin = async function () {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPass').value;

  if (!email || !password) {
    showToast('შეიყვანეთ ელ-ფოსტა და პაროლი');
    return;
  }

  let res;
  try {
    res = await authRequest('token?grant_type=password', { email, password });
  } catch (e) {
    showToast('კავშირის შეცდომა, სცადეთ თავიდან');
    return;
  }
  if (!res.ok || !res.data?.access_token) {
    showToast(
      res.data?.error_code === 'email_not_confirmed'
        ? 'ჯერ დაადასტურეთ ელ-ფოსტა (შეამოწმეთ inbox)'
        : 'ელ-ფოსტა ან პაროლი არასწორია'
    );
    return;
  }

  logoutLocal();
  saveAuthSession(res.data);
  await loadSignedInUser();
  await loadFromSupabase();
  renderAuthDrawer();
  showToast(
    currentUser.role === 'seller_admin'
      ? 'შეხვედით ადმინისტრატორის სტატუსით'
      : `მოგესალმებით, ${currentUser.name}`
  );
};

window.handleWebRegister = async function () {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const phone = document.getElementById('regPhone').value.trim();
  const addr = document.getElementById('regAddress').value.trim() || 'თბილისი';
  const password = document.getElementById('regPass').value;

  if (!name || !email || !password) {
    showToast('შეავსეთ სახელი, ელ-ფოსტა და პაროლი');
    return;
  }
  if (password.length < 6) {
    showToast('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო');
    return;
  }

  // The profile row is created by a database trigger from this metadata
  // (see supabase/security.sql), so it works even before email confirmation.
  let res;
  try {
    res = await authRequest('signup', {
      email,
      password,
      data: { name, phone, city: 'თბილისი', address: addr },
    });
  } catch (e) {
    showToast('კავშირის შეცდომა, სცადეთ თავიდან');
    return;
  }
  if (!res.ok) {
    showToast(res.data?.msg || 'რეგისტრაცია ვერ მოხერხდა');
    return;
  }

  if (res.data?.access_token) {
    logoutLocal();
    saveAuthSession(res.data);
    await loadSignedInUser();
    await loadFromSupabase();
    renderAuthDrawer();
    showToast(`რეგისტრაცია დასრულდა, ${currentUser.name}`);
  } else {
    webAuthTab = 'login';
    renderAuthDrawer();
    showToast('რეგისტრაცია დასრულდა! დაადასტურეთ ელ-ფოსტა და შემდეგ შედით', null, 6000);
  }
};

// Live Chat synced with Supabase messages
let guestInfo = JSON.parse(localStorage.getItem('atelier_guest_info') || 'null') || { name: '', phone: '' };

function renderChatMessages() {
  const list = document.getElementById('chatMessagesList');
  if (!list) return;

  // Guests leave a name (and optionally a phone) with their first message
  const guestRow = document.getElementById('chatGuestRow');
  if (guestRow) {
    const showGuestRow = !currentUser.isLoggedIn && !chatMessages.some((m) => m.sender === 'user');
    guestRow.classList.toggle('hidden', !showGuestRow);
    if (showGuestRow) {
      const n = document.getElementById('chatGuestName');
      const ph = document.getElementById('chatGuestPhone');
      if (n && !n.value) n.value = guestInfo.name;
      if (ph && !ph.value) ph.value = guestInfo.phone;
    }
  }

  if (chatMessages.length === 0) {
    list.innerHTML = `<div class="msg-bubble store">გამარჯობა! 👋 კეთილი იყოს თქვენი მობრძანება ATELIER-ის ვებ-საიტზე. როგორ დაგეხმაროთ?</div>`;
    return;
  }
  list.innerHTML = chatMessages
    .map(
      (m) => `
    <div class="msg-bubble ${m.sender === 'user' ? 'user' : 'store'}">
      <div>${escapeHtml(m.sender === 'user' ? messageBody(m) : m.text)}</div>
      <div style="font-size:10px;opacity:0.65;margin-top:3px;text-align:right;">${escapeHtml(m.timestamp)}</div>
    </div>
  `
    )
    .join('');
  list.scrollTop = list.scrollHeight;
}

async function sendChatMessage(textOverride) {
  const inp = document.getElementById('chatInput');
  const rawText = (textOverride ?? inp.value).trim();
  if (!rawText) return;
  if (!textOverride) inp.value = '';

  const isAdmin = currentUser.isLoggedIn && currentUser.role === 'seller_admin';
  if (isAdmin) {
    // Admin replies go to a specific customer's thread from the admin panel
    if (!textOverride) inp.value = rawText;
    openAdminPanel('chat');
    return;
  }

  let senderName = currentUser.name;
  if (!currentUser.isLoggedIn) {
    const name = document.getElementById('chatGuestName')?.value.trim() || guestInfo.name;
    const phone = document.getElementById('chatGuestPhone')?.value.trim() || guestInfo.phone;
    guestInfo = { name, phone };
    localStorage.setItem('atelier_guest_info', JSON.stringify(guestInfo));
    senderName = `${name || 'სტუმარი'}${phone ? ' · ' + phone : ''} (სტუმარი)`;

    if (!(await ensureGuestSession())) {
      if (!textOverride) inp.value = rawText;
      showToast('მესიჯი ვერ გაიგზავნა, სცადეთ თავიდან ან შედით ანგარიშზე');
      return;
    }
  }
  const text = `[${senderName}] ${rawText}`;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const msgObj = {
    id: 'msg-web-' + Date.now(),
    thread_id: 'thread-' + authSession.user.id,
    user_id: authSession.user.id,
    sender_name: senderName,
    sender: 'user',
    text,
    timestamp: timeStr,
    product_ref: null,
  };

  chatMessages.push(msgObj);
  seenMessageIds.add(msgObj.id);
  renderChatMessages();

  const res = await sbFetch('messages', {
    method: 'POST',
    body: JSON.stringify(msgObj),
  }).catch(() => ({ ok: false }));
  if (!res.ok) {
    chatMessages = chatMessages.filter((m) => m.id !== msgObj.id);
    renderChatMessages();
    if (!textOverride) inp.value = rawText;
    showToast('მესიჯი ვერ გაიგზავნა, სცადეთ თავიდან');
  }
}

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  renderHome();
  renderCatalog();
  loadHomeContent();

  document.querySelectorAll('.strip-arrow').forEach((btn) =>
    btn.addEventListener('click', () => {
      const strip = document.getElementById(btn.dataset.strip);
      strip.scrollBy({ left: Number(btn.dataset.dir) * strip.clientWidth * 0.8, behavior: 'smooth' });
    })
  );
  if (isGuestSession()) {
    loadFromSupabase();
  } else if (authSession) {
    loadSignedInUser().then((ok) => {
      if (!ok) logoutLocal();
      loadFromSupabase();
    });
  } else {
    if (currentUser.isLoggedIn) logoutLocal(); // old pre-Supabase-Auth session
    loadFromSupabase();
  }
  updateBadges();

  // Poll Supabase every 3 seconds for real-time notifications & cross-platform sync
  setInterval(loadFromSupabase, 3000);

  // Category Nav
  document.querySelectorAll('.nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filterState.category = btn.dataset.cat;
      document.getElementById('activeCategoryTitle').textContent = btn.textContent;
      renderCatalog();
    });
  });

  // Size filter pills
  document.querySelectorAll('#sizeFilterPills .size-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sizeFilterPills .size-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filterState.size = btn.dataset.size;
      renderCatalog();
    });
  });

  document.getElementById('priceFilterSelect').addEventListener('change', (e) => {
    filterState.maxPrice = e.target.value;
    renderCatalog();
  });

  document.getElementById('sortSelect').addEventListener('change', (e) => {
    filterState.sort = e.target.value;
    renderCatalog();
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    filterState.search = e.target.value;
    renderCatalog();
  });

  // Hero buttons
  document.getElementById('heroShopSaleBtn').addEventListener('click', () => {
    document.getElementById('catalogAnchor').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('heroAddProdBtn').addEventListener('click', () => openAdminPanel('products-new'));

  // Modals & Drawers
  document.getElementById('closeProductModal').addEventListener('click', () => {
    document.getElementById('productModalBackdrop').classList.add('hidden');
  });

  document.getElementById('openAiStylistBtn').addEventListener('click', () => {
    document.getElementById('aiStylistModalBackdrop').classList.remove('hidden');
  });
  document.getElementById('closeAiStylistModal').addEventListener('click', () => {
    document.getElementById('aiStylistModalBackdrop').classList.add('hidden');
  });

  document.getElementById('calcAiSizeBtn').addEventListener('click', () => {
    const h = Number(document.getElementById('aiHeightInput').value) || 170;
    const w = Number(document.getElementById('aiWeightInput').value) || 65;
    const fit = document.getElementById('aiFitSelect').value;
    const sizes = ['XS', 'S', 'M', 'L', 'XL'];
    let idx = 2;
    if (w < 54 && h < 168) idx = 0;
    else if (w < 64) idx = 1;
    else if (w < 76) idx = 2;
    else if (w < 88) idx = 3;
    else idx = 4;
    if (fit === 'oversize' && idx < 4) idx++;
    if (fit === 'slim' && idx > 0) idx--;

    const resBox = document.getElementById('aiCalcResultBox');
    resBox.textContent = `✨ თქვენი პარამეტრებისთვის (${h} სმ, ${w} კგ) რეკომენდებული ზომაა: ${sizes[idx]}`;
    resBox.classList.remove('hidden');
  });

  document.getElementById('openCartBtn').addEventListener('click', () => {
    fillCheckoutDraftFromProfile();
    renderCartDrawer();
    document.getElementById('cartDrawerBackdrop').classList.remove('hidden');
  });
  document.getElementById('closeCartDrawer').addEventListener('click', () => {
    document.getElementById('cartDrawerBackdrop').classList.add('hidden');
  });

  document.getElementById('openAdminBtn').addEventListener('click', () =>
    openAdminPanel(adminUnreadTotal() > 0 ? 'chat' : null)
  );
  document.getElementById('closeAdminDrawer').addEventListener('click', () => {
    document.getElementById('adminDrawerBackdrop').classList.add('hidden');
  });

  document.getElementById('openAuthBtn').addEventListener('click', () => {
    renderAuthDrawer();
    document.getElementById('authDrawerBackdrop').classList.remove('hidden');
  });
  document.getElementById('closeAuthDrawer').addEventListener('click', () => {
    document.getElementById('authDrawerBackdrop').classList.add('hidden');
  });

  document.getElementById('openWishlistBtn').addEventListener('click', () => {
    filterState.category = 'all';
    showToast(`ფავორიტებში გაქვთ ${favorites.length} მოდელი ❤️`);
    document.getElementById('catalogAnchor').scrollIntoView({ behavior: 'smooth' });
  });

  // Chat Widget
  document.getElementById('toggleChatBtn').addEventListener('click', () => {
    document.getElementById('chatWindow').classList.toggle('hidden');
    renderChatMessages();
  });
  document.getElementById('closeChatWindow').addEventListener('click', () => {
    document.getElementById('chatWindow').classList.add('hidden');
  });
  document.getElementById('sendChatBtn').addEventListener('click', () => sendChatMessage());
  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });
  document.querySelectorAll('.quick-chip').forEach((chip) => {
    chip.addEventListener('click', () => sendChatMessage(chip.dataset.msg));
  });
});
