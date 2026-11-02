/**
 * TTRPG COLLECTION DATABASE - ADMIN CONTROLLER
 * Microsoft Access 97 style CRUD management for books, images, and dates.
 * Password Protected: Username "Ian", Password "R3d1in3d"
 */

const ADMIN_USER = "Ian";
const ADMIN_PASS = "R3d1in3d";
const AUTH_STORAGE_KEY = "ttrpg_admin_authenticated";

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});

let books = [];
let currentIndex = 0;
let isNewRecord = false;
let currentCustomImage = null;
let isAppInitialized = false;

/* ==========================================================================
   0. AUTHENTICATION CONTROLLER (PASSWORD PROTECTION)
   ========================================================================== */

function isAuthenticated() {
  return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true' ||
         localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

function initAuth() {
  const overlay = document.getElementById('admin-login-overlay');
  const appContainer = document.querySelector('.win95-app-container');
  const loginForm = document.getElementById('admin-login-form');
  const errorMsg = document.getElementById('login-error-msg');

  if (isAuthenticated()) {
    if (overlay) overlay.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
    initAdminApp();
  } else {
    if (overlay) overlay.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    const passInput = document.getElementById('login-password');
    if (passInput) setTimeout(() => passInput.focus(), 100);
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = document.getElementById('login-username').value.trim();
      const pass = document.getElementById('login-password').value;
      const remember = document.getElementById('login-remember').checked;

      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        window.retroSynth.playCritSuccessSound();
        if (remember) {
          localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        } else {
          sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
        }
        if (errorMsg) errorMsg.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
        initAdminApp();
      } else {
        window.retroSynth.playCritFumbleSound();
        if (errorMsg) errorMsg.style.display = 'block';
        const passInput = document.getElementById('login-password');
        if (passInput) {
          passInput.value = '';
          passInput.focus();
        }
      }
    });
  }
}

function logoff() {
  window.retroSynth.playClickSound();
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);

  const appContainer = document.querySelector('.win95-app-container');
  const overlay = document.getElementById('admin-login-overlay');
  const passInput = document.getElementById('login-password');
  const errorMsg = document.getElementById('login-error-msg');

  if (appContainer) appContainer.style.display = 'none';
  if (overlay) overlay.style.display = 'flex';
  if (passInput) {
    passInput.value = '';
    passInput.focus();
  }
  if (errorMsg) errorMsg.style.display = 'none';
}

function initAdminApp() {
  if (isAppInitialized) return;
  isAppInitialized = true;

  books = window.TTRPGStorage.getBooks();

  initTabs();
  initNavigation();
  initToolbar();
  initFormBindings();
  initImageHandlers();
  initSearch();

  if (books.length > 0) {
    selectRecord(0);
  } else {
    createNewRecord();
  }
}

/* ==========================================================================
   1. TAB SWITCHING
   ========================================================================== */

function initTabs() {
  const tabs = document.querySelectorAll('.win95-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      window.retroSynth.playClickSound();
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.getAttribute('data-tab');
      document.querySelectorAll('.admin-tab-pane').forEach(pane => {
        pane.style.display = (pane.id === targetId) ? 'block' : 'none';
      });
    });
  });
}

/* ==========================================================================
   2. RECORD LIST & NAVIGATION
   ========================================================================== */

function renderRecordList(filterText = '') {
  const listElem = document.getElementById('admin-records-list');
  const countBadge = document.getElementById('record-count-badge');
  const totalNum = document.getElementById('total-record-num');
  if (!listElem) return;

  const filtered = books.filter((b, idx) => {
    if (!filterText) return true;
    const target = (b.title + ' ' + b.system + ' ' + b.publisher + ' ' + b.year).toLowerCase();
    return target.includes(filterText.toLowerCase());
  });

  if (countBadge) countBadge.textContent = `${books.length} Records`;
  if (totalNum) totalNum.textContent = books.length;

  listElem.innerHTML = filtered.map((b) => {
    const realIdx = books.findIndex(item => item.id === b.id);
    const isActive = (realIdx === currentIndex && !isNewRecord);
    
    // Thumbnail presentation
    let thumbHtml = '';
    if (b.coverImage) {
      thumbHtml = `<img src="${b.coverImage}" alt="Cover">`;
    } else if (b.coverSvg) {
      thumbHtml = b.coverSvg;
    } else {
      thumbHtml = `<div style="background:#552288;color:#fff;width:100%;height:100%;font-size:8px;text-align:center;line-height:38px;">TOME</div>`;
    }

    return `
      <div class="record-item ${isActive ? 'active' : ''}" onclick="selectRecord(${realIdx})">
        <div class="record-thumb">${thumbHtml}</div>
        <div style="overflow: hidden;">
          <div class="record-title-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(b.title)}
          </div>
          <div class="record-sub">
            ${b.year} | ${escapeHtml(b.system)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function selectRecord(index) {
  if (index < 0 || index >= books.length) return;
  window.retroSynth.playClickSound();
  currentIndex = index;
  isNewRecord = false;

  const book = books[currentIndex];
  populateForm(book);
  renderRecordList();
  updateLivePreview();
  updateNavInputs();

  const statusMsg = document.getElementById('form-status-msg');
  if (statusMsg) statusMsg.textContent = `Viewing Record #${currentIndex + 1}`;
}

function updateNavInputs() {
  const curInput = document.getElementById('current-record-num');
  if (curInput) curInput.value = isNewRecord ? '*' : (currentIndex + 1);
}

function initNavigation() {
  document.getElementById('nav-first').addEventListener('click', () => selectRecord(0));
  document.getElementById('nav-prev').addEventListener('click', () => {
    if (currentIndex > 0) selectRecord(currentIndex - 1);
  });
  document.getElementById('nav-next').addEventListener('click', () => {
    if (currentIndex < books.length - 1) selectRecord(currentIndex + 1);
  });
  document.getElementById('nav-last').addEventListener('click', () => selectRecord(books.length - 1));

  const curInput = document.getElementById('current-record-num');
  curInput.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= books.length) {
      selectRecord(val - 1);
    } else {
      updateNavInputs();
    }
  });
}

/* ==========================================================================
   3. FORM DATA BINDING & POPULATION
   ========================================================================== */

function populateForm(b) {
  document.getElementById('field-id').value = b.id || '';
  document.getElementById('field-title').value = b.title || '';
  document.getElementById('field-category').value = b.category || 'add1e';
  document.getElementById('field-system').value = b.system || '';
  document.getElementById('field-year').value = b.year || 1980;
  document.getElementById('field-publisher').value = b.publisher || '';
  document.getElementById('field-coverArtist').value = b.coverArtist || '';
  document.getElementById('field-rarity').value = b.rarity || 5;
  document.getElementById('field-badge').value = b.badge || 'COLLECTOR GRADE';
  
  // Dates & Collection Log
  document.getElementById('field-acqDate').value = b.acqDate || '';
  document.getElementById('field-lastPlayedDate').value = b.lastPlayedDate || '';
  document.getElementById('field-conditionGrade').value = b.conditionGrade || 'Very Good';
  document.getElementById('field-shelfLocation').value = b.shelfLocation || 'Top Shelf - Left';
  document.getElementById('field-purchasePrice').value = b.purchasePrice || '';
  document.getElementById('field-estValue').value = b.estValue || '';
  document.getElementById('field-condition').value = b.condition || '';

  // Lore & Rules
  document.getElementById('field-description').value = b.description || '';
  document.getElementById('field-memorableRule').value = b.memorableRule || '';
  document.getElementById('field-favoriteQuote').value = b.favoriteQuote || '';
  document.getElementById('field-tags').value = Array.isArray(b.tags) ? b.tags.join(', ') : (b.tags || '');

  // Image & Colors
  document.getElementById('field-imageUrl').value = b.imageUrl || '';
  document.getElementById('field-colorTheme').value = b.colorTheme || '#8b0000';
  document.getElementById('field-accentColor').value = b.accentColor || '#ffd700';

  currentCustomImage = b.coverImage || null;
  const noteElem = document.getElementById('image-status-note');
  if (noteElem) {
    if (b.coverImage) {
      noteElem.textContent = '✓ Custom Cover Image Attached';
    } else if (b.coverSvg) {
      noteElem.textContent = '✓ Vintage Retro SVG Cover Active';
    } else {
      noteElem.textContent = '';
    }
  }
}

function initFormBindings() {
  const form = document.getElementById('book-edit-form');
  
  // Live update preview on any input typing
  form.addEventListener('input', () => {
    updateLivePreview();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveCurrentRecord();
  });

  document.getElementById('btn-cancel-edit').addEventListener('click', () => {
    window.retroSynth.playClickSound();
    if (isNewRecord) {
      selectRecord(0);
    } else {
      populateForm(books[currentIndex]);
      updateLivePreview();
    }
  });

  document.getElementById('btn-delete-record').addEventListener('click', deleteCurrentRecord);
}

/* ==========================================================================
   4. LIVE 90s GEOCITIES CARD PREVIEW
   ========================================================================== */

function getFormData() {
  const id = document.getElementById('field-id').value;
  const title = document.getElementById('field-title').value || 'Untitled Tome';
  const category = document.getElementById('field-category').value;
  const system = document.getElementById('field-system').value || 'Role Playing Game';
  const year = parseInt(document.getElementById('field-year').value, 10) || 1985;
  const publisher = document.getElementById('field-publisher').value || 'TSR Games';
  const coverArtist = document.getElementById('field-coverArtist').value || 'Unknown Artist';
  const rarity = parseInt(document.getElementById('field-rarity').value, 10) || 5;
  const badge = document.getElementById('field-badge').value || 'HOLY GRAIL';
  
  const acqDate = document.getElementById('field-acqDate').value;
  const lastPlayedDate = document.getElementById('field-lastPlayedDate').value;
  const conditionGrade = document.getElementById('field-conditionGrade').value;
  const shelfLocation = document.getElementById('field-shelfLocation').value || 'Vault Shelf';
  const purchasePrice = document.getElementById('field-purchasePrice').value;
  const estValue = document.getElementById('field-estValue').value;
  const condition = document.getElementById('field-condition').value || `${conditionGrade} Condition`;

  const description = document.getElementById('field-description').value || 'No description entered yet.';
  const memorableRule = document.getElementById('field-memorableRule').value || '';
  const favoriteQuote = document.getElementById('field-favoriteQuote').value || '';
  
  const rawTags = document.getElementById('field-tags').value;
  const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : ['1980s', 'TTRPG'];

  const imageUrl = document.getElementById('field-imageUrl').value.trim();
  const colorTheme = document.getElementById('field-colorTheme').value;
  const accentColor = document.getElementById('field-accentColor').value;

  // Cover representation: Custom uploaded image, Image URL, or generated SVG
  let coverSvg = '';
  if (currentIndex < books.length && !isNewRecord && books[currentIndex].coverSvg) {
    coverSvg = books[currentIndex].coverSvg;
  } else {
    coverSvg = generateRetroSvg(title, system, year, publisher, colorTheme, accentColor);
  }

  return {
    id,
    title,
    category,
    system,
    year,
    publisher,
    coverArtist,
    rarity,
    badge,
    acqDate,
    lastPlayedDate,
    conditionGrade,
    shelfLocation,
    purchasePrice,
    estValue,
    condition,
    description,
    memorableRule,
    favoriteQuote,
    tags,
    imageUrl,
    coverImage: currentCustomImage || imageUrl || null,
    coverSvg,
    colorTheme,
    accentColor
  };
}

function updateLivePreview() {
  const previewStage = document.getElementById('live-card-preview');
  if (!previewStage) return;

  const data = getFormData();
  const rarityD20s = '&#127922;'.repeat(data.rarity);

  let coverContent = '';
  if (data.coverImage) {
    coverContent = `<img src="${data.coverImage}" alt="Cover" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
  } else {
    coverContent = data.coverSvg;
  }

  previewStage.innerHTML = `
    <div class="book-card" style="margin: 0; box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);">
      <span class="book-badge-sticker">${escapeHtml(data.badge)}</span>
      
      <div class="book-card-header">
        <h3 class="book-title">${escapeHtml(data.title)}</h3>
        <p class="book-meta">Year: ${data.year} | ${escapeHtml(data.publisher)}</p>
        <p class="book-meta" style="color: #ff9900;">${escapeHtml(data.system)}</p>
      </div>

      <div class="book-cover-stage">
        ${coverContent}
      </div>

      <div class="book-rarity-row">
        <span style="color: #ffff00; font-weight: bold;">Rarity:</span>
        <span class="rarity-d20s">${rarityD20s}</span>
      </div>

      ${data.acqDate ? `<div style="font-size: 11px; color: #00ffcc; margin-bottom: 4px;">📅 Acquired: <strong>${data.acqDate}</strong></div>` : ''}

      <p class="book-snippet">${escapeHtml(truncate(data.description, 110))}</p>

      <div class="book-actions">
        <button class="win95-btn book-btn" type="button">
          &#128214; Inspect Properties...
        </button>
      </div>
    </div>
  `;
}

function truncate(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.substr(0, max) + '...';
}

/* ==========================================================================
   5. IMAGE UPLOAD & RETRO SVG GENERATION
   ========================================================================== */

function initImageHandlers() {
  const fileInput = document.getElementById('field-image-file');
  const noteElem = document.getElementById('image-status-note');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        currentCustomImage = event.target.result;
        if (noteElem) noteElem.textContent = `✓ Uploaded: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        updateLivePreview();
      };
      reader.readAsDataURL(file);
    });
  }

  const urlInput = document.getElementById('field-imageUrl');
  if (urlInput) {
    urlInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        currentCustomImage = val;
        if (noteElem) noteElem.textContent = '✓ Using Image URL';
        updateLivePreview();
      }
    });
  }

  const genSvgBtn = document.getElementById('btn-generate-retro-svg');
  if (genSvgBtn) {
    genSvgBtn.addEventListener('click', () => {
      window.retroSynth.playClickSound();
      currentCustomImage = null;
      if (fileInput) fileInput.value = '';
      if (urlInput) urlInput.value = '';

      const title = document.getElementById('field-title').value || 'D&D TOME';
      const system = document.getElementById('field-system').value || 'AD&D';
      const year = document.getElementById('field-year').value || '1980';
      const publisher = document.getElementById('field-publisher').value || 'TSR';
      const color = document.getElementById('field-colorTheme').value;
      const accent = document.getElementById('field-accentColor').value;

      const newSvg = generateRetroSvg(title, system, year, publisher, color, accent);
      if (currentIndex < books.length && !isNewRecord) {
        books[currentIndex].coverSvg = newSvg;
        books[currentIndex].coverImage = null;
      }
      if (noteElem) noteElem.textContent = '✓ Generated Custom Retro SVG Cover!';
      updateLivePreview();
    });
  }
}

function generateRetroSvg(title, system, year, publisher, color, accent) {
  const safeTitle = escapeHtml(title.toUpperCase());
  const safeSystem = escapeHtml(system.toUpperCase());
  const safePub = escapeHtml(publisher.toUpperCase());

  return `
    <svg viewBox="0 0 160 220" width="100%" height="100%">
      <rect width="160" height="220" fill="${color}"/>
      <rect x="8" y="8" width="144" height="204" fill="#111111" stroke="${accent}" stroke-width="2"/>
      <rect x="14" y="16" width="132" height="44" fill="${color}" stroke="${accent}" stroke-width="1.5"/>
      <text x="80" y="30" fill="${accent}" font-family="'Times New Roman', serif" font-weight="bold" font-size="7.5" text-anchor="middle">${safeSystem}</text>
      <text x="80" y="47" fill="#ffffff" font-family="'Impact', sans-serif" font-size="11" text-anchor="middle">${truncate(safeTitle, 20)}</text>
      <circle cx="80" cy="115" r="35" fill="${color}" stroke="${accent}" stroke-width="1.5"/>
      <polygon points="80,90 98,125 62,125" fill="#222" stroke="${accent}" stroke-width="1.2"/>
      <text x="80" y="122" fill="#ffff00" font-family="'Impact', sans-serif" font-size="14" text-anchor="middle">20</text>
      <text x="80" y="195" fill="${accent}" font-family="monospace" font-size="8" text-anchor="middle">${safePub} (${year})</text>
    </svg>
  `;
}

/* ==========================================================================
   6. CRUD: CREATE, SAVE, DELETE
   ========================================================================== */

function createNewRecord() {
  window.retroSynth.playClickSound();
  isNewRecord = true;
  currentCustomImage = null;

  const newId = 'tome-' + Date.now();
  const blankBook = {
    id: newId,
    title: 'New Tabletop RPG Book',
    category: 'add1e',
    system: 'AD&D 1st Edition',
    year: 1985,
    publisher: 'TSR Inc.',
    coverArtist: 'Larry Elmore',
    rarity: 4,
    badge: 'NEW ACQUISITION',
    acqDate: new Date().toISOString().slice(0, 10),
    lastPlayedDate: '',
    conditionGrade: 'Near Mint',
    shelfLocation: 'Top Shelf - Left',
    purchasePrice: '$15.00',
    estValue: '$75.00',
    condition: 'Near Mint (Collector copy, intact spine, crisp clean pages)',
    description: 'Detailed description of this vintage gaming manual and personal memories...',
    memorableRule: 'Key rule table or combat mechanic...',
    favoriteQuote: 'Memorable quote or flavor text from the book.',
    tags: ['1980s', 'TSR', 'Hardcover'],
    imageUrl: '',
    coverImage: null,
    colorTheme: '#781c1c',
    accentColor: '#ffd700'
  };

  populateForm(blankBook);
  updateLivePreview();
  updateNavInputs();

  const statusMsg = document.getElementById('form-status-msg');
  if (statusMsg) statusMsg.textContent = '🌟 CREATING NEW TOME RECORD';
}

function saveCurrentRecord() {
  const data = getFormData();
  if (!data.title) {
    alert('Please enter a book title!');
    return;
  }

  // Upsert into storage
  window.TTRPGStorage.upsertBook(data);
  books = window.TTRPGStorage.getBooks();

  // Find index of saved record
  currentIndex = books.findIndex(b => b.id === data.id);
  if (currentIndex === -1) currentIndex = 0;
  isNewRecord = false;

  window.retroSynth.playCritSuccessSound();
  renderRecordList();
  updateNavInputs();

  const statusMsg = document.getElementById('form-status-msg');
  if (statusMsg) {
    const time = new Date().toLocaleTimeString();
    statusMsg.innerHTML = `<span style="color: #008800;">✓ Saved Record "${escapeHtml(data.title)}" at ${time}!</span>`;
  }
}

function deleteCurrentRecord() {
  if (books.length === 0) return;
  const current = books[currentIndex];
  if (!current) return;

  const confirmed = confirm(`Are you sure you wish to delete "${current.title}" from your collection vault?`);
  if (!confirmed) return;

  window.retroSynth.playCritFumbleSound();
  window.TTRPGStorage.deleteBook(current.id);
  books = window.TTRPGStorage.getBooks();

  if (currentIndex >= books.length) {
    currentIndex = Math.max(0, books.length - 1);
  }

  if (books.length > 0) {
    selectRecord(currentIndex);
  } else {
    createNewRecord();
  }
}

/* ==========================================================================
   7. TOOLBAR ACTIONS: EXPORT, IMPORT, RESET
   ========================================================================== */

function initToolbar() {
  document.getElementById('tb-new-btn').addEventListener('click', createNewRecord);
  document.getElementById('admin-add-quick-btn').addEventListener('click', createNewRecord);
  document.getElementById('tb-save-btn').addEventListener('click', saveCurrentRecord);
  document.getElementById('tb-delete-btn').addEventListener('click', deleteCurrentRecord);

  // Export JSON
  document.getElementById('tb-export-json-btn').addEventListener('click', () => {
    window.retroSynth.playClickSound();
    window.TTRPGStorage.exportJson();
  });

  // Export updated books-data.js
  document.getElementById('tb-export-js-btn').addEventListener('click', () => {
    window.retroSynth.playClickSound();
    window.TTRPGStorage.exportJsFile();
    alert("Downloaded 'books-data.js'! You can place this file in the retro-rpg-shelf/ folder to permanently preserve your custom books as the default codebase data!");
  });

  // Import JSON
  const importInput = document.getElementById('tb-import-json-input');
  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = window.TTRPGStorage.importJson(event.target.result);
      if (res.success) {
        books = window.TTRPGStorage.getBooks();
        selectRecord(0);
        window.retroSynth.playCritSuccessSound();
        alert(`Successfully imported ${res.count} books into your collection vault!`);
      } else {
        alert(`Error importing JSON: ${res.error}`);
      }
    };
    reader.readAsText(file);
  });

  // Reset to defaults
  document.getElementById('tb-reset-btn').addEventListener('click', () => {
    const confirmed = confirm("Are you sure you want to reset your collection back to the original 19 default 80s/90s books? Any unsaved custom entries will be replaced.");
    if (!confirmed) return;

    window.retroSynth.playDiceRollSound();
    window.TTRPGStorage.resetToDefaults();
    books = window.TTRPGStorage.getBooks();
    selectRecord(0);
    alert("Collection restored to the 19 classic default tomes!");
  });

  // Logoff action
  const logoffBtn = document.getElementById('tb-logoff-btn');
  if (logoffBtn) {
    logoffBtn.addEventListener('click', logoff);
  }
}

function initSearch() {
  const searchInput = document.getElementById('admin-search-input');
  if (!searchInput) return;
  searchInput.addEventListener('input', (e) => {
    renderRecordList(e.target.value.trim());
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
