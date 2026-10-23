/* =========================================================
   Mahmoud Sallam · Portfolio, vanilla JS, no dependencies
   ========================================================= */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  document.documentElement.classList.remove('no-js');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const mobile = matchMedia('(max-width: 640px)');

  // Start ambient wallpaper drift once the page has settled
  const startAmbient = () => (window.requestIdleCallback || setTimeout)(() => document.documentElement.classList.add('is-idle'), { timeout: 2500 });
  if (document.readyState === 'complete') startAmbient();
  else addEventListener('load', startAmbient, { once: true });

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Scroll reveal ---------- */
  // data-stagger sets a small delay. Mod 4 keeps late items (e.g. card #9) from waiting too long.
  $$('.animate-on-scroll').forEach((el) => {
    const i = Number(el.dataset.stagger || 0);
    el.style.setProperty('--d', `${(i % 4) * 80}ms`);
  });

  const revealer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in-view');
          revealer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
    : null;

  const observe = (els) => {
    els.forEach((el) => {
      if (el.classList.contains('in-view')) return;
      if (!revealer) { el.classList.add('in-view'); return; }
      revealer.unobserve(el); // re-observe so newly shown elements get a fresh intersection check
      revealer.observe(el);
    });
  };
  observe($$('.animate-on-scroll'));

  /* ---------- Navbar: mobile menu ---------- */
  const navToggle = $('.nav-toggle');
  const menu = $('#mobile-menu');

  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  navToggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('pointerdown', (e) => {
    if (menu.classList.contains('is-open') && !menu.contains(e.target) && !navToggle.contains(e.target)) setMenu(false);
  });
  matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Navbar: active section ---------- */
  const navLinks = $$('.nav-links a, .mobile-menu a:not(.btn)');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach((s) => spy.observe(s));
  }

  /* ---------- Projects: filters + collapse ---------- */
  const grid = $('.projects-grid');
  const projectCards = $$('.project-card', grid);
  const projectsToggle = $('.projects-toggle');
  const pills = $$('.filter-pill');
  const indicator = $('.filter-indicator');
  let activeFilter = 'all';
  let expanded = false;

  const moveIndicator = () => {
    const active = $('.filter-pill.is-active');
    if (!active || !indicator) return;
    indicator.style.setProperty('--x', `${active.offsetLeft}px`);
    indicator.style.setProperty('--w', `${active.offsetWidth}px`);
  };

  const syncProjectsToggle = () => {
    const limit = mobile.matches ? 3 : 6;
    const isAll = activeFilter === 'all';
    grid.classList.toggle('collapsed', isAll && !expanded);
    projectsToggle.hidden = !isAll || projectCards.length <= limit;
    projectsToggle.textContent = expanded ? 'Show Less' : 'Show More';
    projectsToggle.setAttribute('aria-expanded', String(expanded));
  };

  const applyFilter = (filter) => {
    activeFilter = filter;
    expanded = false;
    projectCards.forEach((card) => {
      const tags = (card.dataset.tags || '').split(/\s+/);
      card.style.display = filter === 'all' || tags.includes(filter) ? '' : 'none';
    });
    syncProjectsToggle();
    observe(projectCards);
  };

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => {
        const on = p === pill;
        p.classList.toggle('is-active', on);
        p.setAttribute('aria-selected', String(on));
      });
      moveIndicator();
      applyFilter(pill.dataset.filter);
    });
  });

  projectsToggle.addEventListener('click', () => {
    expanded = !expanded;
    syncProjectsToggle();
    if (expanded) observe(projectCards); // newly shown cards need their reveal to fire
    else grid.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });

  mobile.addEventListener('change', syncProjectsToggle);
  addEventListener('resize', moveIndicator, { passive: true });
  if (document.fonts) document.fonts.ready.then(moveIndicator);
  moveIndicator();
  syncProjectsToggle();

  /* ---------- Tilt + spotlight (pointer devices only) ---------- */
  const enableTilt = () => finePointer.matches && !reducedMotion.matches;
  $$('.tilt-card').forEach((card) => {
    let frame = 0;
    card.addEventListener('pointermove', (e) => {
      if (!enableTilt() || e.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 6).toFixed(2)}deg) rotateY(${((x - 0.5) * 6).toFixed(2)}deg)`;
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      });
    });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      card.style.transform = '';
    });
  });

  /* ---------- Certificates: count sync, collapse, preload, lightbox ---------- */
  const certsGrid = $('.certs-grid');
  const certCards = $$('.cert-card', certsGrid);
  const certsToggle = $('.certs-toggle');
  const certsEmpty = $('.certs-empty');
  const CERT_LIMIT = 6;
  let certsExpanded = false;

  // Stat tile + toggle label are derived from the DOM, so they can never drift out of sync.
  $$('[data-count="certificates"]').forEach((el) => { el.textContent = certCards.length; });
  if (certCards.length) {
    $('[data-stat="certificates"]')?.removeAttribute('hidden');
    $('[data-stat="events"]')?.setAttribute('hidden', '');
    certsEmpty?.remove();
  }

  const syncCertsToggle = () => {
    const extra = certCards.length - CERT_LIMIT;
    certsGrid.classList.toggle('collapsed', !certsExpanded);
    certsToggle.hidden = extra <= 0;
    certsToggle.textContent = certsExpanded ? 'Show Less' : `Show ${extra} More`;
    certsToggle.setAttribute('aria-expanded', String(certsExpanded));
  };
  certsToggle.addEventListener('click', () => {
    certsExpanded = !certsExpanded;
    syncCertsToggle();
    if (certsExpanded) observe(certCards);
  });
  syncCertsToggle();

  // Thumbnails fade in over the shimmer once decoded
  certCards.forEach((card) => {
    const img = $('.cert-thumb img', card);
    const thumb = $('.cert-thumb', card);
    if (!img) return;
    const done = () => { img.classList.add('is-loaded'); thumb.classList.add('is-loaded'); };
    if (img.complete && img.naturalWidth) done();
    else img.addEventListener('load', done, { once: true });
  });

  // Preload the full image on hover / focus / touch so the lightbox opens instantly
  const preloaded = new Map();
  const preload = (src) => {
    if (!src || preloaded.has(src)) return preloaded.get(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    const ready = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    preloaded.set(src, ready);
    return ready;
  };

  const lightbox = $('#lightbox');
  const lbMedia = $('.lightbox-media', lightbox);
  const lbImg = $('img', lbMedia);
  const lbTitle = $('.lightbox-title', lightbox);
  const lbSub = $('.lightbox-sub', lightbox);
  const lbClose = $('.lightbox-close', lightbox);
  let lastFocus = null;

  const openLightbox = (card) => {
    const src = card.dataset.full;
    lastFocus = card;
    lbTitle.textContent = $('h3', card)?.textContent || '';
    lbSub.textContent = $('.cert-info span', card)?.textContent || '';
    lbImg.alt = lbTitle.textContent;
    lbMedia.classList.remove('is-loaded');
    lbImg.removeAttribute('src');
    preload(src).then(() => {
      lbImg.src = src;
      lbMedia.classList.add('is-loaded');
    });
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    lbClose.focus({ preventScroll: true });
  };

  const closeLightbox = () => {
    if (!lightbox.classList.contains('is-open')) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    lastFocus?.focus({ preventScroll: true });
  };

  certCards.forEach((card) => {
    const warm = () => preload(card.dataset.full);
    card.addEventListener('pointerenter', warm);
    card.addEventListener('focus', warm);
    card.addEventListener('touchstart', warm, { passive: true });
    card.addEventListener('click', () => openLightbox(card));
  });
  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
})();
