/**
 * 90s TTRPG BOOK VAULT - INTERACTIVE CONTROLLER
 * Handles book filters, Windows 95 modal dialogs, dice engine,
 * THAC0 calculator, retro guestbook, cursor sparkle trail, and Konami code.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Load collection from storage (or defaults)
  const initialBooks = (window.TTRPGStorage) ? window.TTRPGStorage.getBooks() : window.rpgBooksData;
  renderBooks(initialBooks);
  initFilters();
  initSearch();
  initModal();
  initMidiPlayer();
  initDiceRoller();
  initThac0Calc();
  initGuestbook();
  initHitCounter();
  initCursorTrail();
  initEasterEggs();

  // Listen for real-time updates from Admin interface
  window.addEventListener('ttrpg-books-updated', () => {
    const updated = window.TTRPGStorage.getBooks();
    renderBooks(updated);
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'retro_rpg_books_v1') {
      const updated = window.TTRPGStorage.getBooks();
      renderBooks(updated);
    }
  });
});

/* ==========================================================================
   1. BOOK COMPENDIUM RENDERING & FILTERING
   ========================================================================== */

let activeCategory = 'all';
let searchQuery = '';
let currentOpenBook = null;

function getCurrentBooks() {
  return (window.TTRPGStorage) ? window.TTRPGStorage.getBooks() : window.rpgBooksData;
}

function renderBooks(books) {
  const container = document.getElementById('books-grid');
  if (!container) return;

  const currentList = books || getCurrentBooks();

  // Update book count in section header if present
  const countBadge = document.getElementById('shelf-book-count');
  if (countBadge) {
    countBadge.textContent = `[ ${currentList.length} TOMES CATALOGED ]`;
  }

  const filtered = currentList.filter(book => {
    const matchesCat = (activeCategory === 'all') || (book.category === activeCategory);
    const searchTarget = (book.title + ' ' + (book.publisher || '') + ' ' + (book.system || '') + ' ' + (book.tags ? book.tags.join(' ') : '')).toLowerCase();
    const matchesSearch = !searchQuery || searchTarget.includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #000; border: 2px dashed #ff0000;">
        <p style="color: #ffff00; font-family: 'Impact', sans-serif; font-size: 20px;">
          &#9888; NO FORBIDDEN TOMES MATCHED THY SEARCH QUERY! &#9888;
        </p>
        <p style="color: #00ffff; font-family: 'Courier New', monospace;">
          Try adjusting thy filter criteria or click below to enter a new book.
        </p>
        <a href="admin.html" class="win95-btn" style="text-decoration: none; display: inline-block; margin-top: 10px; background: #000080; color: #ffff00; padding: 6px 14px;">
          ➕ Enter This Book in Admin Database
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(book => {
    const rarityD20s = '&#127922;'.repeat(book.rarity || 5);
    
    // Cover rendering: Custom image upload, Image URL, or SVG
    let coverHtml = '';
    if (book.coverImage) {
      coverHtml = `<img src="${book.coverImage}" alt="${escapeHtml(book.title)}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
    } else if (book.imageUrl) {
      coverHtml = `<img src="${book.imageUrl}" alt="${escapeHtml(book.title)}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
    } else if (book.coverSvg) {
      coverHtml = book.coverSvg;
    } else {
      coverHtml = `<div style="background:#552288;color:#fff;display:flex;align-items:center;justify-content:center;height:100%;font-family:'Impact',sans-serif;font-size:18px;">${escapeHtml(book.title)}</div>`;
    }

    return `
      <div class="book-card" data-id="${book.id}">
        <span class="book-badge-sticker">${escapeHtml(book.badge || 'COLLECTOR')}</span>
        
        <div class="book-card-header">
          <h3 class="book-title">${escapeHtml(book.title)}</h3>
          <p class="book-meta">Year: ${book.year} | ${escapeHtml(book.publisher || 'Unknown')}</p>
          <p class="book-meta" style="color: #ff9900;">${escapeHtml(book.system || 'TTRPG')}</p>
        </div>

        <div class="book-cover-stage" onclick="openBookModal('${book.id}')" style="cursor: pointer;" title="Click to inspect tome in Windows 95">
          ${coverHtml}
        </div>

        <div class="book-rarity-row">
          <span style="color: #ffff00; font-weight: bold;">Rarity:</span>
          <span class="rarity-d20s">${rarityD20s}</span>
        </div>

        ${book.acqDate ? `<div style="font-size: 11px; color: #00ffcc; margin-bottom: 4px;">📅 Acquired: <strong>${escapeHtml(book.acqDate)}</strong></div>` : ''}

        <p class="book-snippet">${escapeHtml(truncateText(book.description || '', 130))}</p>

        <div class="book-actions">
          <button class="win95-btn book-btn" onclick="openBookModal('${book.id}')">
            &#128214; Inspect Tome...
          </button>
          <a href="admin.html" class="win95-btn" style="text-decoration: none; padding: 3px 6px; font-size: 11px;" title="Edit this tome in Database">
            ✏️
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function truncateText(text, max) {
  if (text.length <= max) return text;
  return text.substr(0, max) + '...';
}

function initFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      window.retroSynth.playClickSound();
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-filter');
      renderBooks(getCurrentBooks());
    });
  });
}

function initSearch() {
  const searchInput = document.getElementById('retro-search-input');
  if (!searchInput) return;
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderBooks(getCurrentBooks());
  });
}

/* ==========================================================================
   2. WINDOWS 95 TOME INSPECTOR MODAL
   ========================================================================== */

function initModal() {
  const modal = document.getElementById('book-modal');
  const closeBtn = document.getElementById('modal-close-x');
  const okBtn = document.getElementById('modal-ok-btn');
  const tabs = document.querySelectorAll('.win95-tab');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  if (okBtn) {
    okBtn.addEventListener('click', closeModal);
  }

  // Close on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      window.retroSynth.playClickSound();
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetTab = tab.getAttribute('data-tab');
      showTabContent(targetTab);
    });
  });
}

function openBookModal(bookId) {
  window.retroSynth.playClickSound();
  const allBooks = getCurrentBooks();
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;
  currentOpenBook = book;

  // Title bar
  const titleElem = document.getElementById('modal-book-title');
  if (titleElem) {
    titleElem.textContent = `${book.title} - Properties`;
  }

  // Cover representation for modal
  let coverModalHtml = '';
  if (book.coverImage) {
    coverModalHtml = `<img src="${book.coverImage}" alt="${escapeHtml(book.title)}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
  } else if (book.imageUrl) {
    coverModalHtml = `<img src="${book.imageUrl}" alt="${escapeHtml(book.title)}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
  } else if (book.coverSvg) {
    coverModalHtml = book.coverSvg;
  } else {
    coverModalHtml = `<div style="background:#552288;color:#fff;display:flex;align-items:center;justify-content:center;height:100%;font-size:12px;">${escapeHtml(book.title)}</div>`;
  }

  // Populate Tab 1: General
  const tabGeneral = document.getElementById('tab-content-general');
  if (tabGeneral) {
    const stars = '&#9733;'.repeat(book.rarity || 5);
    tabGeneral.innerHTML = `
      <div style="display: flex; gap: 15px; margin-bottom: 12px; align-items: flex-start;">
        <div style="width: 120px; height: 165px; border: 2px inset #808080; background: #000; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden;">
          ${coverModalHtml}
        </div>
        <div style="flex-grow: 1;">
          <h2 style="margin: 0 0 6px 0; font-size: 17px; color: #000080;">${escapeHtml(book.title)}</h2>
          <table style="width: 100%; font-size: 12.5px; border-collapse: collapse;">
            <tr><td style="font-weight: bold; width: 120px;">System:</td><td>${escapeHtml(book.system || 'TTRPG')}</td></tr>
            <tr><td style="font-weight: bold;">Year Published:</td><td>${book.year || '1980s'}</td></tr>
            <tr><td style="font-weight: bold;">Publisher:</td><td>${escapeHtml(book.publisher || 'Unknown')}</td></tr>
            <tr><td style="font-weight: bold;">Cover Artist:</td><td>${escapeHtml(book.coverArtist || 'Unknown')}</td></tr>
            <tr><td style="font-weight: bold;">Collector Rarity:</td><td style="color: #b30000; font-weight: bold;">${stars} (${book.rarity || 5}/5 Stars)</td></tr>
            <tr><td style="font-weight: bold;">Vault Shelf:</td><td>${escapeHtml(book.shelfLocation || 'Top Shelf')}</td></tr>
            ${book.acqDate ? `<tr><td style="font-weight: bold; color: #006600;">Acquisition Date:</td><td style="color: #006600; font-weight: bold;">${escapeHtml(book.acqDate)}</td></tr>` : ''}
            ${book.purchasePrice ? `<tr><td style="font-weight: bold;">Purchase Price:</td><td>${escapeHtml(book.purchasePrice)}</td></tr>` : ''}
            ${book.estValue ? `<tr><td style="font-weight: bold;">Estimated Value:</td><td>${escapeHtml(book.estValue)}</td></tr>` : ''}
          </table>
        </div>
      </div>
      <div style="border-top: 1px solid #808080; padding-top: 8px;">
        <p style="margin: 0 0 4px 0; font-weight: bold; color: #800000;">Physical Copy Condition:</p>
        <p style="margin: 0; font-style: italic; background: #ffffd0; padding: 4px; border: 1px solid #cca;">
          "${escapeHtml(book.condition || 'Good Condition')}"
        </p>
      </div>
    `;
  }

  // Populate Tab 2: Lore & Significance
  const tabLore = document.getElementById('tab-content-lore');
  if (tabLore) {
    tabLore.innerHTML = `
      <h3 style="margin-top: 0; color: #800080; border-bottom: 1px solid #808080; padding-bottom: 4px;">
        Historical Lore &amp; Cultural Impact
      </h3>
      <p style="line-height: 1.5; font-size: 14px;">${escapeHtml(book.description || '')}</p>
      ${book.favoriteQuote ? `
      <div style="background: #eef; border: 1px solid #99c; padding: 8px; margin-top: 12px;">
        <strong style="color: #000080;">Favorite Nostalgic Quote:</strong><br>
        <em style="color: #333;">&ldquo;${escapeHtml(book.favoriteQuote)}&rdquo;</em>
      </div>` : ''}
      <div style="margin-top: 12px;">
        <strong>Archive Tags:</strong>
        ${(book.tags || []).map(t => `<span style="background: #ddd; border: 1px outset #fff; padding: 1px 5px; font-size: 11px; margin-right: 4px;">${escapeHtml(t)}</span>`).join('')}
      </div>
    `;
  }

  // Populate Tab 3: Rules & Stat Crunch
  const tabCrunch = document.getElementById('tab-content-crunch');
  if (tabCrunch) {
    tabCrunch.innerHTML = `
      <h3 style="margin-top: 0; color: #006600; border-bottom: 1px solid #808080; padding-bottom: 4px;">
        Rules Mechanics &amp; Stat Crunch
      </h3>
      <p style="font-weight: bold; color: #990000;">Key Table or Signature Rule:</p>
      <div style="background: #000; color: #00ff66; font-family: 'Courier New', monospace; padding: 10px; border: 2px inset #808080; margin-bottom: 12px; font-size: 12px;">
        ${escapeHtml(book.memorableRule || 'No specific mechanics noted for this tome.')}
      </div>
      <p style="font-size: 13px; line-height: 1.4;">
        This volume played a pivotal role in defining tabletop gaming conventions, from saving throws to initiative systems that influenced everything from early CRPGs to modern game design.
      </p>
    `;
  }

  // Reset to first tab
  document.querySelectorAll('.win95-tab').forEach((t, i) => {
    t.classList.toggle('active', i === 0);
  });
  showTabContent('general');

  const modal = document.getElementById('book-modal');
  if (modal) modal.classList.add('open');
}

function showTabContent(tabName) {
  document.getElementById('tab-content-general').style.display = (tabName === 'general') ? 'block' : 'none';
  document.getElementById('tab-content-lore').style.display = (tabName === 'lore') ? 'block' : 'none';
  document.getElementById('tab-content-crunch').style.display = (tabName === 'crunch') ? 'block' : 'none';
}

function closeModal() {
  window.retroSynth.playClickSound();
  const modal = document.getElementById('book-modal');
  if (modal) modal.classList.remove('open');
}

/* ==========================================================================
   3. RETRO MIDI AUDIO PLAYER CONTROLLER
   ========================================================================== */

function initMidiPlayer() {
  const playBtn = document.getElementById('midi-play-btn');
  const stopBtn = document.getElementById('midi-stop-btn');
  const nextBtn = document.getElementById('midi-next-btn');
  const screen = document.getElementById('midi-track-title');
  const volSlider = document.getElementById('midi-volume-slider');

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      const isPlaying = window.retroSynth.togglePlay();
      if (isPlaying) {
        playBtn.textContent = '⏸ PAUSE';
        playBtn.classList.add('active');
        screen.innerHTML = `&#9835; PLAYING: ${window.retroSynth.getCurrentTrackName()} &#9835;`;
      } else {
        playBtn.textContent = '▶ PLAY';
        playBtn.classList.remove('active');
        screen.innerHTML = `&#9208; PAUSED: ${window.retroSynth.getCurrentTrackName()}`;
      }
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      window.retroSynth.stop();
      playBtn.textContent = '▶ PLAY';
      playBtn.classList.remove('active');
      screen.innerHTML = `&#9209; STOPPED: ${window.retroSynth.getCurrentTrackName()}`;
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const newName = window.retroSynth.nextTrack();
      screen.innerHTML = `&#9835; ${window.retroSynth.isPlaying ? 'PLAYING' : 'LOADED'}: ${newName} &#9835;`;
    });
  }

  if (volSlider) {
    volSlider.addEventListener('input', (e) => {
      window.retroSynth.setVolume(parseFloat(e.target.value));
    });
  }
}

/* ==========================================================================
   4. INTERACTIVE DICE ROLLER & THAC0 CALCULATOR
   ========================================================================== */

function initDiceRoller() {
  const diceBtns = document.querySelectorAll('.dice-btn');
  const logScreen = document.getElementById('dice-log-screen');
  const clearBtn = document.getElementById('clear-dice-log');

  diceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sides = parseInt(btn.getAttribute('data-sides'), 10);
      rollDie(sides);
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      window.retroSynth.playClickSound();
      if (logScreen) logScreen.innerHTML = '&gt; Dice terminal cleared. Roll when ready, adventurer!<br>';
    });
  }

  // 3d6 in order roll
  const roll3d6Btn = document.getElementById('roll-3d6-btn');
  if (roll3d6Btn) {
    roll3d6Btn.addEventListener('click', roll3d6InOrder);
  }
}

function rollDie(sides) {
  const result = Math.floor(Math.random() * sides) + 1;
  const logScreen = document.getElementById('dice-log-screen');
  if (!logScreen) return;

  window.retroSynth.playDiceRollSound();

  let specialMsg = '';
  if (sides === 20) {
    if (result === 20) {
      specialMsg = ' <strong style="color: #ffff00; text-shadow: 0 0 5px #ff0;">*** NATURAL 20! CRITICAL HIT! ***</strong>';
      setTimeout(() => window.retroSynth.playCritSuccessSound(), 250);
    } else if (result === 1) {
      specialMsg = ' <strong style="color: #ff3333;">*** CRITICAL FUMBLE! THOU HAST DROPPED THY WEAPON! ***</strong>';
      setTimeout(() => window.retroSynth.playCritFumbleSound(), 250);
    }
  }

  const timestamp = new Date().toLocaleTimeString();
  const entry = `&gt; [${timestamp}] Rolled <strong>1d${sides}</strong>: Result = <strong style="color: #00ffff;">${result}</strong>${specialMsg}<br>`;
  logScreen.innerHTML = entry + logScreen.innerHTML;
}

function roll3d6InOrder() {
  window.retroSynth.playDiceRollSound();
  const stats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const values = {};

  stats.forEach(s => {
    const r1 = Math.floor(Math.random() * 6) + 1;
    const r2 = Math.floor(Math.random() * 6) + 1;
    const r3 = Math.floor(Math.random() * 6) + 1;
    values[s] = r1 + r2 + r3;
    const valElem = document.getElementById(`stat-val-${s.toLowerCase()}`);
    if (valElem) valElem.textContent = values[s];
  });

  // Calculate recommendation
  const recElem = document.getElementById('class-recommendation');
  if (recElem) {
    let rec = 'Fighter (Good STR)';
    if (values['INT'] >= 13 && values['INT'] >= values['STR']) rec = 'Magic-User (High INT)';
    else if (values['WIS'] >= 13 && values['WIS'] >= values['STR']) rec = 'Cleric (High WIS)';
    else if (values['DEX'] >= 13 && values['DEX'] >= values['STR']) rec = 'Thief (High DEX)';
    else if (values['CHA'] >= 14) rec = 'Paladin or Bard (Blessed Charisma)';

    recElem.innerHTML = `Suggested AD&amp;D Class: <strong style="color: #ffff00;">${rec}</strong>`;
  }
}

function initThac0Calc() {
  const calcBtn = document.getElementById('calc-thac0-btn');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => {
    window.retroSynth.playClickSound();
    const thac0 = parseInt(document.getElementById('input-thac0').value, 10) || 20;
    const targetAc = parseInt(document.getElementById('input-target-ac').value, 10) || 0;

    // Classic 1e/2e THAC0 formula: Roll Needed on 1d20 = THAC0 - Target AC
    const needed = thac0 - targetAc;
    const resultBox = document.getElementById('thac0-result-box');

    let evalText = '';
    if (needed <= 1) {
      evalText = '(Automatic Hit on anything but a Natural 1!)';
    } else if (needed > 20) {
      evalText = '(Impossible without natural 20 or magic bonuses!)';
    } else {
      evalText = `(Thou must roll ${needed} or higher on 1d20!)`;
    }

    resultBox.innerHTML = `
      <div style="font-size: 14px; color: #ffff00;">
        Formula: <em>${thac0} (THAC0) - ${targetAc} (Target AC)</em> = 
        <span style="font-size: 18px; color: #00ffff; font-weight: bold;">${needed}</span>
      </div>
      <div style="font-size: 12px; color: #00ff66; margin-top: 4px;">${evalText}</div>
    `;
  });
}

/* ==========================================================================
   5. INTERACTIVE 90s CYBER-GUESTBOOK
   ========================================================================== */

const defaultGuestbookEntries = [
  {
    handle: "Elminster_Shadowdale",
    classRace: "Human Archmage (Lvl 29)",
    date: "10/14/1996",
    msg: "Verily, thou hast assembled a fine repository of vintage tomes, young webmaster! My spellbook trembles at the sight of that 1st print Deities & Demigods. May Mystra grant thee high baud rates!"
  },
  {
    handle: "Drizzt_Fan_97",
    classRace: "Drow Ranger with 2 Scimitars",
    date: "04/02/1997",
    msg: "Awesome homepage!! Do you have the Icewind Dale boxed set? I'm playing a dual-wielding drow in my friend's 2e campaign. Email me at drizzt_darkelf@aol.com!"
  },
  {
    handle: "Beholder_Bob",
    classRace: "Eye Tyrant / Web Crawler",
    date: "08/19/1997",
    msg: "Great Dark Sun and Planescape collection! The Brom art scans are wicked. Added your link to the Netheril RPG WebRing. 5 out of 5 eyestalks!"
  },
  {
    handle: "CyberSamurai_Jack",
    classRace: "Solo / Cyberpunk 2020",
    date: "11/24/1997",
    msg: "Friday Night Firefight is still the greatest combat engine ever pressed onto paper. Nice to see R. Talsorian getting respect alongside Gary Gygax. Chrome forever, chummer."
  },
  {
    handle: "Friend_Computer",
    classRace: "Alpha Complex AI (Ultraviolet)",
    date: "01/15/1998",
    msg: "Citizen: Viewing this website has been deemed MANDATORY by The Computer. Fun is mandatory. Failure to roll 3d6 in order is punishable by immediate laser vaporization. Have a nice daycycle!"
  }
];

function initGuestbook() {
  let stored = localStorage.getItem('retro_rpg_guestbook');
  let entries = stored ? JSON.parse(stored) : defaultGuestbookEntries;

  renderGuestbook(entries);

  const form = document.getElementById('guestbook-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      window.retroSynth.playClickSound();

      const handle = document.getElementById('gb-handle').value.trim() || 'Anonymous Adventurer';
      const classRace = document.getElementById('gb-class').value.trim() || 'Level 1 Wanderer';
      const msg = document.getElementById('gb-msg').value.trim();

      if (!msg) {
        alert('PLEASE ENTER A MESSAGE IN THE CYBER-GUESTBOOK BEFORE SUBMITTING!');
        return;
      }

      const today = new Date();
      const dateStr = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;

      const newEntry = {
        handle,
        classRace,
        date: dateStr,
        msg
      };

      entries.unshift(newEntry);
      localStorage.setItem('retro_rpg_guestbook', JSON.stringify(entries));
      renderGuestbook(entries);
      form.reset();

      alert('*** THOU HAST SIGNED THE GUESTBOOK! THY NAME IS ETCHED IN CYBERSPACE! ***');
    });
  }
}

function renderGuestbook(entries) {
  const container = document.getElementById('guestbook-entries');
  if (!container) return;

  container.innerHTML = entries.map(e => `
    <div class="guestbook-card">
      <div class="gb-header">
        <span>&#9876; <strong>${escapeHtml(e.handle)}</strong> [${escapeHtml(e.classRace)}]</span>
        <span>Date: ${e.date}</span>
      </div>
      <div class="gb-message">
        &ldquo;${escapeHtml(e.msg)}&rdquo;
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ==========================================================================
   6. 90s HIT COUNTER SIMULATION
   ========================================================================= */

function initHitCounter() {
  const counterBox = document.getElementById('hit-counter');
  if (!counterBox) return;

  let count = parseInt(localStorage.getItem('retro_hit_count'), 10);
  if (isNaN(count)) {
    count = 42891;
  }
  count++;
  localStorage.setItem('retro_hit_count', count.toString());

  const formatted = count.toString().padStart(6, '0');
  counterBox.innerHTML = formatted.split('').map(d => `<span class="counter-digit">${d}</span>`).join('');
}

/* ==========================================================================
   7. 90s DHTML MAGIC SPARKLE CURSOR TRAIL
   ========================================================================== */

let sparkleEnabled = true;

function initCursorTrail() {
  const toggle = document.getElementById('toggle-cursor-trail');
  if (toggle) {
    toggle.checked = true;
    toggle.addEventListener('change', (e) => {
      sparkleEnabled = e.target.checked;
    });
  }

  const sparkleChars = ['&#10022;', '&#10023;', '&#9733;', '&#9670;', '&#9830;', '&#127922;'];
  const colors = ['#ffff00', '#00ffff', '#ff00ff', '#ff3300', '#00ff66', '#ffffff'];

  let throttle = 0;
  window.addEventListener('mousemove', (e) => {
    if (!sparkleEnabled) return;
    throttle++;
    if (throttle % 4 !== 0) return; // limit density

    const span = document.createElement('span');
    span.className = 'sparkle-particle';
    span.innerHTML = sparkleChars[Math.floor(Math.random() * sparkleChars.length)];
    span.style.color = colors[Math.floor(Math.random() * colors.length)];
    span.style.left = `${e.clientX + (Math.random() * 14 - 7)}px`;
    span.style.top = `${e.clientY + (Math.random() * 14 - 7)}px`;

    document.body.appendChild(span);
    setTimeout(() => span.remove(), 700);
  });
}

/* ==========================================================================
   8. EASTER EGGS: KONAMI CODE & CLICKABLE ELEMENTS
   ========================================================================== */

function initEasterEggs() {
  // Konami Code sequence: Up Up Down Down Left Right Left Right B A
  const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIdx = 0;

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === konamiSequence[konamiIdx].toLowerCase()) {
      konamiIdx++;
      if (konamiIdx === konamiSequence.length) {
        konamiIdx = 0;
        triggerGodMode();
      }
    } else {
      konamiIdx = 0;
    }
  });

  // Construction banner click
  const underConst = document.querySelector('.under-construction-banner');
  if (underConst) {
    underConst.style.cursor = 'pointer';
    underConst.addEventListener('click', () => {
      window.retroSynth.playDiceRollSound();
      alert('WARNING: HARD HATS REQUIRED BEYOND THIS POINT! Dungeon Master Ian is currently transcribing the 1985 Unearthed Arcana Comeliness tables!');
    });
  }

  // Flaming skulls click
  document.querySelectorAll('.hero-torch').forEach(torch => {
    torch.style.cursor = 'pointer';
    torch.addEventListener('click', () => {
      window.retroSynth.playCritSuccessSound();
      alert('THE FLAMES OF THE DUNGEON BURN ETERNAL! (+1 to all Saving Throws)');
    });
  });
}

function triggerGodMode() {
  window.retroSynth.playCritSuccessSound();
  document.body.classList.add('shake-screen');
  setTimeout(() => document.body.classList.remove('shake-screen'), 600);

  const banner = document.createElement('div');
  banner.style.position = 'fixed';
  banner.style.top = '30%';
  banner.style.left = '50%';
  banner.style.transform = 'translate(-50%, -50%)';
  banner.style.background = '#ff0000';
  banner.style.color = '#ffff00';
  banner.style.padding = '30px 40px';
  banner.style.border = '6px outset #ffff00';
  banner.style.boxShadow = '0 0 40px #ff0000';
  banner.style.fontFamily = "'Impact', 'Arial Black', sans-serif";
  banner.style.fontSize = '26px';
  banner.style.textAlign = 'center';
  banner.style.zIndex = '999999';
  banner.innerHTML = `
    <div style="font-size: 38px;">&#128009; GOD MODE ACTIVATED! &#128009;</div>
    <div style="margin: 10px 0; font-size: 18px; color: #fff;">
      THAC0 REDUCED TO 0! ALL SAVING THROWS ARE AT 1!
    </div>
    <div style="font-size: 14px; font-family: 'Courier New', monospace; color: #00ffff;">
      Gary Gygax &amp; Mike Pondsmith smile upon thee from the Astral Plane.
    </div>
    <button class="win95-btn" style="margin-top: 15px; padding: 8px 16px; font-size: 14px;" onclick="this.parentElement.remove()">
      CONTINUE QUESTING
    </button>
  `;
  document.body.appendChild(banner);
}
