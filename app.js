// ── The Rail — app logic: Firebase sync, rendering, CocktailDB ────────
(function () {
  const R = window.Rail;
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  let bottlesState = {};
  let mixersState = {};
  let discoveredRecipes = [];
  let activeTab = 'inventory';
  let activeFilter = 'all';
  let discoveryInFlight = false;
  let lastDiscoveryKey = '';

  // ── Storage adapter: Firebase when configured, localStorage fallback ─
  const Store = (function () {
    const useFirebase = !!window.railDB;
    let bottleCb = null;
    let mixerCb = null;

    function lsGet(key) {
      try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; }
    }
    function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

    return {
      useFirebase,

      onBottles(cb) {
        bottleCb = cb;
        if (useFirebase) {
          window.railDB.ref('bar-inventory/bottles').on('value', (snap) => cb(snap.val() || {}));
        } else {
          cb(lsGet('rail_bottles'));
        }
      },
      onMixers(cb) {
        mixerCb = cb;
        if (useFirebase) {
          window.railDB.ref('bar-inventory/mixers').on('value', (snap) => cb(snap.val() || {}));
        } else {
          cb(lsGet('rail_mixers'));
        }
      },
      addBottle(bottle) {
        if (useFirebase) {
          window.railDB.ref('bar-inventory/bottles').push(bottle);
        } else {
          const all = lsGet('rail_bottles');
          all['b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)] = bottle;
          lsSet('rail_bottles', all);
          bottleCb && bottleCb(all);
        }
      },
      updateBottleLevel(id, level) {
        if (useFirebase) {
          window.railDB.ref('bar-inventory/bottles/' + id + '/level').set(level);
        } else {
          const all = lsGet('rail_bottles');
          if (all[id]) all[id].level = level;
          lsSet('rail_bottles', all);
          bottleCb && bottleCb(all);
        }
      },
      removeBottle(id) {
        if (useFirebase) {
          window.railDB.ref('bar-inventory/bottles/' + id).remove();
        } else {
          const all = lsGet('rail_bottles');
          delete all[id];
          lsSet('rail_bottles', all);
          bottleCb && bottleCb(all);
        }
      },
      setMixer(id, data) {
        if (useFirebase) {
          window.railDB.ref('bar-inventory/mixers/' + id).update(data);
        } else {
          const all = lsGet('rail_mixers');
          all[id] = Object.assign({}, all[id], data);
          lsSet('rail_mixers', all);
          mixerCb && mixerCb(all);
        }
      },
      removeMixer(id) {
        if (useFirebase) {
          window.railDB.ref('bar-inventory/mixers/' + id).remove();
        } else {
          const all = lsGet('rail_mixers');
          delete all[id];
          lsSet('rail_mixers', all);
          mixerCb && mixerCb(all);
        }
      },
      async getCache(key) {
        if (useFirebase) {
          const snap = await window.railDB.ref('bar-inventory/recipe-cache/' + key).once('value');
          return snap.val();
        }
        const all = lsGet('rail_cache');
        return all[key] || null;
      },
      async setCache(key, entry) {
        if (useFirebase) {
          await window.railDB.ref('bar-inventory/recipe-cache/' + key).set(entry);
        } else {
          const all = lsGet('rail_cache');
          all[key] = entry;
          lsSet('rail_cache', all);
        }
      },
    };
  })();

  function sanitizeKey(s) {
    return String(s).toLowerCase().replace(/[.#$/\[\]\s]+/g, '_');
  }

  async function cachedFetch(key, fetchFn) {
    const safeKey = sanitizeKey(key);
    try {
      const cached = await Store.getCache(safeKey);
      if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL_MS) {
        return cached.data;
      }
    } catch (e) { /* cache read failed, fall through to fetch */ }
    const data = await fetchFn();
    Store.setCache(safeKey, { data, ts: Date.now() }).catch(() => {});
    return data;
  }

  // ── CocktailDB discovery ───────────────────────────────────────────
  async function fetchDiscovered() {
    const stockedCategories = R.CATEGORIES
      .map((c) => c.id)
      .filter((cat) => R.hasCategoryStock(bottlesState, cat));

    const terms = new Set();
    stockedCategories.forEach((cat) => {
      (R.COCKTAILDB_TERMS[cat] || []).forEach((t) => terms.add(t));
    });
    if (terms.size === 0) return [];

    const drinkIds = new Map();
    for (const term of terms) {
      try {
        const result = await cachedFetch('filter_' + term, async () => {
          const res = await fetch(
            'https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=' + encodeURIComponent(term)
          );
          const json = await res.json();
          return (json.drinks || []).map((d) => ({ id: d.idDrink, name: d.strDrink }));
        });
        (result || []).forEach((d) => drinkIds.set(d.id, d.name));
      } catch (e) {
        console.warn('[The Rail] filter fetch failed for', term, e);
      }
    }

    const curatedNames = new Set(R.CURATED_RECIPES.map((r) => R.normalize(r.name)));
    const discovered = [];
    for (const [id, name] of drinkIds) {
      if (curatedNames.has(R.normalize(name))) continue;
      try {
        const detail = await cachedFetch('lookup_' + id, async () => {
          const res = await fetch('https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=' + id);
          const json = await res.json();
          const d = json.drinks && json.drinks[0];
          if (!d) return null;
          const ingredients = [];
          for (let i = 1; i <= 15; i++) {
            const ing = d['strIngredient' + i];
            const measure = d['strMeasure' + i];
            if (ing && ing.trim()) {
              ingredients.push({ ingredient: ing.trim(), measure: measure ? measure.trim() : '' });
            }
          }
          return { name: d.strDrink, ingredients, thumb: d.strDrinkThumb };
        });
        if (detail) discovered.push(detail);
      } catch (e) {
        console.warn('[The Rail] lookup fetch failed for', id, e);
      }
    }
    return discovered;
  }

  async function refreshDiscoveredIfNeeded() {
    const stockedKey = R.CATEGORIES
      .map((c) => c.id)
      .filter((cat) => R.hasCategoryStock(bottlesState, cat))
      .sort()
      .join(',');
    if (stockedKey === lastDiscoveryKey && discoveredRecipes.length) return;
    if (discoveryInFlight) return;
    discoveryInFlight = true;
    setSyncStatus('Looking up cocktails…');
    try {
      discoveredRecipes = await fetchDiscovered();
      lastDiscoveryKey = stockedKey;
    } catch (e) {
      console.warn('[The Rail] discovery failed', e);
    } finally {
      discoveryInFlight = false;
      setSyncStatus('');
      renderSuggestions();
    }
  }

  function setSyncStatus(text) {
    const el = document.getElementById('sync-status');
    if (el) el.textContent = text;
  }

  // ── Rendering: Inventory tab ───────────────────────────────────────
  function renderInventory() {
    const container = document.getElementById('bottle-groups');
    container.innerHTML = '';

    const grouped = {};
    R.CATEGORIES.forEach((c) => (grouped[c.id] = []));
    Object.entries(bottlesState).forEach(([id, b]) => {
      if (!b) return;
      (grouped[b.category] || grouped.Other).push(Object.assign({ id }, b));
    });

    let anyBottles = false;
    R.CATEGORIES.forEach((cat) => {
      const bottles = grouped[cat.id];
      if (!bottles || bottles.length === 0) return;
      anyBottles = true;
      bottles.sort((a, b) => a.name.localeCompare(b.name));

      const group = document.createElement('section');
      group.className = 'category-group';
      group.innerHTML =
        '<h3 class="category-heading">' + cat.emoji + ' ' + esc(cat.label) + '</h3>';

      const list = document.createElement('ul');
      list.className = 'bottle-list';
      bottles.forEach((b) => list.appendChild(renderBottleRow(b)));
      group.appendChild(list);
      container.appendChild(group);
    });

    if (!anyBottles) {
      container.innerHTML = '<p class="empty-state">No bottles yet — add your first one above.</p>';
    }
  }

  function renderBottleRow(bottle) {
    const li = document.createElement('li');
    li.className = 'bottle-row level-' + bottle.level;

    const name = document.createElement('span');
    name.className = 'bottle-name';
    name.textContent = bottle.name;

    const levelBtn = document.createElement('button');
    levelBtn.className = 'level-pill level-' + bottle.level;
    levelBtn.type = 'button';
    levelBtn.textContent = levelLabel(bottle.level);
    levelBtn.title = 'Tap to cycle: Full → Low → Empty';
    levelBtn.addEventListener('click', () => {
      const idx = R.LEVELS.indexOf(bottle.level);
      const next = R.LEVELS[(idx + 1) % R.LEVELS.length];
      Store.updateBottleLevel(bottle.id, next);
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'icon-btn remove-btn';
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', 'Remove ' + bottle.name);
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      if (confirm('Remove "' + bottle.name + '" from the bar?')) {
        Store.removeBottle(bottle.id);
      }
    });

    li.appendChild(name);
    li.appendChild(levelBtn);
    li.appendChild(removeBtn);
    return li;
  }

  function levelLabel(level) {
    return level === 'full' ? 'Full' : level === 'low' ? 'Low' : 'Empty';
  }

  function renderMixerChips() {
    const container = document.getElementById('mixer-chips');
    container.innerHTML = '';

    const customIds = Object.keys(mixersState).filter(
      (id) => !R.DEFAULT_MIXERS.some((m) => m.id === id)
    );

    R.DEFAULT_MIXERS.forEach((m) => {
      const present = !!(mixersState[m.id] && mixersState[m.id].present);
      container.appendChild(renderChip(m.id, m.name, present, false));
    });
    customIds.forEach((id) => {
      const m = mixersState[id];
      if (!m) return;
      container.appendChild(renderChip(id, m.name, !!m.present, true));
    });
  }

  function renderChip(id, name, present, removable) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'mixer-chip' + (present ? ' present' : '');
    chip.textContent = name;
    chip.addEventListener('click', () => {
      Store.setMixer(id, { name, present: !present });
    });
    if (removable) {
      const x = document.createElement('span');
      x.className = 'chip-remove';
      x.textContent = ' ✕';
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.removeMixer(id);
      });
      chip.appendChild(x);
    }
    return chip;
  }

  // ── Rendering: Suggestions tab ─────────────────────────────────────
  function renderSuggestions() {
    const container = document.getElementById('recipe-cards');
    container.innerHTML = '';

    const curated = R.CURATED_RECIPES.map((r) =>
      R.computeCuratedStatus(r, bottlesState, mixersState)
    );
    const discovered = discoveredRecipes.map((d) =>
      R.computeDiscoveredStatus(d.name, d.ingredients, bottlesState, mixersState)
    );

    let all = curated.concat(discovered);
    all.sort((a, b) => a.missing - b.missing || a.name.localeCompare(b.name));

    if (activeFilter === 'ready') all = all.filter((r) => r.ready);
    if (activeFilter === 'one-away') all = all.filter((r) => !r.ready && r.missing === 1);

    if (all.length === 0) {
      container.innerHTML = '<p class="empty-state">No matches yet — add some bottles to see suggestions.</p>';
      return;
    }

    all.forEach((r) => container.appendChild(renderRecipeCard(r)));
  }

  function renderRecipeCard(r) {
    const card = document.createElement('article');
    card.className = 'recipe-card' + (r.ready ? ' ready' : '');

    const header = document.createElement('div');
    header.className = 'recipe-header';
    header.innerHTML =
      '<h3 class="recipe-name">' + esc(r.name) + '</h3>' +
      '<span class="source-tag source-' + r.source + '">' +
      (r.source === 'house' ? 'House' : 'Discovered') + '</span>';

    const badge = document.createElement('span');
    badge.className = 'status-badge' + (r.ready ? ' ready' : ' missing');
    badge.textContent = r.ready ? 'Ready' : 'Missing ' + r.missing;
    header.appendChild(badge);

    const list = document.createElement('ul');
    list.className = 'ingredient-list';
    r.required.forEach((ing) => {
      const li = document.createElement('li');
      li.className = ing.have ? 'have' : 'missing-required';
      li.textContent = (ing.have ? '✓ ' : '✗ ') + ing.label;
      list.appendChild(li);
    });
    r.optional.forEach((ing) => {
      const li = document.createElement('li');
      li.className = 'optional ' + (ing.have ? 'have' : 'missing-optional');
      li.textContent = (ing.have ? '✓ ' : '· ') + ing.label + ' (optional)';
      list.appendChild(li);
    });

    card.appendChild(header);
    card.appendChild(list);
    return card;
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Tabs & filters ──────────────────────────────────────────────────
  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
    document.querySelectorAll('.tab-panel').forEach((p) =>
      p.classList.toggle('active', p.id === 'tab-' + tab)
    );
    if (tab === 'suggestions') {
      renderSuggestions();
      refreshDiscoveredIfNeeded();
    }
  }

  function switchFilter(filter) {
    activeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.filter === filter)
    );
    renderSuggestions();
  }

  // ── Form handlers ──────────────────────────────────────────────────
  function initForm() {
    const form = document.getElementById('add-bottle-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('bottle-name');
      const categorySelect = document.getElementById('bottle-category');
      const name = nameInput.value.trim();
      if (!name) return;
      Store.addBottle({ name, category: categorySelect.value, level: 'full' });
      nameInput.value = '';
      nameInput.focus();
    });

    const categorySelect = document.getElementById('bottle-category');
    R.CATEGORIES.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.emoji + ' ' + c.label;
      categorySelect.appendChild(opt);
    });

    const mixerForm = document.getElementById('add-mixer-form');
    mixerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('mixer-name');
      const name = input.value.trim();
      if (!name) return;
      const id = R.normalize(name).replace(/\s+/g, '-');
      Store.setMixer(id, { name, present: true });
      input.value = '';
      input.focus();
    });

    document.querySelectorAll('.tab-btn').forEach((btn) =>
      btn.addEventListener('click', () => switchTab(btn.dataset.tab))
    );
    document.querySelectorAll('.filter-btn').forEach((btn) =>
      btn.addEventListener('click', () => switchFilter(btn.dataset.filter))
    );
  }

  // ── Boot ────────────────────────────────────────────────────────────
  function boot() {
    initForm();
    if (!Store.useFirebase) setSyncStatus('Local mode — set up Firebase to sync across devices.');

    Store.onBottles((bottles) => {
      bottlesState = bottles || {};
      renderInventory();
      if (activeTab === 'suggestions') {
        renderSuggestions();
        refreshDiscoveredIfNeeded();
      }
    });
    Store.onMixers((mixers) => {
      mixersState = mixers || {};
      renderMixerChips();
      if (activeTab === 'suggestions') renderSuggestions();
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
