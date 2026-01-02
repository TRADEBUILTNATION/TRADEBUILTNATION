(function () {
  // Set current year in the sticky legal footer (if present).
  const yearEls = Array.from(document.querySelectorAll('[data-year]'));
  if (yearEls.length) {
    const year = String(new Date().getFullYear());
    for (const el of yearEls) {
      if (el instanceof HTMLElement) el.textContent = year;
    }
  }

  const toggle = document.querySelector('.nav-toggle');
  const panel = document.querySelector('#primary-menu');
  const links = Array.from(document.querySelectorAll('a.nav-link'));
  const actionLinks = Array.from(document.querySelectorAll('.nav-actions a.btn'));
  const brand = document.querySelector('.brand');
  const dropdownContainers = Array.from(document.querySelectorAll('.nav-item--dropdown'));
  const dropdownItems = Array.from(document.querySelectorAll('.dropdown-item'));

  if (!toggle || !panel) return;

  function normalizePageKey(url) {
    const path = url.pathname || '';
    const parts = path.split('/').filter(Boolean);
    const lastRaw = (parts[parts.length - 1] || '').toLowerCase();
    const last = lastRaw.replace(/\.html$/, '');
    if (last === '' || last === 'index') return 'index';
    return last;
  }

  function clearActive() {
    const active = Array.from(document.querySelectorAll('[aria-current="page"]'));
    for (const el of active) el.removeAttribute('aria-current');
  }

  function closeAllDropdowns() {
    for (const el of dropdownContainers) {
      if (!(el instanceof HTMLElement)) continue;
      el.dataset.open = 'false';

      const btn = el.querySelector('.dropdown-toggle');
      if (btn instanceof HTMLElement) btn.setAttribute('aria-expanded', 'false');

      const menu = el.querySelector('.dropdown-menu');
      if (menu instanceof HTMLElement) menu.dataset.state = 'closed';
    }
  }

  function setDropdownOpen(container, nextOpen) {
    if (!(container instanceof HTMLElement)) return;
    closeAllDropdowns();

    container.dataset.open = String(Boolean(nextOpen));
    const btn = container.querySelector('.dropdown-toggle');
    if (btn instanceof HTMLElement) btn.setAttribute('aria-expanded', String(Boolean(nextOpen)));

    const menu = container.querySelector('.dropdown-menu');
    if (menu instanceof HTMLElement) menu.dataset.state = nextOpen ? 'open' : 'closed';
  }

  function setActiveElements(nextEls) {
    clearActive();
    for (const el of nextEls) {
      if (el instanceof HTMLElement) el.setAttribute('aria-current', 'page');
    }
  }

  function getHomeLink() {
    return links.find((a) => {
      try {
        const u = new URL(a.href);
        const key = normalizePageKey(u);
        return u.hash === '' && key === 'index';
      } catch {
        return false;
      }
    });
  }

  function syncActiveFromLocation() {
    const here = new URL(window.location.href);
    const currentKey = normalizePageKey(here);
    const hash = window.location.hash;
    const sectionKey = currentKey.startsWith('hvacr-') ? 'hvacr' : currentKey;

    if (hash) {
      const match = links.find((a) => {
        try {
          const u = new URL(a.href);
          return normalizePageKey(u) === currentKey && u.hash === hash;
        } catch {
          return false;
        }
      });
      if (match) return setActiveElements([match]);

      // Hash match for dropdown items (e.g. calculators.html#some-calculator)
      const ddHashMatch = dropdownItems.find((a) => {
        try {
          const u = new URL(a.href);
          return normalizePageKey(u) === currentKey && u.hash === hash;
        } catch {
          return false;
        }
      });
      if (ddHashMatch instanceof HTMLElement) {
        const container = ddHashMatch.closest('.nav-item--dropdown');
        const parentToggle = container ? container.querySelector('.dropdown-toggle') : null;
        const els = [ddHashMatch];
        if (parentToggle instanceof HTMLElement) els.push(parentToggle);
        return setActiveElements(els);
      }
    }

    // Exact page match for top-level links + action buttons (e.g. get-started.html).
    const pageMatch = [...links, ...actionLinks].find((a) => {
      try {
        const u = new URL(a.href);
        return normalizePageKey(u) === currentKey && u.hash === '';
      } catch {
        return false;
      }
    });
    if (pageMatch) return setActiveElements([pageMatch]);

    // Page match for dropdown items (e.g. hvacr.html) + also underline the parent dropdown toggle.
    const ddMatch = dropdownItems.find((a) => {
      try {
        const u = new URL(a.href);
        // Only treat full-page dropdown items (no hash) as direct "page matches".
        return normalizePageKey(u) === currentKey && u.hash === '';
      } catch {
        return false;
      }
    });
    if (ddMatch instanceof HTMLElement) {
      const container = ddMatch.closest('.nav-item--dropdown');
      const parentToggle = container ? container.querySelector('.dropdown-toggle') : null;
      const els = [ddMatch];
      if (parentToggle instanceof HTMLElement) els.push(parentToggle);
      return setActiveElements(els);
    }

    // Treat detail pages as belonging to their parent section page.
    // Example: hvacr-fundamentals.html should keep its parent section underlined in the nav.
    if (sectionKey !== currentKey) {
      const sectionItem = dropdownItems.find((a) => {
        try {
          const u = new URL(a.href);
          return normalizePageKey(u) === sectionKey && u.hash === '';
        } catch {
          return false;
        }
      });
      if (sectionItem instanceof HTMLElement) {
        const container = sectionItem.closest('.nav-item--dropdown');
        const parentToggle = container ? container.querySelector('.dropdown-toggle') : null;
        const els = [sectionItem];
        if (parentToggle instanceof HTMLElement) els.push(parentToggle);
        return setActiveElements(els);
      }
    }

    // If we're on a page that belongs to a dropdown menu (even if items are hash links),
    // underline the parent toggle so the nav still reflects the current section.
    const parentOnlyMatch = dropdownContainers.find((container) => {
      if (!(container instanceof HTMLElement)) return false;
      const items = Array.from(container.querySelectorAll('.dropdown-item'));
      return items.some((a) => {
        if (!(a instanceof HTMLAnchorElement)) return false;
        try {
          const u = new URL(a.href);
          return normalizePageKey(u) === currentKey || normalizePageKey(u) === sectionKey;
        } catch {
          return false;
        }
      });
    });
    if (parentOnlyMatch instanceof HTMLElement) {
      const parentToggle = parentOnlyMatch.querySelector('.dropdown-toggle');
      if (parentToggle instanceof HTMLElement) return setActiveElements([parentToggle]);
    }

    // Fallback: only underline Home when we're actually on the Home page.
    if (currentKey === 'index') {
      const home = getHomeLink();
      if (home) setActiveElements([home]);
      return;
    }

    // Otherwise, don't guess — leave everything unselected.
    clearActive();
  }

  function setOpen(nextOpen) {
    panel.dataset.state = nextOpen ? 'open' : 'closed';
    toggle.setAttribute('aria-expanded', String(nextOpen));
    toggle.setAttribute('aria-label', nextOpen ? 'Close menu' : 'Open menu');
    if (document.body) document.body.classList.toggle('nav-open', Boolean(nextOpen));
    if (!nextOpen) closeAllDropdowns();
  }

  function isOpen() {
    return panel.dataset.state === 'open';
  }

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  // Active link underline
  for (const a of links) {
    a.addEventListener('click', () => setActiveElements([a]));
  }
  for (const a of actionLinks) {
    a.addEventListener('click', () => setActiveElements([a]));
  }
  for (const a of dropdownItems) {
    a.addEventListener('click', () => {
      const container = a.closest('.nav-item--dropdown');
      const parentToggle = container ? container.querySelector('.dropdown-toggle') : null;
      const els = [a];
      if (parentToggle instanceof HTMLElement) els.push(parentToggle);
      setActiveElements(els);
    });
  }

  // Dropdown toggle (mobile/touch)
  for (const container of dropdownContainers) {
    const btn = container.querySelector('.dropdown-toggle');
    if (!(btn instanceof HTMLElement)) continue;

    btn.addEventListener('click', () => {
      const isOpenNow = container instanceof HTMLElement && container.dataset.open === 'true';
      setDropdownOpen(container, !isOpenNow);
    });

    container.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t instanceof HTMLElement && t.closest('a')) closeAllDropdowns();
    });
  }

  // Treat the logo as "Home" (also closes the menu on mobile).
  if (brand instanceof HTMLElement) {
    brand.addEventListener('click', () => {
      setOpen(false);
      const home = getHomeLink();
      if (home) setActiveElements([home]);
    });
  }

  window.addEventListener('hashchange', syncActiveFromLocation);
  // Apply initial active state, then "arm" underline on next frame so it animates in smoothly.
  requestAnimationFrame(() => {
    syncActiveFromLocation();
    requestAnimationFrame(() => {
      if (document.body) document.body.classList.add('underline-armed');
    });
  });

  // Close on escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      closeAllDropdowns();
    }
  });

  // Close when a link is clicked (mobile)
  panel.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target instanceof HTMLElement && target.closest('a')) setOpen(false);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Node)) return;
    // Close dropdown when clicking outside it (even if inside the open panel).
    let isInsideDropdown = false;
    for (const el of dropdownContainers) {
      if (el instanceof HTMLElement && el.contains(t)) {
        isInsideDropdown = true;
        break;
      }
    }
    if (!isInsideDropdown) closeAllDropdowns();
    if (toggle.contains(t) || panel.contains(t)) return;
    setOpen(false);
  });
})();

(function () {
  // Module experience: progress tracking, outline navigation, active section highlighting.
  const root = document.querySelector('[data-module]');
  if (!(root instanceof HTMLElement)) return;

  if (document.body) document.body.classList.add('module-page');

  // Sync CSS vars so the module can be true "no-scroll" full-screen (header/footer heights vary).
  function syncChromeHeights() {
    const header = document.querySelector('.site-header');
    const footer = document.querySelector('.legal-footer');
    const headerH = header instanceof HTMLElement ? Math.round(header.getBoundingClientRect().height) : 0;
    const footerH = footer instanceof HTMLElement ? Math.round(footer.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--site-header-h', `${headerH}px`);
    document.documentElement.style.setProperty('--legal-footer-h', `${footerH || 44}px`);
  }
  syncChromeHeights();
  window.addEventListener('resize', syncChromeHeights);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', syncChromeHeights);

  const moduleKey = root.getAttribute('data-module') || 'unknown-module';
  const storageKey = `tb:module-state:${moduleKey}`;

  const progressEl = root.querySelector('[data-module-progress]');
  const progressFill = root.querySelector('[data-module-progress-fill]');
  const progressText = root.querySelector('[data-module-progress-text]');

  const resetBtn = root.querySelector('[data-module-reset]');
  const statusEl = root.querySelector('[data-module-status]');

  const sectionEls = Array.from(root.querySelectorAll('[data-module-section]')).filter(
    (el) => el instanceof HTMLElement
  );
  const sectionKeys = sectionEls
    .map((el) => (el instanceof HTMLElement ? el.getAttribute('data-module-section') || el.id : null))
    .filter((v) => typeof v === 'string' && v.length > 0);

  let statusTimer = null;
  function setStatus(message, tone = 'neutral') {
    if (!(statusEl instanceof HTMLElement)) return;
    if (statusTimer) window.clearTimeout(statusTimer);
    statusEl.textContent = message || '';
    statusEl.dataset.tone = tone;
    statusTimer = window.setTimeout(() => {
      statusEl.textContent = '';
      statusEl.dataset.tone = 'neutral';
    }, 2400);
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return { current: sectionKeys[0] || null };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return { current: sectionKeys[0] || null };
      const current = typeof parsed.current === 'string' ? parsed.current : sectionKeys[0] || null;
      return { current };
    } catch {
      return { current: sectionKeys[0] || null };
    }
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  function indexOfKey(key) {
    return sectionKeys.indexOf(key);
  }

  function updateProgressUI(state) {
    const total = Math.max(1, sectionKeys.length);
    const current = typeof state.current === 'string' ? state.current : sectionKeys[0];
    const idx = Math.max(0, indexOfKey(current));
    const step = Math.min(total, idx + 1);
    const percent = Math.round((step / total) * 100);

    if (progressFill instanceof HTMLElement) progressFill.style.width = `${percent}%`;
    if (progressText instanceof HTMLElement) {
      progressText.textContent = `Lesson ${step} of ${total}`;
    }
    if (progressEl instanceof HTMLElement) {
      progressEl.setAttribute('aria-valuenow', String(percent));
    }
  }

  function syncRowStates(state) {
    const rows = Array.from(root.querySelectorAll('.module-objectives__row')).filter(
      (el) => el instanceof HTMLElement
    );
    for (const row of rows) {
      if (!(row instanceof HTMLElement)) continue;
      const link = row.querySelector('[data-module-jump]');
      if (!(link instanceof HTMLElement)) continue;
      const key = link.getAttribute('data-module-jump') || '';
      row.dataset.active = typeof state.current === 'string' && state.current === key ? 'true' : 'false';
    }
  }

  function getActiveSectionEl(state) {
    const key = typeof state.current === 'string' ? state.current : sectionKeys[0];
    const el = root.querySelector(`[data-module-section="${CSS.escape(key)}"]`);
    return el instanceof HTMLElement ? el : null;
  }

  function syncBottomNav(state) {
    const current = typeof state.current === 'string' ? state.current : sectionKeys[0];
    const idx = indexOfKey(current);
    const prevKey = sectionKeys[idx - 1] || null;
    const nextKey = sectionKeys[idx + 1] || null;

    const activeSection = getActiveSectionEl(state);
    if (!activeSection) return;

    const prevBtns = Array.from(activeSection.querySelectorAll('[data-module-prev]')).filter(
      (el) => el instanceof HTMLButtonElement
    );
    const nextBtns = Array.from(activeSection.querySelectorAll('[data-module-next]')).filter(
      (el) => el instanceof HTMLButtonElement
    );

    for (const b of prevBtns) b.disabled = !prevKey;
    for (const b of nextBtns) {
      b.disabled = false; // Finish is allowed
    }
  }

  function setActiveSection(key, state, opts = { focus: true }) {
    const nextKey = key;
    if (!nextKey) return;

    state.current = nextKey;
    saveState(state);

    for (const el of sectionEls) {
      if (!(el instanceof HTMLElement)) continue;
      const k = el.getAttribute('data-module-section') || el.id;
      el.hidden = k !== nextKey;
    }

    // Outline active state (reuse existing data-active styling)
    const outlineLinks = Array.from(root.querySelectorAll('[data-module-outline-link]')).filter(
      (el) => el instanceof HTMLAnchorElement
    );
    for (const a of outlineLinks) {
      if (!(a instanceof HTMLAnchorElement)) continue;
      const k = a.getAttribute('data-module-jump') || '';
      a.dataset.active = k === nextKey ? 'true' : 'false';
    }
    syncRowStates(state);
    syncBottomNav(state);
    updateProgressUI(state);

    // Focus the section for accessibility.
    if (opts && opts.focus) {
      const target = root.querySelector(`[data-module-section="${CSS.escape(nextKey)}"]`);
      if (target instanceof HTMLElement) {
        window.setTimeout(() => target.focus({ preventScroll: true }), 0);
      }
    }
  }

  // Init state
  const state = loadState();
  updateProgressUI(state);
  syncRowStates(state);

  // Outline navigation becomes "switch section" in the player.
  const outlineLinks = Array.from(root.querySelectorAll('[data-module-outline-link]')).filter(
    (el) => el instanceof HTMLAnchorElement
  );
  for (const a of outlineLinks) {
    if (!(a instanceof HTMLAnchorElement)) continue;
    a.addEventListener('click', (e) => {
      const key = a.getAttribute('data-module-jump');
      if (!key) return;
      e.preventDefault();
      setActiveSection(key, state, { focus: true });
    });
  }

  // Player next/prev
  function goPrev() {
    const current = typeof state.current === 'string' ? state.current : sectionKeys[0];
    const idx = indexOfKey(current);
    const prevKey = sectionKeys[idx - 1];
    if (prevKey) setActiveSection(prevKey, state, { focus: true });
  }
  function goNext() {
    const current = typeof state.current === 'string' ? state.current : sectionKeys[0];
    const idx = indexOfKey(current);
    const nextKey = sectionKeys[idx + 1];
    if (!nextKey) {
      // Finish
      saveState(state);
      updateProgressUI(state);
      syncRowStates(state);
      syncBottomNav(state);
      setStatus('Module complete.', 'neutral');
      return;
    }
    setActiveSection(nextKey, state, { focus: true });
  }

  // Bottom nav buttons exist per section; attach listeners to all of them.
  const prevButtons = Array.from(root.querySelectorAll('[data-module-prev]')).filter(
    (el) => el instanceof HTMLButtonElement
  );
  const nextButtons = Array.from(root.querySelectorAll('[data-module-next]')).filter(
    (el) => el instanceof HTMLButtonElement
  );
  for (const b of prevButtons) b.addEventListener('click', goPrev);
  for (const b of nextButtons) b.addEventListener('click', goNext);

  // Initial section: resume if valid, otherwise pick first.
  const resumeKey = typeof state.current === 'string' ? state.current : sectionKeys[0];
  const initialKey = resumeKey && indexOfKey(resumeKey) >= 0 ? resumeKey : sectionKeys[0];
  setActiveSection(initialKey, state, { focus: false });
  syncBottomNav(state);

  // Reset progress
  if (resetBtn instanceof HTMLButtonElement) {
    resetBtn.addEventListener('click', () => {
      const ok = window.confirm('Reset module progress? This will uncheck all completed sections.');
      if (!ok) return;
      state.current = sectionKeys[0] || null;
      saveState(state);
      updateProgressUI(state);
      syncRowStates(state);
      const first = sectionKeys[0] || null;
      if (first) setActiveSection(first, state, { focus: false });
    });
  }

})();

(function () {
  // 3D models page: populate list from manifest + load selected model into <model-viewer>.
  const root = document.querySelector('[data-models-page]');
  if (!(root instanceof HTMLElement)) return;

  const listEl = root.querySelector('[data-models-list]');
  const statusEl = root.querySelector('[data-models-status]');
  const viewer = root.querySelector('[data-model-viewer]');
  const activeNameEl = root.querySelector('[data-models-active-name]');

  if (!(listEl instanceof HTMLElement) || !(viewer instanceof HTMLElement)) return;

  function setStatus(message, isError = false) {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = message || '';
    statusEl.style.color = isError ? '#ff453a' : '';
    if (isError) console.error('[3D Models]', message);
  }

  // Check if running from file:// protocol (won't work)
  if (window.location.protocol === 'file:') {
    setStatus('Cannot load models from file://. Please run a local server (e.g., "npx serve" or "python -m http.server").', true);
    if (activeNameEl instanceof HTMLElement) activeNameEl.textContent = 'Server required';
    return;
  }

  function encodePath(path) {
    // Encode each segment so spaces and other chars work (e.g. "3D Models" folder, filenames).
    return String(path)
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/')
      .replace(/%2F/g, '/');
  }

  function normalizeManifest(raw) {
    // Supports:
    // - { basePath: "assets/3D Models/", models: [{file,name}, ...] }
    // - ["a.glb", "b.glb"]
    if (Array.isArray(raw)) {
      return { basePath: 'assets/3D Models/', models: raw.map((f) => ({ file: String(f) })) };
    }
    if (!raw || typeof raw !== 'object') return { basePath: 'assets/3D Models/', models: [] };

    const basePath = typeof raw.basePath === 'string' && raw.basePath.trim() ? raw.basePath : 'assets/3D Models/';
    const models = Array.isArray(raw.models) ? raw.models : [];
    return {
      basePath,
      models: models
        .map((m) => {
          if (typeof m === 'string') return { file: m };
          if (m && typeof m === 'object' && typeof m.file === 'string') {
            return { file: m.file, name: typeof m.name === 'string' ? m.name : undefined };
          }
          return null;
        })
        .filter(Boolean),
    };
  }

  function displayNameFor(model) {
    const file = String(model.file || '');
    const fromName = typeof model.name === 'string' && model.name.trim() ? model.name.trim() : '';
    if (fromName) return fromName;
    return file.replace(/\.(glb|gltf)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled model';
  }

  function modelSrc(basePath, file) {
    const base = String(basePath || 'assets/3D Models/');
    const joined = base.endsWith('/') ? `${base}${file}` : `${base}/${file}`;
    return encodePath(joined);
  }

  function setActiveButton(btn) {
    const buttons = Array.from(listEl.querySelectorAll('button.model-item'));
    for (const b of buttons) {
      if (!(b instanceof HTMLButtonElement)) continue;
      b.setAttribute('aria-current', b === btn ? 'true' : 'false');
    }
  }

  function selectModel(entry, btn, manifest) {
    const name = displayNameFor(entry);
    const src = modelSrc(manifest.basePath, entry.file);

    console.log('[3D Models] Loading model:', src);
    viewer.setAttribute('src', src);
    viewer.setAttribute('alt', name);
    if (activeNameEl instanceof HTMLElement) activeNameEl.textContent = name;

    if (btn instanceof HTMLButtonElement) setActiveButton(btn);
    setStatus(`Loaded: ${name}`);
  }

  async function init() {
    setStatus('Loading model list…');

    // Wait for model-viewer custom element to be defined
    if (!customElements.get('model-viewer')) {
      setStatus('Waiting for model-viewer component…');
      try {
        await Promise.race([
          customElements.whenDefined('model-viewer'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]);
      } catch (e) {
        setStatus('Failed to load 3D viewer component. Check your internet connection and refresh.', true);
        if (activeNameEl instanceof HTMLElement) activeNameEl.textContent = 'Viewer unavailable';
        return;
      }
    }

    let manifest;
    try {
      const res = await fetch(`assets/models.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
      const raw = await res.json();
      manifest = normalizeManifest(raw);
    } catch (err) {
      console.error('[3D Models] Failed to load manifest:', err);
      setStatus('Could not load models list. Run a local server (e.g., "npx serve") and refresh.', true);
      if (activeNameEl instanceof HTMLElement) activeNameEl.textContent = 'Error loading';
      return;
    }

    const models = (manifest.models || [])
      .filter((m) => m && typeof m.file === 'string' && /\.(glb|gltf)$/i.test(m.file))
      .slice()
      .sort((a, b) => displayNameFor(a).localeCompare(displayNameFor(b)));

    if (!models.length) {
      setStatus('No models found in the manifest.');
      if (activeNameEl instanceof HTMLElement) activeNameEl.textContent = 'No models available';
      return;
    }

    // Render list
    listEl.innerHTML = '';
    for (const entry of models) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'model-item';
      btn.innerHTML = `<span class="model-item__name"></span><span class="model-item__meta">.glb</span>`;

      const nameEl = btn.querySelector('.model-item__name');
      const metaEl = btn.querySelector('.model-item__meta');
      if (nameEl) nameEl.textContent = displayNameFor(entry);
      if (metaEl) metaEl.textContent = (String(entry.file).split('.').pop() || '').toLowerCase();

      btn.addEventListener('click', () => selectModel(entry, btn, manifest));
      li.appendChild(btn);
      listEl.appendChild(li);
    }

    // Listen for model-viewer errors
    viewer.addEventListener('error', (e) => {
      console.error('[3D Models] Model viewer error:', e);
      setStatus('Failed to load 3D model. The file may be missing or corrupted.', true);
    });

    // Load first model by default
    const firstBtn = listEl.querySelector('button.model-item');
    const first = models[0];
    if (first && firstBtn instanceof HTMLButtonElement) {
      console.log('[3D Models] Auto-loading first model');
      selectModel(first, firstBtn, manifest);
    }
  }

  init();
})();