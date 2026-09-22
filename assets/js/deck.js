import { revealScene } from './reveal.js';
import { track } from './analytics.js';

const DECK_MQ = '(min-width: 769px)';

export function createDeck({ onScene } = {}) {
  const stage  = document.querySelector('.stage');
  const stack  = document.querySelector('.scene-stack');
  const header = document.querySelector('.site-header');
  const rail   = document.querySelector('.rail');
  if (!stage || !stack) return null;

  const scenes = [...stack.querySelectorAll('.scene')];
  const segs   = [...(rail?.querySelectorAll('.rail-seg') || [])];
  const jumps  = [...(rail?.querySelectorAll('.rail-menu a') || [])];
  const navs   = [...document.querySelectorAll('[data-scene-link]')];
  const idxEl  = rail?.querySelector('.rail-index .cur');
  const nameEl = rail?.querySelector('.rail-name');
  const liveEl = rail?.querySelector('.rail-live');
  const prevB  = rail?.querySelector('[data-deck="prev"]');
  const nextB  = rail?.querySelector('[data-deck="next"]');
  const annEl  = document.getElementById('scene-announce');

  const mq = window.matchMedia(DECK_MQ);
  let deckMode = mq.matches;
  let i = 0, lock = 0, last = 0;

  const themeOf = (el) => el.dataset.theme || 'paper';
  const setChromeTheme = (t) => { [header, rail].forEach((el) => el && (el.dataset.theme = t)); };

  /* difference veil: restart the sweep on every scene change, direction aware */
  let cutTimer = 0;
  function cut() {
    stage.dataset.direction = i < last ? 'backward' : 'forward';
    last = i;
    stage.classList.remove('is-cutting');
    void stage.offsetWidth;                       // force reflow so the animation replays
    stage.classList.add('is-cutting');
    clearTimeout(cutTimer);
    cutTimer = setTimeout(() => stage.classList.remove('is-cutting'), 960);
  }

  function paintDeck() {
    scenes.forEach((s, n) => s.classList.toggle('is-active', deckMode ? n === i : true));
    segs.forEach((s, n) => {
      s.classList.toggle('is-passed', n < i);
      s.classList.toggle('is-current', n === i);
      s.setAttribute('aria-current', n === i ? 'true' : 'false');
    });
    [...jumps, ...navs].forEach((a) => {
      const on = a.dataset.sceneLink === scenes[i].id;
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    if (idxEl) idxEl.textContent = String(i + 1).padStart(2, '0');
    if (nameEl) nameEl.textContent = scenes[i].dataset.label || '';
    if (prevB) prevB.disabled = i === 0;
    if (nextB) nextB.disabled = i === scenes.length - 1;
    setChromeTheme(themeOf(scenes[i]));
  }

  function go(n, trigger = 'nav') {
    n = Math.max(0, Math.min(scenes.length - 1, n));
    if (n === i) return;
    track('scene_advance', { from: i + 1, to: n + 1, trigger });
    if (deckMode) track('scene_view', { scene: scenes[i].id, dwell_ms: Date.now() - (scenes[i]._t || Date.now()) });
    i = n;
    if (deckMode) {
      cut();
      scenes[i]._t = Date.now();
      revealScene(scenes[i]);
      const h = scenes[i].querySelector('h2,h1');
      if (h && !document.activeElement.closest('input,textarea,select')) h.setAttribute('tabindex', '-1');
    } else {
      scenes[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    paintDeck();
    try { history.replaceState(null, '', '#' + (scenes[i].dataset.hash || scenes[i].id)); } catch (_) {}
    if (liveEl) liveEl.textContent = `第 ${i + 1} / ${scenes.length} 屏：${scenes[i].dataset.label || ''}`;
    if (annEl) annEl.textContent = `第 ${i + 1} / ${scenes.length} 屏：${scenes[i].dataset.label || ''}`;
    onScene && onScene(i, scenes[i]);
  }

  function applyMode() {
    const was = deckMode;
    deckMode = mq.matches;
    stage.classList.toggle('is-vertical', !deckMode);
    stack.classList.toggle('is-vertical', !deckMode);
    document.body.classList.toggle('is-deck', deckMode);
    if (!deckMode) {
      scenes.forEach((s) => { s.classList.add('is-active'); revealScene(s); });
      setChromeTheme('paper');
      segs.forEach((s, n) => { s.classList.toggle('is-passed', n < i); s.classList.toggle('is-current', n === i); });
    } else {
      scenes[i]._t = Date.now();
      paintDeck();
    }
    if (was !== deckMode && !deckMode) { /* entering vertical: nothing else to do */ }
  }

  /* --- inputs --- */
  segs.forEach((s, n) => s.addEventListener('click', () => go(n, 'rail')));
  [...jumps, ...navs].forEach((a) => a.addEventListener('click', (e) => {
    if (!deckMode) return;                       // native anchor works in vertical mode
    e.preventDefault();
    const n = scenes.findIndex((s) => s.id === a.dataset.sceneLink);
    if (n >= 0) { go(n, 'nav'); const d = a.closest('.rail-jump'); if (d) d.open = false; }
  }));
  prevB && prevB.addEventListener('click', () => go(i - 1, 'button'));
  nextB && nextB.addEventListener('click', () => go(i + 1, 'button'));

  document.addEventListener('keydown', (e) => {
    if (!deckMode) return;
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1, 'key'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1, 'key'); }
    else if (e.key === 'Home') { e.preventDefault(); go(0, 'key'); }
    else if (e.key === 'End') { e.preventDefault(); go(scenes.length - 1, 'key'); }
  });

  stage.addEventListener('wheel', (e) => {
    if (!deckMode || lock) return;
    const body = scenes[i].querySelector('.scene-body');
    if (body && body.scrollHeight - body.clientHeight > 4) return;   // content owns the wheel
    if (Math.abs(e.deltaY) < 26 || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    const atEdge = (e.deltaY > 0 && i === scenes.length - 1) || (e.deltaY < 0 && i === 0);
    if (atEdge) return;
    e.preventDefault();
    lock = setTimeout(() => { lock = 0; }, 520);
    go(i + (e.deltaY > 0 ? 1 : -1), 'wheel');
  }, { passive: false });

  let tx = 0, ty = 0, tActive = false;
  stage.addEventListener('touchstart', (e) => {
    if (!deckMode) return;
    const b = scenes[i].querySelector('.scene-body');
    tActive = !(b && b.scrollHeight - b.clientHeight > 4);
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (!deckMode || !tActive || lock) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      lock = setTimeout(() => { lock = 0; }, 520);
      go(i + (dx < 0 ? 1 : -1), 'swipe');
    }
  }, { passive: true });

  /* vertical mode: keep the rail index in sync with scroll position */
  let raf = 0;
  const syncFromScroll = () => {
    if (deckMode || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const mid = window.innerHeight * 0.42;
      let best = i;
      scenes.forEach((s, n) => { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) best = n; });
      if (best !== i) { i = best; paintDeck();
        try { history.replaceState(null, '', '#' + (scenes[i].dataset.hash || scenes[i].id)); } catch (_) {} }
    });
  };
  window.addEventListener('scroll', syncFromScroll, { passive: true });

  const onMq = () => { last = i; applyMode(); };
  mq.addEventListener ? mq.addEventListener('change', onMq) : mq.addListener(onMq);

  /* --- init --- */
  const fromHash = () => {
    const h = location.hash.replace('#', '');
    const n = scenes.findIndex((s) => (s.dataset.hash || s.id) === h);
    return n >= 0 ? n : 0;
  };
  i = fromHash();
  document.body.classList.toggle('is-deck', deckMode);
  stage.classList.toggle('is-vertical', !deckMode);
  scenes.forEach((s, n) => { if (n === i || !deckMode) { s.classList.add('is-active'); revealScene(s); } });
  scenes[i]._t = Date.now();
  paintDeck();
  if (liveEl) liveEl.textContent = `第 ${i + 1} / ${scenes.length} 屏：${scenes[i].dataset.label || ''}`;
  mq.matches || scenes[i].scrollIntoView({ block: 'start' });

  /* dwell on leave */
  window.addEventListener('pagehide', () => {
    if (deckMode) track('scene_view', { scene: scenes[i].id, dwell_ms: Date.now() - (scenes[i]._t || Date.now()) });
  });
  window.addEventListener('beforeunload', () => {
    track('deck_abandon_at_scene', { scene: i + 1, dwell_ms: Date.now() - (scenes[i]._t || Date.now()) });
  });

  return { go, get index() { return i; }, get deckMode() { return deckMode; } };
}
