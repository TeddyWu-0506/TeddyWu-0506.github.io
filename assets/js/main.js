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
/* ---- fit-zoom: story board and trajectory tab panels scale to the
   viewport instead of kicking the deck into vertical scroll ---- */
const fitPads = [...document.querySelectorAll('.scene--story .scene-pad')];
if (fitPads.length) {
  const lastZoom = new Map();
  const fitPad = (pad) => {
    if (innerWidth < 1000) { pad.style.zoom = ''; lastZoom.set(pad, ''); return; }
    pad.style.zoom = 1;
    const header = document.querySelector('.site-header')?.offsetHeight || 64;
    const rail = document.querySelector('.rail')?.offsetHeight || 56;
    const body = pad.closest('.scene-body');
    const availH = innerHeight - header - rail;
    /* story is a single fixed board: measure its own box, not the scroll
       container, so the result is identical in deck and vertical layout */
    const h0 = pad.offsetHeight || 1;
    const w0 = pad.offsetWidth || 1;
    const k = Math.max(0.7, Math.min((availH - 8) / h0, (innerWidth - 96) / w0, 1.5));
    const next = (k > 0.99 && k < 1.01) ? '' : k.toFixed(3);
    if (pad.style.zoom !== next) {
      pad.style.zoom = next;
      if (lastZoom.get(pad) !== next) {
        lastZoom.set(pad, next);
        requestAnimationFrame(() => dispatchEvent(new Event('resize')));
      }
    }
  };
  let raf = 0;
  const fitAll = () => { raf = 0; fitPads.forEach(fitPad); };
  const queueAll = () => { if (!raf) raf = requestAnimationFrame(fitAll); };
  addEventListener('resize', queueAll);
  addEventListener('load', queueAll);
  fitAll();
}

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

/* ---- header: 体验产品 Demo 概览选择 ---- */
const pdModal = document.getElementById('pd-modal');
if (pdModal) {
  const pdOpen = document.getElementById('pd-open');
  pdOpen.addEventListener('click', () => { pdModal.hidden = false; pdModal.querySelector('.pd-card').focus(); });
  pdModal.addEventListener('click', (e) => {
    if (e.target.closest('[data-pd-close]')) { pdModal.hidden = true; pdOpen.focus(); return; }
    const c = e.target.closest('[data-pd]');
    if (c) { pdModal.hidden = true;
      const t = document.querySelector('[data-demo-open][data-demo-product="' + c.dataset.pd + '"]');
      if (t) t.click(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pdModal.hidden) pdModal.hidden = true; });
}

/* ---- career detail: 大弹窗查看完整经历 ---- */
const EXP = {
  p1: { n: '01 / 03', org: '阳狮集团', role: 'Senior Media Executive / AIPM', logo: '/assets/icons/logo-publicis.png',
    span: '2024.09 — 至今', sub: '深入探索 AI · 从投放痛点出发独立完成两套 AI 系统 0-1 落地 · 服务宝洁汰渍全平台 KOL 营销，业务实操与 AI 产品开发深度结合', items: [
    '<b>全链路投放闭环操盘</b> — 统筹达人筛选、商务 BD、内容风控、投放复盘全流程，月均 @@scale.creators@@ 博主投放、月均消耗 @@scale.spend@@；从重复作业中提炼审核、匹配两大痛点，输出产品需求驱动 AI 系统搭建',
    '<b>AI 产品独立设计落地</b> — 搭建 RAG 知识库 + 分层 Prompt 审核系统，统一多品牌合规标准；对接飞瓜、MCN 多源 API 完成达人数据建模，搭建场景化匹配引擎与人工评分迭代闭环',
    '<b>投放效果优化</b> — 联动品牌与投流团队校准内容卖点，实现进店率 15%+、CPUV &lt; 15，月度爆文率 40%+',
    '<b>MCN 资源与项目管理</b> — 对接和管理 50+ MCN 机构，完成年框谈判、合规入库、合同签署等流程；涵盖黎子安、老爸评测、中国新闻网等优质博主资源'] },
  bf: { n: '02 / 03', org: '蓝色光标', role: '高级客户执行', logo: '/assets/icons/logo-bluefocus.png',
    span: '2023.04 — 2024.07', sub: '初识 AI · 操盘头部 KOL 全案，识别自动化工具核心诉求 · 脉动、简爱品牌百万级达人投放，深耕头部 KOL 全域 Campaign 全案落地', items: [
    '<b>头部 KOL 全案操盘</b> — 承接何同学等 TOP 级达人多平台打包投放，独立完成商务议价、内容共创、跨部门协同、投放管控全流程；曝光与互动数据超额达成品牌目标 200%，沉淀头部达人合作 SOP 与内容风控标准',
    '<b>批量投放流程标准化</b> — 落地多品牌并行投放 SOP，识别人工筛选与素材复核的重复低效问题，明确自动化工具的核心业务诉求，为后续 AI 系统建设提供需求输入'] },
  ml: { n: '03 / 03', org: '茉莉数科集团', role: '客户执行', logo: '/assets/icons/logo-moli.png',
    span: '2021.11 — 2023.03', sub: '内容 + 投放 · 抖音官号全链路运营与数据驱动迭代 · 服务宝洁潘婷、飘柔品牌，完整负责品牌官方抖音账号运营全链路', items: [
    '<b>抖音官号内容统筹</b> — 闭环供应商筛选、演员对接、线下拍摄、成片审核交付全流程，搭建短视频内容合规校验清单，统一品牌内容输出标准',
    '<b>达人投放执行</b> — 完成达人推荐、排期、内容审核、发布跟进全链路落地',
    '<b>数据驱动内容迭代</b> — 常态化回收短视频与达人投放数据，拆解播放、转化、受众画像指标，输出选题与达人筛选优化建议'] },
};
let ccModal = null, ccLast = null;
function ccClose() {
  if (!ccModal) return;
  ccModal.remove(); ccModal = null;
  document.documentElement.classList.remove('ccx-lock');
  if (ccLast) { ccLast.focus(); ccLast = null; }
}
function ccOpen(btn) {
  const d = EXP[btn.dataset.exp]; if (!d) return;
  ccClose();
  ccLast = btn;
  ccModal = document.createElement('div');
  ccModal.className = 'ccx-modal';
  ccModal.setAttribute('role', 'dialog'); ccModal.setAttribute('aria-modal', 'true');
  ccModal.setAttribute('aria-label', d.org + ' 详细经历');
  ccModal.innerHTML = `<div class="ccx-bg" data-ccx-close></div>
    <div class="ccx-panel">
      <header class="ccx-head">
        <img class="ccx-logo" src="${d.logo}" width="40" height="40" alt="">
        <div class="ccx-title"><p class="ccx-kicker">EXPERIENCE ${d.n} · ${d.span}</p><h3>${d.org}<span>${d.role}</span></h3></div>
        <button type="button" class="ccx-x" data-ccx-close>✕ 关闭</button>
      </header>
      <p class="ccx-sub">${d.sub}</p>
      <ul class="ccx-list">${d.items.map((i) => '<li>' + i + '</li>').join('')}</ul>
    </div>`;
  document.body.appendChild(ccModal);
  document.documentElement.classList.add('ccx-lock');
  ccModal.querySelector('.ccx-x').focus();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.cc-more');
  if (b) { ccOpen(b); return; }
  if (ccModal && e.target.closest('[data-ccx-close]')) ccClose();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ccModal) ccClose(); });

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
