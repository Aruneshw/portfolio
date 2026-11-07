/* Light / dark theme. Loaded in <head> without defer so the saved theme applies before the page paints
   (no white flash). Everyone starts on light; the header switch saves the visitor's choice. */
(() => {
  const root = document.documentElement;
  const KEY = 'theme';
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  if (saved === 'dark') root.dataset.theme = 'dark';

  const sync = btn => {
    const dark = root.dataset.theme === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  };

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    sync(btn);
    btn.addEventListener('click', () => {
      const dark = root.dataset.theme !== 'dark';
      root.classList.add('theme-anim');
      if (dark) root.dataset.theme = 'dark';
      else delete root.dataset.theme;
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch {}
      sync(btn);
      setTimeout(() => root.classList.remove('theme-anim'), 450);
    });
  });
})();
