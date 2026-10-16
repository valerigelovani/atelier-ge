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

const stories = [
  {
    id: 'st-1',
    title: 'AW ’26 ლუქბუქი',
    tag: 'NEW DROP',
    img: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=400&q=80',
    prodId: 'prod-1',
  },
  {
    id: 'st-2',
    title: '-20% კოდი: TBILISI20',
    tag: 'FLASH SALE',
    img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&q=80',
    prodId: 'prod-2',
  },
  {
    id: 'st-3',
    title: 'საღამოს კაბები',
    tag: 'COS ATELIER',
    img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80',
    prodId: 'prod-3',
  },
  {
    id: 'st-4',
    title: 'ტყავის ჩანთები',
    tag: 'IT-BAGS',
    img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80',
    prodId: 'prod-5',
  },
  {
    id: 'st-5',
    title: 'ფეხსაცმლის ხაზი',
    tag: 'TRENDING',
    img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=400&q=80',
    prodId: 'prod-4',
  },
];

let favorites = JSON.parse(localStorage.getItem('atelier_web_favs') || '["prod-1","prod-5"]');
let cart = JSON.parse(localStorage.getItem('atelier_web_cart') || '[]');
let orders = [];
let chatMessages = [];
let reviews = JSON.parse(
  localStorage.getItem('atelier_web_reviews') ||
    JSON.stringify([
      {
        id: 'r1',
        productId: 'prod-1',
        userName: 'ნინი კ.',
        rating: 5,
        comment: 'საოცარი ხარისხის პალტოა! კურიერმა თბილისში 2 საათში მომიტანა.',
        size: 'S',
        date: 'გუშინ',
      },
    ])
);

localStorage.removeItem('atelier_web_user');
let currentUser = JSON.parse(
  localStorage.getItem('atelier_web_user_v2') ||
    JSON.stringify({
      name: '',
      email: '',
      phone: '',
      city: 'თბილისი',
      address: '',
      role: 'customer',
      isLoggedIn: false,
    })
);

const ADMIN_EMAILS = ['valeri@atelier.ge', 'valeri.gelovani@yahoo.com', 'admin@atelier.ge'];

let filterState = {
  category: 'all',
  size: '',
  maxPrice: '',
  search: '',
  sort: 'featured',
};

// Supabase REST helper
async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

function showToast(msg) {
  const el = document.getElementById('toastBanner');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.add('hidden'), 2800);
}

function saveLocalState() {
  localStorage.setItem('atelier_web_favs', JSON.stringify(favorites));
  localStorage.setItem('atelier_web_cart', JSON.stringify(cart));
  localStorage.setItem('atelier_web_user_v2', JSON.stringify(currentUser));
  localStorage.setItem('atelier_web_reviews', JSON.stringify(reviews));
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
  if (adminBtn) adminBtn.classList.toggle('hidden', !isAdmin);
  if (heroAddBtn) heroAddBtn.classList.toggle('hidden', !isAdmin);
}

// Load live data from Supabase
async function loadFromSupabase() {
  try {
    const [prodRes, ordRes, msgRes] = await Promise.all([
      sbFetch('products?select=*&order=created_at.desc'),
      sbFetch('orders?select=*&order=created_at.desc'),
      sbFetch('messages?select=*&order=created_at.asc'),
    ]);

    if (prodRes.ok && Array.isArray(prodRes.data) && prodRes.data.length > 0) {
      products = prodRes.data.map((r) => ({
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
      }));
      if (cart.length === 0 && products[0]) {
        cart = [{ product: products[0], size: products[0].sizes[0] || 'M', quantity: 1 }];
      }
      renderCatalog();
      renderStories();
      updateBadges();
    }

    if (ordRes.ok && Array.isArray(ordRes.data)) {
      orders = ordRes.data;
    }

    if (msgRes.ok && Array.isArray(msgRes.data)) {
      chatMessages = msgRes.data;
      renderChatMessages();
    }
  } catch (e) {
    console.warn('Using local fallback', e);
  }
}

function renderStories() {
  const strip = document.getElementById('storiesStrip');
  strip.innerHTML = stories
    .map(
      (s) => `
    <div class="story-card" onclick="openProductModal('${s.prodId}')">
      <div class="story-avatar-ring">
        <img src="${s.img}" alt="${s.title}" />
      </div>
      <div>
        <div class="story-meta-tag">${s.tag}</div>
        <div class="story-meta-title">${s.title}</div>
      </div>
    </div>
  `
    )
    .join('');
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
      if (filterState.sort === 'rating') return b.rating - a.rating;
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
  const prodReviews = reviews.filter((r) => r.productId === prod.id);
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

          <!-- Reviews -->
          <div style="margin-top:16px;">
            <div style="font-size:13px;font-weight:600;">შეფასებები (${prodReviews.length})</div>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
              ${
                prodReviews.length === 0
                  ? `<div class="muted-text">ჯერ შეფასება არ არის.</div>`
                  : prodReviews
                      .map(
                        (r) => `
                  <div style="background:#f7f7f5;padding:10px 12px;border-radius:8px;font-size:12.5px;">
                    <div style="display:flex;justify-content:space-between;font-weight:500;">
                      <span>${r.userName} · ზომა ${r.size}</span>
                      <span style="color:#71717a;">${r.rating}.0 / 5</span>
                    </div>
                    <div style="margin-top:4px;color:#52525b;">${r.comment}</div>
                  </div>
                `
                      )
                      .join('')
              }
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;">
              <input type="text" id="newRevText" placeholder="დაწერეთ შეფასება..." class="text-input" style="margin:0;flex:1;" />
              <button class="btn-primary" style="padding:8px 16px;" onclick="submitWebReview('${prod.id}', '${selectedSz}')">გაგზავნა</button>
            </div>
          </div>
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

window.submitWebReview = function (prodId, sz) {
  const inp = document.getElementById('newRevText');
  if (!inp || !inp.value.trim()) return;
  reviews.unshift({
    id: 'rev-' + Date.now(),
    productId: prodId,
    userName: currentUser.name || 'მყიდველი',
    rating: 5,
    comment: inp.value.trim(),
    size: sz,
    date: 'ახლახანს',
  });
  saveLocalState();
  openProductModal(prodId);
  showToast('შეფასება დაემატა! ⭐');
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
      <input type="text" id="chkCity" value="${currentUser.city || 'თბილისი'}" placeholder="ქალაქი" class="text-input" />
      <input type="text" id="chkAddress" value="${currentUser.address || 'ჭავჭავაძის გამზ. 37'}" placeholder="მისამართი" class="text-input" />
      <select id="chkPayment" class="text-input">
        <option value="Apple Pay">Apple Pay</option>
        <option value="TBC / BOG ბარათით">TBC / BOG ბარათით</option>
        <option value="კურიერთან გადახდა">კურიერთან გადახდა</option>
      </select>
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

window.placeWebOrder = async function (subtotal, discount, deliveryFee, total) {
  const city = document.getElementById('chkCity').value.trim() || 'თბილისი';
  const address = document.getElementById('chkAddress').value.trim() || 'ჭავჭავაძის 37';
  const paymentMethod = document.getElementById('chkPayment').value;
  const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const dateStr = `დღეს, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newOrder = {
    id: orderId,
    user_email: currentUser.email,
    date: dateStr,
    items: cart,
    subtotal,
    discount,
    delivery_fee: deliveryFee,
    total,
    status: 'მუშავდება',
    address,
    city,
    payment_method: paymentMethod,
  };

  orders.unshift(newOrder);
  cart = [];
  saveLocalState();
  renderCartDrawer();

  await sbFetch('orders', {
    method: 'POST',
    body: JSON.stringify(newOrder),
  });

  showToast(`🎉 შეკვეთა #${orderId} გაფორმდა და ჩაიწერა Supabase ბაზაში!`);
};

// Admin & Add Product Studio Drawer
function renderAdminDrawer() {
  const body = document.getElementById('adminDrawerBody');
  const totalRev = orders.reduce((s, o) => s + Number(o.total || 0), 0);

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
      <div class="box-card" style="margin:0;text-align:center;">
        <div style="font-size:18px;font-weight:900;">${totalRev} ₾</div>
        <div style="font-size:11px;color:#6b7280;">ბრუნვა</div>
      </div>
      <div class="box-card" style="margin:0;text-align:center;">
        <div style="font-size:18px;font-weight:900;">${orders.length}</div>
        <div style="font-size:11px;color:#6b7280;">შეკვეთა</div>
      </div>
      <div class="box-card" style="margin:0;text-align:center;">
        <div style="font-size:18px;font-weight:900;">${products.length}</div>
        <div style="font-size:11px;color:#6b7280;">პროდუქტი</div>
      </div>
    </div>

    <div class="box-card">
      <h4 style="margin-bottom:10px;">+ ახალი პროდუქტის დამატება (Supabase + iOS App)</h4>
      <input type="text" id="admTitle" placeholder="დასახელება (მაგ: ტყავის ქურთუკი)" class="text-input" />
      <div class="form-row-2">
        <input type="text" id="admBrand" value="ZARA STUDIO" placeholder="ბრენდი" class="text-input" />
        <select id="admCat" class="text-input">
          <option value="women">ქალი</option>
          <option value="men">მამაკაცი</option>
          <option value="shoes">ფეხსაცმელი</option>
          <option value="accessories">აქსესუარები</option>
        </select>
      </div>
      <div class="form-row-2">
        <input type="number" id="admPrice" placeholder="ფასი (₾) *" class="text-input" />
        <input type="number" id="admOldPrice" placeholder="ძველი ფასი (SALE)" class="text-input" />
      </div>
      <input type="text" id="admImg" value="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80" placeholder="ფოტოს URL" class="text-input" />
      <textarea id="admDesc" placeholder="აღწერა..." class="text-input" rows="2"></textarea>
      <button class="btn-primary full-w" onclick="publishWebProduct()">კატალოგსა და Supabase-ში გამოქვეყნება</button>
    </div>

    <div class="box-card">
      <h4 style="margin-bottom:10px;">📦 შემოსული შეკვეთების მართვა (${orders.length})</h4>
      ${
        orders.length === 0
          ? `<div class="muted-text">შეკვეთები ჯერ არ არის</div>`
          : orders
              .map(
                (o) => `
          <div style="background:#fff;padding:10px;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:8px;font-size:12px;">
            <div style="display:flex;justify-content:space-between;font-weight:800;">
              <span>#${o.id} • ${o.total} ₾</span>
              <span style="color:#059669;">${o.status}</span>
            </div>
            <div style="color:#6b7280;margin:4px 0;">📍 ${o.city}, ${o.address} (${o.payment_method})</div>
            <div style="display:flex;gap:6px;margin-top:6px;">
              ${['მუშავდება', 'გზაშია', 'ჩაბარებულია']
                .map(
                  (st) => `
                <button class="size-pill ${o.status === st ? 'active' : ''}" onclick="changeWebOrderStatus('${o.id}','${st}')">${st}</button>
              `
                )
                .join('')}
            </div>
          </div>
        `
              )
              .join('')
      }
    </div>
  `;
}

window.publishWebProduct = async function () {
  const title = document.getElementById('admTitle').value.trim();
  const brand = document.getElementById('admBrand').value.trim() || 'ATELIER';
  const category = document.getElementById('admCat').value;
  const price = Number(document.getElementById('admPrice').value);
  const orig = Number(document.getElementById('admOldPrice').value);
  const img = document.getElementById('admImg').value.trim();
  const desc = document.getElementById('admDesc').value.trim() || 'პრემიუმ მოდელი ახალი კოლექციიდან.';

  if (!title || !price) {
    showToast('გთხოვთ შეავსოთ დასახელება და ფასი');
    return;
  }

  const newId = 'prod-' + Date.now();
  const dbRow = {
    id: newId,
    title,
    brand,
    price,
    original_price: orig > price ? orig : null,
    category,
    sizes: category === 'shoes' ? ['38', '39', '40', '41', '42'] : ['XS', 'S', 'M', 'L'],
    condition: 'ახალი (იარლიყით)',
    images: [img],
    description: desc,
    color: 'შავი',
    material: 'პრემიუმ ქსოვილი',
    seller_name: 'ATELIER Official Store',
    in_stock: true,
    is_new_arrival: true,
    rating: 5.0,
    reviews_count: 1,
  };

  await sbFetch('products', {
    method: 'POST',
    body: JSON.stringify(dbRow),
  });

  await loadFromSupabase();
  renderAdminDrawer();
  showToast('პროდუქტი გამოქვეყნდა ვებ-საიტზე და iOS აპლიკაციაში! ✨');
};

window.changeWebOrderStatus = async function (ordId, status) {
  const ord = orders.find((o) => o.id === ordId);
  if (ord) ord.status = status;
  renderAdminDrawer();

  await sbFetch(`orders?id=eq.${encodeURIComponent(ordId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  showToast(`შეკვეთა #${ordId} სტატუსი განახლდა: ${status}`);
};

// User Auth Drawer
function renderAuthDrawer() {
  const body = document.getElementById('authDrawerBody');
  const isAdmin = currentUser.isLoggedIn && currentUser.role === 'seller_admin';
  const myOrders = orders.filter((o) => o.user_email === currentUser.email);

  if (currentUser.isLoggedIn) {
    body.innerHTML = `
      <div class="box-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:16px;font-weight:600;">${currentUser.name}</div>
          <span style="font-size:10.5px;font-weight:600;padding:3px 9px;border-radius:99px;background:${isAdmin ? '#0f0f10' : '#ebebea'};color:${isAdmin ? '#fff' : '#0f0f10'};">
            ${isAdmin ? 'ADMIN' : 'მყიდველი'}
          </span>
        </div>
        <div style="font-size:12.5px;color:#71717a;margin-top:4px;">${currentUser.email} ${currentUser.phone ? '· ' + currentUser.phone : ''}</div>
        <div style="font-size:12.5px;color:#71717a;margin-top:3px;">${currentUser.city}${currentUser.address ? ', ' + currentUser.address : ''}</div>
      </div>

      ${
        isAdmin
          ? `
        <button class="btn-primary full-w" style="margin-bottom:14px;" onclick="document.getElementById('authDrawerBackdrop').classList.add('hidden'); renderAdminDrawer(); document.getElementById('adminDrawerBackdrop').classList.remove('hidden');">
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
                  <span>#${o.id} · ${o.total} ₾</span>
                  <span style="color:#71717a;">${o.status}</span>
                </div>
              </div>
            `
                )
                .join('')
        }
      </div>

      <button class="btn-secondary full-w" onclick="currentUser={name:'',email:'',phone:'',city:'თბილისი',address:'',role:'customer',isLoggedIn:false}; saveLocalState(); renderAuthDrawer(); showToast('გამოხვედით ანგარიშიდან');">
        ანგარიშიდან გამოსვლა
      </button>
    `;
  } else {
    body.innerHTML = `
      <div class="box-card">
        <div style="font-size:14px;font-weight:600;margin-bottom:12px;">შესვლა / რეგისტრაცია</div>
        <input type="text" id="authName" placeholder="სახელი" class="text-input" />
        <input type="email" id="authEmail" placeholder="ელ-ფოსტა *" class="text-input" />
        <input type="text" id="authPhone" placeholder="ტელეფონი (+995 5...)" class="text-input" />
        <input type="text" id="authAddress" placeholder="მისამართი" class="text-input" />
        <input type="password" id="authPass" placeholder="პაროლი *" class="text-input" />
        <button class="btn-primary full-w" onclick="handleWebAuth()">შესვლა</button>
      </div>
    `;
  }
}

window.handleWebAuth = async function () {
  const name = document.getElementById('authName').value.trim();
  const email = document.getElementById('authEmail').value.trim().toLowerCase();
  const phone = document.getElementById('authPhone').value.trim();
  const addr = document.getElementById('authAddress').value.trim() || 'თბილისი';
  const password = document.getElementById('authPass').value.trim();

  if (!email || !password) {
    showToast('შეიყვანეთ ელ-ფოსტა და პაროლი');
    return;
  }

  const isAdminAccount = ADMIN_EMAILS.includes(email) && (password === 'admin123' || password === '4xR5AJ%NA_fQNu!');

  try {
    await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (e) {}

  currentUser = {
    name: name || (isAdminAccount ? 'ვალერი (Admin)' : email.split('@')[0]),
    email,
    phone,
    city: 'თბილისი',
    address: addr,
    role: isAdminAccount ? 'seller_admin' : 'customer',
    isLoggedIn: true,
  };
  saveLocalState();
  renderAuthDrawer();
  showToast(
    isAdminAccount
      ? 'შეხვედით ადმინისტრატორის სტატუსით'
      : `მოგესალმებით, ${currentUser.name}`
  );
};

// Live Chat synced with Supabase messages
function renderChatMessages() {
  const list = document.getElementById('chatMessagesList');
  if (!list) return;
  if (chatMessages.length === 0) {
    list.innerHTML = `<div class="msg-bubble store">გამარჯობა! 👋 კეთილი იყოს თქვენი მობრძანება ATELIER-ის ვებ-საიტზე. როგორ დაგეხმაროთ?</div>`;
    return;
  }
  list.innerHTML = chatMessages
    .map(
      (m) => `
    <div class="msg-bubble ${m.sender === 'user' ? 'user' : 'store'}">
      <div>${m.text}</div>
      <div style="font-size:10px;opacity:0.65;margin-top:3px;text-align:right;">${m.timestamp || ''}</div>
    </div>
  `
    )
    .join('');
  list.scrollTop = list.scrollHeight;
}

async function sendChatMessage(textOverride) {
  const inp = document.getElementById('chatInput');
  const text = (textOverride ?? inp.value).trim();
  if (!text) return;
  if (!textOverride) inp.value = '';

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const msgObj = {
    id: 'msg-web-' + Date.now(),
    thread_id: 'thread-store',
    sender: 'user',
    text,
    timestamp: timeStr,
    product_ref: null,
  };

  chatMessages.push(msgObj);
  renderChatMessages();

  await sbFetch('messages', {
    method: 'POST',
    body: JSON.stringify(msgObj),
  });

  setTimeout(async () => {
    const replyObj = {
      id: 'msg-web-reply-' + Date.now(),
      thread_id: 'thread-store',
      sender: 'store',
      text: 'მადლობა მოწერისთვის! მოდელი მარაგშია, შეგიძლიათ გამოიყენოთ პრომო კოდი TBILISI20 (-20%) კალათაში. 🎁',
      timestamp: timeStr,
      product_ref: null,
    };
    chatMessages.push(replyObj);
    renderChatMessages();
    await sbFetch('messages', {
      method: 'POST',
      body: JSON.stringify(replyObj),
    });
  }, 900);
}

// Event Listeners Setup
document.addEventListener('DOMContentLoaded', () => {
  renderStories();
  renderCatalog();
  updateBadges();
  loadFromSupabase();

  // Poll Supabase every 5 seconds for cross-platform sync with iOS app
  setInterval(loadFromSupabase, 5000);

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
  document.getElementById('heroAddProdBtn').addEventListener('click', () => {
    renderAdminDrawer();
    document.getElementById('adminDrawerBackdrop').classList.remove('hidden');
  });

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
    renderCartDrawer();
    document.getElementById('cartDrawerBackdrop').classList.remove('hidden');
  });
  document.getElementById('closeCartDrawer').addEventListener('click', () => {
    document.getElementById('cartDrawerBackdrop').classList.add('hidden');
  });

  document.getElementById('openAdminBtn').addEventListener('click', () => {
    renderAdminDrawer();
    document.getElementById('adminDrawerBackdrop').classList.remove('hidden');
  });
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
