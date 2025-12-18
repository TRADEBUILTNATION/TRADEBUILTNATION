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

      // Hash match for dropdown items (e.g. resources.html#some-calculator)
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

    // If we're on a page that belongs to a dropdown menu (even if items are hash links),
    // underline the parent toggle so the nav still reflects the current section.
    const parentOnlyMatch = dropdownContainers.find((container) => {
      if (!(container instanceof HTMLElement)) return false;
      const items = Array.from(container.querySelectorAll('.dropdown-item'));
      return items.some((a) => {
        if (!(a instanceof HTMLAnchorElement)) return false;
        try {
          const u = new URL(a.href);
          return normalizePageKey(u) === currentKey;
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

  // Courses dropdown toggle (mobile/touch)
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
