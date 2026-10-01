// State Management
let allListings = [];
let activeCategory = 'used'; // 'used' or 'new'
let activeFilter = 'all';    // 'all', 'under500', 'range500_700', 'ready3kt', 'cimahi', 'margaasih'
let searchQuery = '';

// DOM Elements
const listingsContainer = document.getElementById('listingsContainer');
const tabUsed = document.getElementById('tabUsed');
const tabNew = document.getElementById('tabNew');
const usedBadge = document.getElementById('usedCountBadge');
const newBadge = document.getElementById('newCountBadge');
const filterChips = document.querySelectorAll('.filter-chip');
const searchInput = document.getElementById('searchInput');

// Lightbox Elements
const lightboxModal = document.getElementById('lightboxModal');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');

// Init
async function initApp() {
  try {
    const res = await fetch('data/listings.json');
    allListings = await res.json();
    updateBadges();
    renderListings();
    setupEvents();
  } catch (err) {
    console.error('Failed to load listings data:', err);
    listingsContainer.innerHTML = `
      <div class="empty-state">
        <p>Gagal memuat data listing rumah.</p>
        <small style="color:var(--text-dim)">Pastikan file data/listings.json tersedia.</small>
      </div>
    `;
  }
}

// Update Count Badges
function updateBadges() {
  const usedCount = allListings.filter(item => item.category === 'used').length;
  const newCount = allListings.filter(item => item.category === 'new').length;
  if (usedBadge) usedBadge.textContent = usedCount;
  if (newBadge) newBadge.textContent = newCount;
}

// Format Rupiah
function formatRp(num) {
  if (!num) return 'Rp 0';
  if (num >= 1000000000) {
    const m = (num / 1000000000).toFixed(2).replace(/\.00$/, '');
    return `Rp ${m} Miliar`;
  }
  const jt = (num / 1000000).toFixed(0);
  return `Rp ${jt} Juta`;
}

function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

// Filter Listings
function getFilteredListings() {
  return allListings.filter(item => {
    // 1. Category match
    if (item.category !== activeCategory) return false;

    // 2. Search query match
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchLoc = (item.complex + ' ' + item.subdistrict + ' ' + item.city).toLowerCase().includes(q);
      if (!matchTitle && !matchLoc) return false;
    }

    // 3. Quick chip filters
    if (activeFilter === 'under500') {
      return item.price_asking < 500000000;
    } else if (activeFilter === 'range500_700') {
      return item.price_asking >= 500000000 && item.price_asking <= 700000000;
    } else if (activeFilter === 'ready3kt') {
      return item.bedrooms >= 3;
    } else if (activeFilter === 'cimahi') {
      return (item.city + ' ' + item.subdistrict).toLowerCase().includes('cimahi');
    } else if (activeFilter === 'margaasih') {
      return (item.subdistrict + ' ' + item.complex).toLowerCase().includes('margaasih') || (item.subdistrict + ' ' + item.complex).toLowerCase().includes('nanjung');
    }

    return true;
  });
}

// Render Listings Feed
function renderListings() {
  const filtered = getFilteredListings();

  if (filtered.length === 0) {
    listingsContainer.innerHTML = `
      <div class="empty-state">
        <p style="font-size:1.1rem; font-weight:600; margin-bottom:6px;">Tidak ada rumah yang cocok</p>
        <p style="font-size:0.85rem;">Coba ganti filter atau pilih tab kategori yang lain.</p>
      </div>
    `;
    return;
  }

  listingsContainer.innerHTML = filtered.map(item => createCardHTML(item)).join('');
  attachCarouselHandlers();
}

// Create Card HTML
function createCardHTML(item) {
  const imageCount = item.images ? item.images.length : 0;
  const badgesHTML = (item.badges || []).map((badge, idx) => {
    const isSpecial = idx === 0 ? 'highlight' : (badge.includes('3 KT') || badge.includes('SHM') ? 'accent' : '');
    return `<span class="badge-tag ${isSpecial}">${badge}</span>`;
  }).join('');

  const slidesHTML = (item.images || []).map((imgUrl, idx) => `
    <div class="carousel-slide" data-index="${idx}">
      <img src="${imgUrl}" alt="${item.title} foto ${idx+1}" loading="lazy" />
    </div>
  `).join('');

  return `
    <article class="property-card" id="card-${item.id}">
      <!-- Carousel Media Header -->
      <div class="card-media" data-card-id="${item.id}" data-current="0" data-total="${imageCount}">
        <div class="card-badges-top">
          ${badgesHTML}
        </div>
        <div class="carousel-viewport">
          ${slidesHTML}
        </div>
        ${imageCount > 1 ? `
          <button class="carousel-prev" aria-label="Foto sebelumnya" onclick="prevSlide('${item.id}', event)">‹</button>
          <button class="carousel-next" aria-label="Foto selanjutnya" onclick="nextSlide('${item.id}', event)">›</button>
          <div class="carousel-counter"><span class="current-slide">1</span> / ${imageCount}</div>
        ` : ''}
      </div>

      <!-- Card Information -->
      <div class="card-body">
        <div class="price-row">
          <div class="price-main">${formatRp(item.price_asking)}</div>
          <div class="price-sub">Target Nego: <strong>${formatRp(item.price_net_estimate)}</strong></div>
        </div>

        <h2 class="property-title">${item.title}</h2>
        <div class="property-location">
          <span>📍</span>
          <span>${item.complex}, ${item.subdistrict}, ${item.city}</span>
        </div>

        <!-- Pinhome 4-Col Specs Grid -->
        <div class="specs-grid">
          <div class="spec-item">
            <span class="spec-label">Kamar Tidur</span>
            <span class="spec-value">${item.bedrooms} KT</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Kamar Mandi</span>
            <span class="spec-value">${item.bathrooms} KM</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Luas Tanah</span>
            <span class="spec-value">${item.lt} m²</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Luas Bangunan</span>
            <span class="spec-value">${item.lb} m²</span>
          </div>
        </div>

        <!-- Evaluation Box: Family Fit (3 Bedrooms) -->
        <div class="eval-box">
          <div class="eval-row">
            <div class="eval-title">
              <span>🏠</span> Evaluasi Ruang Keluarga (3 Kamar Tidur)
            </div>
            <div class="eval-desc">${item.family_fit_analysis}</div>
          </div>
        </div>

        <!-- Commute & Climate Info -->
        <div class="detail-chips-row">
          <div class="detail-chip">
            <div class="chip-heading">🛵 Akses Motor & Mobil</div>
            <div class="chip-text">${item.commute.motorcycle}</div>
          </div>
          <div class="detail-chip">
            <div class="chip-heading">⛅ Iklim & Legalitas</div>
            <div class="chip-text">${item.climate} (${item.legal})</div>
          </div>
        </div>

        <!-- Actions: WhatsApp Direct & Verified Source Link -->
        <div class="card-actions">
          <a href="${item.contact.wa_link}" target="_blank" rel="noopener noreferrer" class="btn-wa">
            <span>💬 Chat WA (${item.contact.name.split(' ')[0]})</span>
          </a>
          <a href="${item.source_url}" target="_blank" rel="noopener noreferrer" class="btn-source">
            <span>🔗 Cek Sumber</span>
          </a>
        </div>
      </div>
    </article>
  `;
}

// Carousel Interactions (Touch + Buttons)
function prevSlide(cardId, event) {
  if (event) event.stopPropagation();
  const media = document.querySelector(`[data-card-id="${cardId}"]`);
  if (!media) return;
  let current = parseInt(media.getAttribute('data-current') || '0', 10);
  const total = parseInt(media.getAttribute('data-total') || '1', 10);
  current = (current - 1 + total) % total;
  updateCarousel(media, current);
}

function nextSlide(cardId, event) {
  if (event) event.stopPropagation();
  const media = document.querySelector(`[data-card-id="${cardId}"]`);
  if (!media) return;
  let current = parseInt(media.getAttribute('data-current') || '0', 10);
  const total = parseInt(media.getAttribute('data-total') || '1', 10);
  current = (current + 1) % total;
  updateCarousel(media, current);
}

function updateCarousel(mediaEl, index) {
  mediaEl.setAttribute('data-current', index);
  const viewport = mediaEl.querySelector('.carousel-viewport');
  if (viewport) {
    viewport.style.transform = `translateX(-${index * 100}%)`;
  }
  const counter = mediaEl.querySelector('.current-slide');
  if (counter) {
    counter.textContent = index + 1;
  }
}

// Touch Gestures for Mobile Swipe
function attachCarouselHandlers() {
  const medias = document.querySelectorAll('.card-media');
  medias.forEach(media => {
    let startX = 0;
    let endX = 0;
    const cardId = media.getAttribute('data-card-id');

    media.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    media.addEventListener('touchend', (e) => {
      endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          nextSlide(cardId);
        } else {
          prevSlide(cardId);
        }
      }
    }, { passive: true });

    // Click to Open Lightbox
    media.addEventListener('click', (e) => {
      if (e.target.classList.contains('carousel-prev') || e.target.classList.contains('carousel-next')) {
        return;
      }
      const current = parseInt(media.getAttribute('data-current') || '0', 10);
      const slides = media.querySelectorAll('.carousel-slide img');
      if (slides[current]) {
        openLightbox(slides[current].src);
      }
    });
  });
}

// Lightbox
function openLightbox(src) {
  if (lightboxImg && lightboxModal) {
    lightboxImg.src = src;
    lightboxModal.classList.add('active');
  }
}

function closeLightbox() {
  if (lightboxModal) {
    lightboxModal.classList.remove('active');
  }
}

// Event Listeners Setup
function setupEvents() {
  // Category Tabs
  tabUsed.addEventListener('click', () => {
    activeCategory = 'used';
    tabUsed.classList.add('active');
    tabNew.classList.remove('active');
    renderListings();
  });

  tabNew.addEventListener('click', () => {
    activeCategory = 'new';
    tabNew.classList.add('active');
    tabUsed.classList.remove('active');
    renderListings();
  });

  // Filter Chips
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter') || 'all';
      renderListings();
    });
  });

  // Search Input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderListings();
    });
  }

  // Lightbox Close
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }
}

// Start
document.addEventListener('DOMContentLoaded', initApp);
