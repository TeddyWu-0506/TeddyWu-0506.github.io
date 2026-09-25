import { mountReviewProduct } from './review-product.js';
import { mountMatchProduct } from './match-product.js';
import { runMatch, categories } from './engine-match.js';
import { track } from './analytics.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const AVC = ['#667B4C', '#A66C50', '#567B7A', '#7A6A8C', '#4F6B45', '#8A6B4A'];
const av = (n) => AVC[[...String(n)].reduce((s, c) => s + c.charCodeAt(0), 0) % AVC.length];
const wan = (f) => (f >= 10000 ? (f / 10000).toFixed(f >= 1000000 ? 0 : 1) + 'w' : String(f || 0));

const STEPS_MATCH = ['读取需求', '特征提取', '多支路召回', '场景重排', '生成解释'];

const pipeHTML = (steps) => `<ol class="pipe" role="list">${steps.map((s) =>
  `<li class="pipe-step"><span class="pipe-dot"></span><span class="pipe-name">${esc(s)}</span></li>`).join('')}</ol>`;

const stateHTML = {
  empty: (label, extra) => `<div class="demo-state"><div class="box">${esc(label)}<br>${extra}</div></div>`,
  error: (msg) => `<div class="demo-state"><div class="box" style="border-color:#7A3A32">✗ ${esc(msg)}</div>
    <div class="demo-actions"><button class="btn btn--solid btn--sm" data-act="retry">重试</button>
    <button class="btn btn--link btn--sm" data-act="fallback" style="border-color:#4A4E47;color:#B4B8AE">使用缓存样例</button></div></div>`
};

async function loadJSON(p) { const r = await fetch(p); if (!r.ok) throw new Error(p); return r.json(); }

/* ------------------------------------------------------------------ MOUNT */
export function mountDemo(host) {
  host._mounted = true;
  const product = host.dataset.demo;
  if (product === 'review') { mountReviewProduct(host); return; }
  if (product === 'match') { mountMatchProduct(host); return; }
  const source = host.dataset.source || 'deck';
  const steps = STEPS_MATCH;
  host.innerHTML = `<div class="demo">
    <div class="demo-input">
      <div>
        <span class="f-label">投放需求</span>
        <div data-form></div>
      </div>
      <div class="demo-actions" data-actions></div>
    </div>
    <div class="demo-out" aria-live="polite">
      ${pipeHTML(steps)}
      <div class="pipe-log" data-log>待运行 · 引擎 weighted-retrieval-v2</div>
      <div data-result>${stateHTML.empty('还没有输入。', '选一个场景和品类，或指定一位参考达人 ↓')}</div>
    </div>
  </div>`;
  const form = host.querySelector('[data-form]');
  const actions = host.querySelector('[data-actions]');
  const result = host.querySelector('[data-result]');
  const logEl = host.querySelector('[data-log]');
  const pipeSteps = [...host.querySelectorAll('.pipe-step')];

  const setStep = (i, st) => { pipeSteps[i] && pipeSteps[i].classList.toggle('is-running', st === 'running');
    pipeSteps[i] && pipeSteps[i].classList.toggle('is-done', st === 'done');
    pipeSteps[i] && pipeSteps[i].classList.toggle('is-error', st === 'error'); };
  const reset = () => { pipeSteps.forEach((s) => s.classList.remove('is-running', 'is-done', 'is-error')); };
  const log = (t) => { logEl.textContent = t; };


    form.innerHTML = `<div style="display:grid;gap:14px">
      <div><span class="f-label">投放场景</span><div class="chip-row" data-in="scene">
        ${['种草', '品宣', '拉新', '大促'].map((s, i) => `<button class="chip" type="button" aria-pressed="${i === 0}" data-v="${s}">${s}</button>`).join('')}
      </div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label class="f-label" for="mt-cat">品类</label><select class="field" id="mt-cat" data-in="category"></select></div>
        <div><label class="f-label" for="mt-tier">达人体量</label><select class="field" id="mt-tier" data-in="tier">
          <option value="不限">不限</option><option value="头部">头部 50w+</option><option value="腰部">腰部 10–50w</option><option value="尾部">尾部 &lt;10w</option>
        </select></div>
      </div>
      <div><label class="f-label" for="mt-ref">参考达人（可选 · 相似推荐模式）</label>
        <select class="field" id="mt-ref" data-in="refId"><option value="">不使用参考达人</option></select></div>
      <p class="hint" data-count>索引载入中…</p>
    </div>`;
    actions.innerHTML = `<button class="btn btn--solid" data-act="run">运行匹配 <span class="ar">↘</span></button>`;
    const bindSceneChips = () => form.querySelectorAll('[data-in=scene] .chip').forEach((ch) =>
      ch.addEventListener('click', () => {
        form.querySelectorAll('[data-in=scene] .chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
        ch.setAttribute('aria-pressed', 'true');
      }));

    const run = async () => {
      reset(); result.innerHTML = ''; log('running…');
      const g = (k) => form.querySelector(`[data-in=${k}]`);
      const cat = g('category'), tier = g('tier'), ref = g('refId');
      const brief = { scene: form.querySelector('[data-in=scene] .chip[aria-pressed=true]')?.dataset.v,
        category: cat ? cat.value : '', tier: tier ? tier.value : '不限', refId: ref ? (ref.value || null) : null };
      track('demo_start', { product: 'match', input_type: brief.refId ? 'reference_creator' : 'brief', source });
      actions.querySelector('[data-act=run]').setAttribute('aria-busy', 'true');
      try {
        const list = window.__CREATORS__ || (await loadJSON('/assets/data/creators.json'));
        const rr = await runMatch(brief, list, setStep);
        if (rr.error) { result.innerHTML = stateHTML.error(rr.error); log('rejected'); return; }
        renderMatch(result, rr, host);
        log(`done · ${rr.latencyMs}ms · pool ${rr.poolSize} → retrieved ${rr.retrieved} → top ${rr.results.length} · ${rr.engine}`);
      } catch (err) { result.innerHTML = stateHTML.error('索引加载失败（' + esc(err.message) + '）'); log('error'); }
      finally { actions.querySelector('[data-act=run]')?.removeAttribute('aria-busy'); }
    };

    actions.addEventListener('click', (e) => {
      if (e.target.closest('[data-act=run]') || e.target.closest('[data-act=retry]')) run();
    });

    /* selects need the index, so the deep link is applied only after it resolves */
    const applyDeepLink = () => {
      const q = new URLSearchParams(location.search);
      if (!q.toString()) return;
      const scene = q.get('scene');
      if (scene) form.querySelectorAll('[data-in=scene] .chip').forEach((x) =>
        x.setAttribute('aria-pressed', String(x.dataset.v === scene)));
      [['category', '#mt-cat'], ['tier', '#mt-tier'], ['ref', '#mt-ref']].forEach(([k, sel]) => {
        const v = q.get(k); const el = form.querySelector(sel);
        if (v && el) el.value = v;
      });
      if (q.get('run') === '1') setTimeout(run, 200);
    };

    loadJSON('/assets/data/creators.json')
      .then((list) => {
        window.__CREATORS__ = list;
        form.querySelector('#mt-cat').innerHTML = categories(list).map((c, i) => `<option${i ? '' : ' selected'}>${esc(c)}</option>`).join('');
        form.querySelector('#mt-ref').innerHTML = '<option value="">不使用参考达人</option>' +
          list.map((c) => `<option value="${c.id}">${esc(c.name)} · ${wan(c.followers)}</option>`).join('');
        form.querySelector('[data-count]').textContent =
          `本地脱敏索引 ${list.length} 位 · 线上系统索引规模更大，此处仅演示链路`;
        bindSceneChips();
        applyDeepLink();
      })
      .catch(() => { form.querySelector('[data-count]').textContent = '索引加载失败'; bindSceneChips(); });
}

/* --------------------------------------------------------------- RENDER */
function renderMatch(box, r, host) {
  const rows = r.results.map((c) => `
    <div class="crow ${c.best ? 'is-best' : ''}" data-crow="${c.id}">
      <span class="crow-rank">${String(c.rank).padStart(2, '0')}</span>
      <span class="crow-av" style="background:${av(c.name)}">${esc(c.avatar)}</span>
      <span class="crow-main"><b>${esc(c.name)}</b><span>${esc(c.category || c.topics.join(' · '))} · ${c.tier} ${wan(c.followers)} · 女粉 ${c.female_pct != null ? c.female_pct + '%' : '未提供'}</span></span>
      <span class="crow-score">${c.score}%</span>
      <button class="crow-x" aria-expanded="false" data-act="x" title="展开逐维解释">${c.best ? '★' : '+'}</button>
      <div class="crow-detail">
        <div class="dims">${Object.entries(c.dims).map(([k, v]) => `
          <div class="dim"><span>${esc(({ topic: '主题匹配', persona: '人设契合', format: '内容形式', audience: '粉丝画像', health: '账号健康度' })[k])}</span>
          <i><b style="width:${v}%"></b></i><em>${v}</em></div>`).join('')}</div>
        <p class="crow-note">${esc(c.note)}</p>
        <div class="crow-facts">${[c.health && `健康度 ${c.health}`, c.active_pct && `活跃粉 ${c.active_pct}%`,
          c.topics.length && `主题 ${c.topics.join('/')}`].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('')}</div>
        <div class="demo-actions"><button class="btn btn--sm" data-fa="adopt" style="border:1px solid #4A4E47;border-radius:3px;color:#C9CCC4">采纳进候选池</button>
          <button class="btn btn--sm" data-fa="dismiss" style="border:1px solid #4A4E47;border-radius:3px;color:#C9CCC4">忽略</button></div>
      </div>
    </div>`).join('');
  box.innerHTML = `<div class="verdict"><b>${r.results.length} 位候选</b>
      <span>按「${esc(r.brief.scene)}」重排${r.ref ? ' · 参考：' + esc(r.ref.name) : ''}</span>
      <span>候选池匹配率 85%（口径见完整项目）</span></div>
    <p class="finding-why" style="margin-bottom:12px">索引 ${r.poolSize} 条脱敏样例，全量参与召回与重排 → 输出 ${r.results.length} 位候选（非线上全量）</p>
    <div class="creators">${rows}</div>
    <div class="panel-note">结构化字段过滤 + 场景加权重排 · 本地无模型调用</div>`;
  box.querySelectorAll('[data-act=x]').forEach((b) => b.addEventListener('click', () => {
    const row = b.closest('.crow');
    const open = row.classList.toggle('is-open');
    b.setAttribute('aria-expanded', String(open)); b.textContent = open ? '–' : (row.classList.contains('is-best') ? '★' : '+');
    track('demo_action', { product: 'match', action: open ? 'expand' : 'collapse' });
  }));
  box.querySelectorAll('[data-fa]').forEach((b) => b.addEventListener('click', () => {
    b.textContent = b.dataset.fa === 'adopt' ? '已采纳 ✓' : '已忽略'; b.disabled = true;
    track('demo_action', { product: 'match', action: b.dataset.fa });
  }));
  box.querySelector('.crow')?.classList.add('is-open');
  const firstX = box.querySelector('.crow [data-act=x]'); if (firstX) { firstX.textContent = '–'; firstX.setAttribute('aria-expanded', 'true'); }
  wireFooter(box, host);
}

function wireFooter(box, host) {
  const url = host.dataset.caseUrl;
  if (!url) return;
  const a = document.createElement('a');
  a.className = 'btn btn--link btn--sm'; a.href = url; a.style.marginTop = '16px';
  a.style.color = 'var(--paper-1)'; a.style.borderColor = '#4A4E47';
  a.innerHTML = '看这个系统是怎么搭的 <span class="ar">→</span>';
  a.dataset.track = 'demo_to_case';
  box.appendChild(a);
}

/* -------------------------------------------------------------- PREVIEW */
export function mountPreview(host) {
  host._mounted = true;
  /* The product window is authored markup, not JS-injected, so the panel has its
     real height at first paint and contributes nothing to CLS. All that is left
     here is the one-shot "it is alive" animation. */
  const lines = [...host.querySelectorAll('.app-line')];
  const nums = [...host.querySelectorAll('[data-n]')];
  if (RM) { lines.forEach((l, i) => l.classList.add(i ? 'is-hl2' : 'is-hl')); return; }
  if (!lines.length && !nums.length) return;
  setTimeout(() => {
    lines[0]?.classList.add('is-hl');
    setTimeout(() => lines[1]?.classList.add('is-hl2'), 420);
    nums.forEach((b, i) => {
      const to = +(b.dataset.n || 0); if (!to) return;
      b.textContent = '0';
      setTimeout(() => { let v = 0; const t = setInterval(() => { b.textContent = ++v; if (v >= to) clearInterval(t); }, 110); }, i * 260);
    });
  }, 500);
}
