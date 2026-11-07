/* Afeef Malik: portfolio interactions
   GSAP + ScrollTrigger for motion, Lenis for smooth scrolling.
   Everything degrades gracefully: without JS or with reduced motion, all content is visible. */
(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rand = (min, max) => min + Math.random() * (max - min);
  let lenis = null, menuOpen = false, closeMenu = null;

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const loader = $('.loader');

  if (!hasGsap || reduceMotion) {
    loader && loader.remove();
    setupMenu(null);
    setupTabs(null);
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Plays a tween forwards as you scroll, but never rewinds it, so revealed content stays revealed.
  const scrubOnce = (tween, vars) => {
    tween.pause();
    ScrollTrigger.create({
      ...vars,
      onUpdate: st => {
        if (st.progress > tween.progress()) gsap.to(tween, { progress: st.progress, duration: 0.4, ease: 'power1.out', overwrite: true });
      }
    });
  };

  /* ---------- Smooth scroll ---------- */
  if (typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const scrollToTarget = (hash) => {
    const target = hash === '#home' ? 0 : $(hash);
    if (target === null) return;
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    else target.scrollIntoView({ behavior: 'smooth' });
  };
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const hash = a.getAttribute('href');
      if (hash.length < 2) return;
      e.preventDefault();
      closeMenu?.();
      scrollToTarget(hash);
      history.replaceState(null, '', hash === '#home' ? location.pathname : hash);
    });
  });

  /* ---------- Loader, then hero intro ---------- */
  let seen = false;
  try { seen = sessionStorage.getItem('am-seen') === '1'; sessionStorage.setItem('am-seen', '1'); } catch (e) { /* storage blocked */ }

  const hero = $('.hero');
  const heroChars = hero ? splitChars($('[data-split]')) : [];
  if (hero) {
    gsap.set(heroChars, { yPercent: 110 });
    gsap.set('.hero-photo', { y: 80, autoAlpha: 0 });
    gsap.set('.badge', { scale: 0, autoAlpha: 0 });
    gsap.set(['.hero-intro', '.hero-side', '.hero-last', '.site-header'], { y: 30, autoAlpha: 0 });
  }

  const startHero = () => {
    if (!hero) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(heroChars, { yPercent: 0, duration: 1.3, stagger: 0.06 })
      .to('.hero-photo', { y: 0, autoAlpha: 1, duration: 1.4 }, 0.15)
      .to('.badge', { scale: 1, autoAlpha: 1, duration: 1.1, stagger: 0.1, ease: 'back.out(1.8)' }, 0.55)
      .to(['.hero-last', '.hero-intro', '.hero-side', '.site-header'], { y: 0, autoAlpha: 1, duration: 1, stagger: 0.08 }, 0.6);
  };

  const finishLoader = () => {
    loader.classList.add('is-done');
    setTimeout(() => loader.remove(), 1100);
    startHero();
  };
  if (!loader) startHero();
  else if (seen) { loader.remove(); startHero(); }
  else {
    const minTime = new Promise(r => setTimeout(r, 1050));
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([Promise.all([minTime, fonts]), new Promise(r => setTimeout(r, 2500))]).then(finishLoader);
  }

  /* ---------- Inner pages: intro band ---------- */
  if ($('.page-hero')) {
    gsap.from('.page-hero-inner > *', { y: 40, autoAlpha: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out', delay: 0.05 });
    gsap.to('.page-hero .hero-glow', { yPercent: 25, ease: 'none', scrollTrigger: { trigger: '.page-hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- Scroll progress + header ---------- */
  gsap.to('.scroll-progress span', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
  });

  const header = $('.site-header');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      header.classList.toggle('is-hidden', y > 300 && y > lastY && !menuOpen);
      lastY = y;
    }
  });


  /* ---------- Hero parallax ---------- */
  if (hero) {
  gsap.to('.hero-giant', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-photo img', { yPercent: 10, scale: 0.94, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  $$('.badge').forEach(b => {
    const d = parseFloat(b.dataset.depth) || 1;
    gsap.to(b, { yPercent: -160 * d, rotation: `+=${20 * d}`, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  });
  if (finePointer) {
    const movers = $$('.badge').map(b => ({
      d: parseFloat(b.dataset.depth) || 1,
      x: gsap.quickTo(b, 'x', { duration: 1, ease: 'power3.out' }),
      y: gsap.quickTo(b, 'y', { duration: 1, ease: 'power3.out' })
    }));
    $('.hero').addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      movers.forEach(m => { m.x(nx * 40 * m.d); m.y(ny * 40 * m.d); });
    });
  }
  }

  /* ---------- About: words light up as you scroll ---------- */
  const words = splitWords($('[data-words]'));
  if (words.length) scrubOnce(gsap.fromTo(words, { opacity: 0.14 }, { opacity: 1, stagger: 0.1, ease: 'none' }),
    { trigger: '[data-words]', start: 'top 80%', end: 'bottom 50%' });

  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => { el.textContent = Math.round(obj.v); }
    });
  });

  const mm = gsap.matchMedia();

  /* ---------- Services: cards fan out from a stack (desktop) ---------- */
  if ($('.services-pin')) mm.add('(min-width: 1001px)', () => {
    const cards = $$('.service-card');
    const grid = $('.service-cards');
    const finalRot = [-7, 3, -3, 7];
    const finalY = [26, -8, -8, 26];
    const centerOffset = (card) => {
      const g = grid.getBoundingClientRect(), c = card.getBoundingClientRect();
      return (g.left + g.width / 2) - (c.left + c.width / 2);
    };
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.services-pin', start: 'top top', end: '+=130%', pin: true, scrub: 1, invalidateOnRefresh: true }
    });
    gsap.fromTo('.services .display', { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.services', start: 'top 75%' } });
    tl.fromTo(cards,
        { x: (i, el) => centerOffset(el), y: 200, rotation: (i) => (i - 1.5) * 4, scale: 0.86 },
        { x: 0, y: (i) => finalY[i], rotation: (i) => finalRot[i], scale: 1, duration: 1, stagger: 0.06, ease: 'power3.out' }, 0);
    cards.forEach((card, i) => {
      card.addEventListener('pointerenter', () => gsap.to(card, { rotation: 0, y: finalY[i] - 18, duration: 0.5, ease: 'power3.out' }));
      card.addEventListener('pointerleave', () => gsap.to(card, { rotation: finalRot[i], y: finalY[i], duration: 0.6, ease: 'power3.out' }));
    });
  });
  if ($('.services-pin')) mm.add('(max-width: 1000px)', () => {
    gsap.fromTo('.services .display', { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.services', start: 'top 80%' } });
    $$('.service-card').forEach((card, i) => {
      gsap.fromTo(card, { y: 80, rotation: i % 2 ? 4 : -4, autoAlpha: 0 }, { y: 0, rotation: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 90%' } });
    });
  });

  /* ---------- Toolkit: tiles drop in, then can be dragged ---------- */
  (() => {
    const items = $$('.tool-pile li');
    if (!items.length) return;
    gsap.set(items, { autoAlpha: 0 });
    // Start as the pile comes into view, with a short fall, so the tiles land while you're looking at them
    ScrollTrigger.create({
      trigger: '.tool-pile', start: 'top 95%', once: true,
      onEnter: () => {
        gsap.fromTo(items,
          { y: () => -innerHeight * rand(0.35, 0.55), rotation: () => rand(-60, 60), autoAlpha: 1 },
          { y: () => rand(-26, 26), x: () => rand(-16, 16), rotation: () => rand(-16, 16), duration: () => rand(0.85, 1.15), ease: 'bounce.out', stagger: { each: 0.025, from: 'random' } });
      }
    });

    let z = 10;
    $$('.tool').forEach(tool => {
      let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
      tool.addEventListener('pointerdown', e => {
        dragging = true; tool.setPointerCapture(e.pointerId);
        sx = e.clientX; sy = e.clientY;
        ox = gsap.getProperty(tool, 'x'); oy = gsap.getProperty(tool, 'y');
        tool.parentElement.style.zIndex = ++z;
        gsap.to(tool, { scale: 1.1, rotation: rand(-8, 8), duration: 0.3 });
      });
      tool.addEventListener('pointermove', e => {
        if (!dragging) return;
        gsap.set(tool, { x: ox + e.clientX - sx, y: oy + e.clientY - sy });
      });
      const drop = () => {
        if (!dragging) return;
        dragging = false;
        gsap.to(tool, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
      };
      tool.addEventListener('pointerup', drop);
      tool.addEventListener('pointercancel', drop);
    });
  })();

  /* ---------- Generic reveals ---------- */
  const revealSel = '.display:not(.services .display), .eyebrow:not(.hero .eyebrow):not(.page-hero .eyebrow), .lead, .section-lede, .info-card, .principles > li, .included-grid > li, .edu-card, .post-card, .case-tabs, .tool-grid > li, .skill-groups > div, .compare-col, .detail-table > div, .related-grid > li, .portrait-card, .prose-block > *, .service-cards.static > li, .contact-aside, .enquiry, .author-box, .explore-wrap, .process-intro > p, .tabs, .process-meta, .services-plus, .toolkit-head p, .cred-list li, .cert-list li, .cred-h, .faq-list details, .carousel, .carousel-hint, .sec-steps li, .cta-inner > p, .cta-actions, .footer-grid > *';
  gsap.set(revealSel, { y: 40, autoAlpha: 0 });
  ScrollTrigger.batch(revealSel, {
    start: 'top 88%', once: true,
    onEnter: els => gsap.to(els, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.08, ease: 'expo.out', overwrite: true })
  });

  /* ---------- Process timeline progress ---------- */
  $$('.timeline').forEach(list => {
    const bar = document.createElement('span');
    bar.className = 'timeline-progress';
    bar.setAttribute('aria-hidden', 'true');
    list.prepend(bar);
    scrubOnce(gsap.to(bar, { scaleY: 1, ease: 'none' }), { trigger: list, start: 'top 60%', end: 'bottom 60%' });
    $$(':scope > li', list).forEach(li => {
      ScrollTrigger.create({ trigger: li, start: 'top 62%', once: true, onEnter: () => li.classList.add('is-active') });
      gsap.from(li, { x: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: li, start: 'top 88%' } });
    });
  });

  /* ---------- Security steps progress bars ---------- */
  $$('.sec-steps > li').forEach((li, i) => {
    gsap.fromTo(li, { '--p': 0 }, { '--p': 1, duration: 1.2, delay: i * 0.25, ease: 'power2.inOut', scrollTrigger: { trigger: li.parentElement, start: 'top 75%' } });
  });

  /* ---------- CTA + footer ---------- */
  if ($('.cta')) gsap.from('.cta-title .line', { yPercent: 60, autoAlpha: 0, rotation: 2, duration: 1.2, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.cta', start: 'top 70%' } });
  gsap.from('.footer-giant', { yPercent: 50, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  /* ---------- Magnetic buttons ---------- */
  if (finePointer) {
    $$('.magnetic').forEach(el => {
      const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.3);
        y((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener('pointerleave', () => { x(0); y(0); });
    });
  }

  setupMenu(gsap);
  setupTabs(gsap);
  setupCarousel(gsap);

  addEventListener('load', () => ScrollTrigger.refresh());

  /* ================= helpers ================= */
  function splitChars(el) {
    if (!el) return [];
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.classList.add('is-split');
    el.textContent = '';
    return [...text].map(ch => {
      const wrap = document.createElement('span');
      wrap.className = 'split-wrap';
      wrap.setAttribute('aria-hidden', 'true');
      const c = document.createElement('span');
      c.className = 'char';
      c.textContent = ch;
      wrap.appendChild(c);
      el.appendChild(wrap);
      return c;
    });
  }

  function splitWords(el) {
    if (!el) return [];
    const parts = el.textContent.trim().split(/(\s+)/);
    el.textContent = '';
    const out = [];
    parts.forEach(p => {
      if (/^\s+$/.test(p)) { el.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.className = 'word';
      w.textContent = p;
      el.appendChild(w);
      out.push(w);
    });
    return out;
  }

  function setupMenu(g) {
    const btn = $('.nav-toggle'), menu = $('#mobile-menu');
    if (!btn || !menu) return;
    const open = () => {
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', 'Close menu');
      menuOpen = true; lenis?.stop(); document.body.style.overflow = 'hidden';
      $('.site-header')?.classList.remove('is-hidden');  // keep the close button reachable
      g?.fromTo($$('li a', menu), { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out' });
      g?.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.out' });
    };
    const close = () => {
      if (menu.hidden) return;
      menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Open menu');
      menuOpen = false; lenis?.start(); document.body.style.overflow = '';
    };
    closeMenu = close;
    btn.addEventListener('click', () => (menu.hidden ? open() : close()));
    $$('a', menu).forEach(a => a.addEventListener('click', close));
    addEventListener('keydown', e => { if (e.key === 'Escape') { close(); btn.focus(); } });
    addEventListener('resize', () => { if (innerWidth > 900) close(); });
  }

  function setupTabs(g) {
    const tabs = $$('.tabs [role="tab"]');
    const select = (tab) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.classList.toggle('is-active', on);
        t.tabIndex = on ? 0 : -1;
        const panel = $('#' + t.getAttribute('aria-controls'));
        panel.hidden = !on;
        const meta = $('#meta-' + t.id.replace('tab-', ''));
        if (meta) meta.hidden = !on;
      });
      const panel = $('#' + tab.getAttribute('aria-controls'));
      if (g) {
        g.fromTo($$(':scope > li', panel), { x: 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8, stagger: 0.05, ease: 'expo.out' });
        window.ScrollTrigger.refresh();
      }
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        next.focus(); select(next);
      });
    });
  }

  /* Selected work: an endless row of cards that drifts, can be dragged or swiped and thrown,
     gets nudged by page scrolling, and bends into a subtle arc around the centre. */
  function setupCarousel(g) {
    const carousel = $('.carousel');
    if (!carousel) return;
    const track = $('.carousel-track', carousel);
    const originals = $$('.work-card', track);
    if (!originals.length) return;
    const cards = [...originals];
    carousel.classList.add('is-live');

    const DRIFT = -0.6;                      // px per frame, leftwards
    let cw = 0, step = 0, total = 0, offset = 0, vel = DRIFT, driftTarget = DRIFT;
    let dragging = false, lastX = 0, lastT = 0, dragV = 0, visible = false;

    const measure = () => {
      cw = originals[0].offsetWidth;
      step = cw + Math.max(16, cw * 0.09);
      // Clone the set until the row is long enough to loop seamlessly
      while (cards.length * step < carousel.clientWidth + step * 3) {
        originals.forEach(o => {
          const c = o.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          c.inert = true;
          track.appendChild(c);
          cards.push(c);
        });
      }
      total = cards.length * step;
    };

    const render = () => {
      const vw = carousel.clientWidth, half = vw / 2, k = vw < 600 ? 0.55 : 1;  // gentler curve on phones
      for (let i = 0; i < cards.length; i++) {
        const x = (((i * step + offset) % total) + total) % total - step;
        const d = Math.max(-1.7, Math.min(1.7, (x + cw / 2 - half) / half));
        const y = d * d * 26 * k;            // edges dip down
        const z = -Math.abs(d) * 70 * k;     // and fall back slightly
        cards[i].style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${-d * 13 * k}deg) rotateZ(${d * 3.2 * k}deg)`;
      }
    };

    measure();
    render();
    addEventListener('resize', () => { measure(); render(); });

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(carousel);

    g.ticker.add((time, dt) => {
      if (!visible) return;
      const f = Math.min(dt / 16.667, 3);
      if (!dragging) {
        if (lenis) vel -= Math.max(-30, Math.min(30, lenis.velocity)) * 0.012 * f;  // page scroll nudges the row
        vel += (driftTarget - vel) * 0.04 * f;  // ease back to the gentle drift
        offset += vel * f;
      }
      render();
    });

    carousel.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      dragging = true; dragV = 0;
      lastX = e.clientX; lastT = performance.now();
      carousel.classList.add('is-dragging');
      carousel.setPointerCapture(e.pointerId);
    });
    carousel.addEventListener('pointermove', e => {
      if (!dragging) return;
      const now = performance.now(), dx = e.clientX - lastX;
      offset += dx;
      dragV = dragV * 0.6 + (dx / Math.max(1, (now - lastT) / 16.667)) * 0.4;
      lastX = e.clientX; lastT = now;
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      carousel.classList.remove('is-dragging');
      vel = Math.max(-45, Math.min(45, dragV));   // throw it
    };
    carousel.addEventListener('pointerup', release);
    carousel.addEventListener('pointercancel', release);
    carousel.addEventListener('lostpointercapture', release);

    if (finePointer) {
      carousel.addEventListener('pointerenter', () => { driftTarget = DRIFT * 0.2; });
      carousel.addEventListener('pointerleave', () => { driftTarget = DRIFT; });
    }
    carousel.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { vel += 14; e.preventDefault(); }
      if (e.key === 'ArrowRight') { vel -= 14; e.preventDefault(); }
    });
  }
})();
