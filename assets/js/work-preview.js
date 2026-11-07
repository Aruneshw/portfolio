/* Work previews: clicking a project opens a side panel (website, video or social posts + case study),
   and on mouse devices a context cursor labels what the click will do ("View site", "Play", "View posts").
   Content comes from the #work-data JSON written by src/components/WorkPreview.astro. */
(() => {
  const dataEl = document.getElementById('work-data');
  const panel = document.querySelector('dialog.pv');
  if (!dataEl || !panel) return;

  const projects = JSON.parse(dataEl.textContent);
  const byId = Object.fromEntries(projects.map((p, i) => [p.id, i]));
  const body = panel.querySelector('.pv-body');
  const tagEl = panel.querySelector('.pv-tag');
  const finePointer = matchMedia('(pointer: fine)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = -1, lastOpen = 0, opener = null;

  // Tiny element builder: h('p', { class: 'x' }, 'text', childEl)
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) el.setAttribute(k, v === true ? '' : v);
    kids.flat().forEach(k => k != null && el.append(k));
    return el;
  };
  const ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>',
  };
  const placeholder = (icon, text) => {
    const el = h('div', { class: 'pv-ph' }, h('span', { class: 'pv-ph-icon' }), h('span', {}, text));
    el.firstChild.innerHTML = ICON[icon];
    return el;
  };
  const ratioClass = r => 'r-' + String(r || '16/9').replace('/', '-');

  /* ---------- Media, one builder per preview type ---------- */
  const media = {
    website(p) {
      const host = p.url ? p.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : (p.host || 'github.com/Aruneshw');
      const shot = p.shot ? h('img', { src: p.shot, alt: `Screenshot of ${p.title}` }) : null;
      let frame = null;
      if (p.url && p.embed !== false) {
        // The screenshot shows while the live site loads, then the site fades in over it
        frame = h('iframe', { src: p.url, title: `Live preview of ${p.title}`, loading: 'lazy', sandbox: 'allow-scripts allow-same-origin allow-popups', referrerpolicy: 'no-referrer' });
        frame.addEventListener('load', () => frame.classList.add('is-loaded'), { once: true });
      }
      const screen = frame || shot ? [shot, frame] : placeholder('globe', 'Website screenshot goes here');
      return h('figure', { class: 'pv-browser' },
        h('div', { class: 'pv-chrome' }, h('span', { class: 'pv-dots' }, h('i'), h('i'), h('i')), h('span', { class: 'pv-url' }, host)),
        h('div', { class: 'pv-screen' }, screen));
    },
    video(p) {
      const v = p.video || {};
      const el = v.src
        ? h('video', { src: v.src, poster: v.poster || null, controls: true, playsinline: true, preload: 'metadata' })
        : placeholder('play', 'Motion video goes here');
      return h('figure', { class: `pv-video ${ratioClass(v.ratio)}` }, el);
    },
    social(p) {
      const posts = p.posts || [];
      const track = h('div', { class: 'pv-posts', tabindex: '0', 'aria-label': `${posts.length} posts, scroll sideways` },
        posts.map((post, i) => h('figure', { class: 'pv-post' },
          h('div', { class: 'pv-post-media' },
            !post.src ? placeholder(post.kind === 'video' ? 'play' : 'image', `Post ${i + 1} of ${posts.length}`)
              : post.kind === 'video' ? h('video', { src: post.src, controls: true, playsinline: true, muted: true, loop: true, preload: 'metadata' })
              : h('img', { src: post.src, alt: post.alt || '' })),
          post.caption ? h('figcaption', {}, post.caption) : null)));
      const count = h('span', { class: 'pv-count' }, `1 / ${posts.length}`);
      const index = () => {
        const w = track.firstChild ? track.firstChild.offsetWidth + 12 : 1;
        return Math.min(posts.length - 1, Math.round(track.scrollLeft / w));
      };
      const go = dir => {
        const target = track.children[Math.max(0, Math.min(posts.length - 1, index() + dir))];
        if (target) track.scrollTo({ left: target.offsetLeft - track.firstChild.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
      };
      const prev = h('button', { type: 'button', class: 'pv-btn', 'aria-label': 'Previous post' }, '‹');
      const next = h('button', { type: 'button', class: 'pv-btn', 'aria-label': 'Next post' }, '›');
      prev.onclick = () => go(-1); next.onclick = () => go(1);
      track.addEventListener('scroll', () => { count.textContent = `${index() + 1} / ${posts.length}`; }, { passive: true });
      return h('div', { class: 'pv-social' },
        h('div', { class: 'pv-social-head' }, h('span', {}, p.platform || 'Social'), h('span', { class: 'pv-social-nav' }, prev, count, next)),
        track);
    },
  };

  /* ---------- Panel content ---------- */
  function render(p) {
    tagEl.textContent = p.tag || '';
    const meta = [['Client', p.client], ['Year', p.year], ['Role', p.role], ['Tools', (p.tools || []).join(', ')]].filter(([, v]) => v);
    const cs = p.caseStudy || {};
    const csRows = [['The challenge', cs.challenge], ['The approach', cs.approach], ['The result', cs.result]].filter(([, v]) => v);
    const ctas = [];
    if (p.type === 'website' && p.url) ctas.push(h('a', { class: 'btn btn-green', href: p.url, target: '_blank', rel: 'noopener' }, 'Visit live site ↗'));
    (p.links || []).forEach(l => ctas.push(h('a', { class: 'pv-link', href: l.href }, l.label + ' →')));

    body.replaceChildren(
      (media[p.type] || media.website)(p),
      h('div', { class: 'pv-copy' },
        h('h2', { id: 'pv-title' }, p.title),
        p.description ? h('p', { class: 'pv-desc' }, p.description) : null,
        ctas.length ? h('div', { class: 'pv-ctas' }, ctas) : null,
        meta.length ? h('dl', { class: 'pv-meta' }, meta.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))) : null,
        p.stats && p.stats.length ? h('ul', { class: 'pv-stats' }, p.stats.map(s => h('li', {}, h('b', {}, s.value), h('span', {}, s.label)))) : null,
        csRows.length ? h('section', { class: 'pv-case', 'aria-label': 'Case study' },
          h('p', { class: 'work-tag' }, 'Case study'),
          csRows.map(([k, v]) => h('div', {}, h('h3', {}, k), h('p', {}, v)))) : null));
    body.scrollTop = 0;
  }

  function open(id, from) {
    const i = byId[id];
    if (i == null) return;
    current = i; lastOpen = performance.now();
    render(projects[i]);
    panel.classList.remove('is-closing');   // cancels a close that is still animating
    if (!panel.open) {
      opener = from || null;
      panel.showModal();
      document.documentElement.classList.add('pv-open');
      hideCursor();
    }
  }
  function close() {
    if (!panel.open || panel.classList.contains('is-closing')) return;
    const done = () => {
      panel.removeEventListener('animationend', done);
      if (!panel.open || (!reduceMotion && !panel.classList.contains('is-closing'))) return;   // reopened meanwhile
      panel.classList.remove('is-closing');
      panel.close();
    };
    if (reduceMotion) return done();
    panel.classList.add('is-closing');
    panel.addEventListener('animationend', done, { once: true });
    setTimeout(done, 450);   // in case the browser skips the animation
  }
  panel.addEventListener('close', () => {
    document.documentElement.classList.remove('pv-open');
    body.querySelectorAll('video').forEach(v => v.pause());
    body.replaceChildren();   // unloads iframes and videos
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  });
  panel.addEventListener('cancel', e => { e.preventDefault(); close(); });   // Esc
  panel.addEventListener('click', e => {
    if (e.target === panel) return close();   // click on the dimmed backdrop
    const btn = e.target.closest('[data-pv]');
    if (!btn) return;
    const step = { prev: -1, next: 1 }[btn.dataset.pv];
    if (step) open(projects[(current + step + projects.length) % projects.length].id);
    else close();
  });

  /* ---------- Opening: clicks, keys, and taps on the draggable carousel ---------- */
  // Buttons (case cards, keyboard) fire a normal click.
  document.addEventListener('click', e => {
    const hit = e.target.closest('[data-work]');
    if (hit && performance.now() - lastOpen > 400) open(hit.dataset.work, hit);
  });
  // The card under the pointer. The carousel's looping copies are inert (invisible to events),
  // so inside the live carousel the card is found by position instead.
  const hitAt = e => {
    const direct = e.target.closest('[data-work]');
    if (direct || !e.target.closest('.carousel.is-live')) return direct;
    let best = null, bestD = Infinity;
    for (const el of document.querySelectorAll('.carousel.is-live [data-work]')) {
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) continue;
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      if (d < bestD) { best = el; bestD = d; }
    }
    return best;
  };
  // The live carousel captures the pointer for dragging, so its clicks never reach the card.
  // Treat a press that barely moved as a click on the card under it; a real drag opens nothing.
  let down = null;
  const moved = e => down && Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 6;
  document.addEventListener('pointerdown', e => {
    const hit = e.button === 0 && e.target.closest('.carousel.is-live') && hitAt(e);
    down = hit ? { hit, x: e.clientX, y: e.clientY, t: performance.now() } : null;
  }, true);
  addEventListener('pointerup', e => {
    if (!down) return;
    const quick = !moved(e) && performance.now() - down.t < 500, { hit } = down;
    down = null;
    if (quick && performance.now() - lastOpen > 400) open(hit.dataset.work, hit);
  });

  /* ---------- Context cursor (mouse only) ---------- */
  const cursor = document.querySelector('.ctx-cursor');
  function hideCursor() { cursor && cursor.classList.remove('is-on', 'has-label'); }
  if (!cursor || !finePointer) return;
  document.documentElement.classList.add('has-ctx-cursor');
  const label = cursor.querySelector('.ctx-label');
  let tx = 0, ty = 0, cx = 0, cy = 0, running = false;
  const ZONE = '.work, .case-group';

  const tick = () => {
    cx += (tx - cx) * (reduceMotion ? 1 : 0.22);
    cy += (ty - cy) * (reduceMotion ? 1 : 0.22);
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    running = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.1;
    if (running) requestAnimationFrame(tick);
  };
  const setLabel = text => {
    if (text) label.textContent = text;
    cursor.classList.toggle('has-label', !!text);
  };

  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || panel.open) return;
    tx = e.clientX; ty = e.clientY;
    if (!cursor.classList.contains('is-on')) { cx = tx; cy = ty; }
    const hit = hitAt(e);
    const zone = e.target.closest(ZONE);
    const dragging = moved(e);
    cursor.classList.toggle('is-on', !!zone || !!hit);
    cursor.classList.toggle('is-drag', !!dragging);
    setLabel(dragging ? 'Drag' : hit ? hit.dataset.cursor : '');
    if (!running) { running = true; requestAnimationFrame(tick); }
  }, { passive: true });
  document.addEventListener('pointerleave', hideCursor);
})();
