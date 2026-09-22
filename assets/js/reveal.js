const seen = new WeakSet();
let io = null;
export function initReveal() {
  const items = [...document.querySelectorAll('.reveal')];
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  items.forEach((el) => io.observe(el));
}
/* deterministic: on scene change, reveal that scene's items regardless of transform-based IO */
export function revealScene(scene) {
  if (!scene) return;
  let n = 0;
  scene.querySelectorAll('.reveal').forEach((el) => {
    if (seen.has(el)) return; seen.add(el);
    if (n++ < 6) el.classList.add('is-in'); else el.classList.add('is-in');
  });
}
