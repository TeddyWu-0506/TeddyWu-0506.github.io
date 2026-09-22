/* privacy-first event outlet. Works with or without Plausible loaded. */
const queue = (window.__ev = []);
export function track(name, props = {}) {
  const clean = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && v.length > 120) continue;      // never ship pasted text
    clean[k] = typeof v === 'number' ? Math.round(v) : v;
  }
  queue.push([name, clean, Date.now()]);
  try { if (window.plausible) window.plausible(name, { props: clean }); } catch (_) {}
}
export function bindCta(scope = document) {
  scope.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (!el) return;
    track('cta_click', { label: el.dataset.track, scene: el.closest('[data-scene]')?.dataset.scene || 'doc',
      href: el.getAttribute('href') || '' });
  });
}
