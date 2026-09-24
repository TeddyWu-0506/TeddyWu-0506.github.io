import { createDeck } from './deck.js';
import { bindCta, track } from './analytics.js';
import { mountDemo, mountPreview } from './demo-runtime.js';

bindCta();

/* Nothing at this level may wait on the network. The inline script in <head> has already
   flipped <html> to class="js", which switches the no-js fallback off, so a single await
   here turns a stalled request into a site stuck on scene 1 - strictly worse than having
   no JS at all. Sample data now loads lazily inside demo-runtime.js. */
function boot() {
/* ---- generic tab group: [role=tablist] > [role=tab][aria-controls] ---- */
function wireTabs(listEl) {
  const tabs = [...listEl.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls'))).filter(Boolean);
  const pick = (n) => {
    tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === n)));
    panels.forEach((p, i) => { p.hidden = i !== n; });
    tabs[n] && tabs[n].dispatchEvent(new CustomEvent('tabpicked', { bubbles: true }));
    return panels[n];
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => { pick(i); t.focus(); }));
  listEl.addEventListener('keydown', (e) => {
    const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight') { e.preventDefault(); pick(Math.min(tabs.length - 1, cur + 1)); tabs[Math.min(tabs.length - 1, cur + 1)].focus(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); pick(Math.max(0, cur - 1)); tabs[Math.max(0, cur - 1)].focus(); }
  });
  return { pick, tabs, panels };
}

/* ---- mount hosts inside a subtree ---- */
function mountIn(root) {
  if (!root) return;
  root.querySelectorAll('[data-demo]').forEach((el) => { if (!el._mounted) mountDemo(el); });
  root.querySelectorAll('[data-preview]').forEach((el) => { if (!el._mounted) mountPreview(el); });
}

/* ---- deck ---- */
const deck = createDeck({
  onScene: (i, scene) => {
    mountIn(scene);
  }
});


/* ---- work + trajectory tab groups ---- */
document.querySelectorAll('.switcher,.tabs').forEach((g) => {
  const t = wireTabs(g);
  g.addEventListener('tabpicked', (e) => {
    const panel = document.getElementById(e.target.getAttribute('aria-controls'));
    mountIn(panel);
    track('project_switch', { product: e.target.dataset.projectTab || e.target.textContent.trim() });
  });
  mountIn(g.parentElement);
});

/* ---- provenance toggles ---- */
function toggleProv(t) {
  const box = document.getElementById(t.getAttribute('aria-controls'));
  if (!box) return;
  const open = box.classList.toggle('is-open');
  t.setAttribute('aria-expanded', String(open));
  t.querySelector('.cell-arrow') && (t.querySelector('.cell-arrow').textContent = open ? '口径 −' : '口径 +');
  track('cell_open', { product: t.closest('[data-project]')?.dataset.project || '', cell: open ? 'result_open' : 'result_close' });
}
document.addEventListener('click', (e) => { const t = e.target.closest('[data-prov]'); if (t) toggleProv(t); });
document.addEventListener('keydown', (e) => {
  const t = e.target.closest('[data-prov]');
  if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleProv(t); }
});

/* ---- demo modal: the deck never shows the demo inline; the launch button opens it ---- */
const sbModal = document.getElementById('sb-modal');
if (sbModal) {
  const sbHost = document.getElementById('sb-demo-host');
  const sbTitle = document.getElementById('sb-modal-title');
  const sbClose = document.getElementById('sb-close');
  const META = {
    'content-review': { product: 'review', title: 'Content QC Dev Platform · 产品交互 Demo · Mock 数据', caseUrl: '/work/content-review/' },
    'creator-match':  { product: 'match',  title: 'KOL Recommend System · 本地 Demo · 样例数据', caseUrl: '/work/creator-match/' },
  };
  let mountedKey = null, lastTrigger = null;
  const closeSb = () => { sbModal.hidden = true; lastTrigger && lastTrigger.focus(); };
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-demo-open]');
    if (open) {
      const key = { review: 'content-review', match: 'creator-match' }[open.dataset.demoProduct]
        || (open.closest('[data-project]') || {}).dataset?.project || 'content-review';
      const meta = META[key];
      if (mountedKey !== key) {
        sbHost.innerHTML = '';
        delete sbHost._mounted;
        sbHost.dataset.demo = meta.product;
        sbHost.dataset.source = 'deck';
        sbHost.dataset.caseUrl = meta.caseUrl;
        mountDemo(sbHost);
        mountedKey = key;
      }
      sbTitle.textContent = meta.title;
      lastTrigger = open;
      sbModal.hidden = false;
      track('demo_open', { product: meta.product, source: 'deck' });
      setTimeout(() => sbClose.focus(), 30);
      return;
    }
    if (!sbModal.hidden && (e.target.closest('#sb-close') || e.target.closest('.sb-modal-bg'))) closeSb();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sbModal.hidden) closeSb(); });
}

/* ---- QR reveal (contact scene) ---- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-qr]'); if (!t) return;
  const box = document.getElementById(t.getAttribute('aria-controls')); if (!box) return;
  const open = box.hasAttribute('hidden');
  if (open) box.removeAttribute('hidden'); else box.setAttribute('hidden', '');
  t.setAttribute('aria-expanded', String(open));
});

/* ---- header stuck ---- */
const header = document.querySelector('.site-header,.doc-head');
if (header) { const on = () => header.classList.toggle('is-stuck', window.scrollY > 12);
  window.addEventListener('scroll', on, { passive: true }); on(); }

/* ---- year + clipboard ---- */
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  /* Snapshot with innerHTML, not textContent: the label ends in a styled
     <span class="ar">, and a textContent round-trip flattens it into a bare glyph
     that has lost its font, size and hover offset. */
  const keep = b.innerHTML;
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = '已复制 ✓'; }
  catch (_) { b.textContent = b.dataset.copy; }
  setTimeout(() => (b.innerHTML = keep), 1800);
});
}
boot();
