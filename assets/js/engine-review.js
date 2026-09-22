/* Local deterministic rule engine. No model call, no network, no data leaves the page.
   Output shape is identical to the Phase-2 /api/review contract. */
import { track } from './analytics.js';

const SEV = { fail: '必改', warn: '需核对', sug: '建议', human: '转人工' };
const TERM_SUG = {
  '所有':'多种常见', '完全':'在很大程度上', '100%':'绝大多数', '永久':'持久', '彻底':'明显',
  '最好':'表现突出', '第一':'靠前', '唯一':'少见', '万能':'多用途', '任何一个':'部分',
  '绝对':'相当', '温和不刺激':'', '修复受损':'改善干枯毛躁观感', '治疗':'', '杀菌':'',
  '抗菌':'', '医用':'', '生发':'', '防脱':'',
  '必须回购':'值得一试', '闭眼入':'可以试试', '不买后悔':'', '限时抢':'本期活动', '错过没有':''
};
const RANK = { fail: 0, warn: 1, human: 2, sug: 3 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const splitTerms = (s) => s.split(/[,，]/).map((x) => x.trim()).filter(Boolean);

export function analyse(text, brandId, rules) {
  const brand = rules.brands[brandId];
  const lines = text.split(/\n/);
  const findings = [];
  const hits = [];
  let partial = null;
  if (!brand) {
    partial = '未找到该品牌的规则集，已按通用规则校验';
    findings.push({ type: '卖点缺失', sev: 'sug', from: '', to: '', why: '规则库未覆盖该品牌，建议人工确认核心卖点。', conf: 0.5 });
  }
  if (brand) {
    // 1. banned expressions
    for (const [cat, terms] of Object.entries(brand.banned)) {
      const sev = rules.severity[cat] || 'warn';
      for (const term of terms) {
        const at = text.indexOf(term);
        if (at < 0) continue;
        const line = Math.max(1, lines.findIndex((l) => l.includes(term)) + 1);
        const conf = cat === '诱导表述' ? 0.41 : cat === '功效超范围' ? 0.78 : 0.93;
        const sug = TERM_SUG[term] !== undefined ? TERM_SUG[term]
          : (cat === '绝对化表述' ? '改为限定表述' : cat === '功效超范围' ? '按备案功效改写' : '删除或改写');
        findings.push({ type: cat, sev, from: term, to: sug,
          why: rules.why[cat] + '（第 ' + line + ' 行）', conf });
        hits.push(cat + ':' + term);
      }
    }
    // 2. product name must match verbatim
    for (const [canon, variants] of Object.entries(brand.products)) {
      // strip canonical names first, so "留香珠" inside "柔顺留香珠" is not a false positive
      const stripped = Object.entries(brand.products).reduce(
        (s, [c]) => s.split(c).join(' '), text);
      const v = variants.find((x) => stripped.includes(x));
      if (v) {
        findings.push({ type: '产品名称错误', sev: rules.severity['产品名称错误'], from: v, to: canon,
          why: rules.why['产品名称错误'], conf: 0.88 });
        hits.push('product:' + v);
      }
    }
    // 3. required selling points
    const found = brand.required_selling_points.filter((p) => text.includes(p));
    if (!found.length) {
      findings.push({ type: '卖点缺失', sev: rules.severity['卖点缺失'], from: '', to: brand.required_selling_points.slice(0, 2).join(' / '),
        why: rules.why['卖点缺失'] + '（当前命中 0/' + brand.required_selling_points.length + '）', conf: 0.72 });
    } else hits.push('selling:' + found.join('|'));
  }
  // dedupe + rank
  const seen = new Set();
  const list = findings
    .filter((f) => { const k = f.type + f.from; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => RANK[a.sev] - RANK[b.sev])
    .map((f, n) => ({ ...f, id: 'f' + (n + 1), label: SEV[f.sev], rule: f.type,
      needsHuman: f.sev === 'human' || f.conf < 0.5 }));
  const blocking = list.filter((f) => f.sev === 'fail').length;
  const suggestions = list.filter((f) => f.sev === 'sug').length;
  const human = list.filter((f) => f.needsHuman).length;
  const conf = list.length ? Math.round((list.reduce((s, f) => s + f.conf, 0) / list.length) * 100) / 100 : 0.96;
  let revised = text;
  list.filter((f) => f.to && f.from).forEach((f) => { revised = revised.split(f.from).join(f.to); });
  return { findings: list, verdict: { blocking, suggestions, human, total: list.length },
    confidence: conf, ruleHits: hits, rulesRetrieved: brand ? Object.values(brand.banned).flat().length + Object.keys(brand.products).length + brand.required_selling_points.length : 0,
    passable: blocking === 0 && human === 0, revised, partial };
}

const REVIEW_STEPS = ['解析稿件', '召回品牌规则', '分层校验（风险 · 规范 · 语气）', '问题排序', '生成可执行意见'];

export async function runReview({ text, brandId }, rules, onStep) {
  const t0 = performance.now();
  if (!text || text.trim().length < 40) {
    return { error: '稿件太短，至少 40 字。粘贴一段真实素材再试。' };
  }
  const inputHash = [...text].reduce((h, c) => ((h * 31 + c.charCodeAt(0)) | 0), 5381).toString(16);
  const logs = [];
  for (let s = 0; s < REVIEW_STEPS.length; s++) {
    onStep && onStep(s, 'running');
    await sleep(300 + (s === 2 ? 420 : 0) + (s === 4 ? 260 : 0));
    onStep && onStep(s, 'done');
    const r = analyse(text, brandId, rules);
    if (s === 1) logs.push('retrieved ' + r.rulesRetrieved + ' rules · brand=' + brandId);
    if (s === 2) logs.push('risk ' + r.findings.filter((f) => f.sev === 'fail').length + ' · spec ' + r.findings.filter((f) => f.sev === 'warn').length + ' · tone ' + r.findings.filter((f) => f.sev === 'human').length);
    if (s === 3) logs.push('ranked ' + r.verdict.total + ' findings');
    if (s === 4) logs.push('draft feedback ready');
  }
  const result = analyse(text, brandId, rules);
  const latencyMs = Math.round(performance.now() - t0);
  track('demo_complete', { product: 'review', ms: latencyMs, result_count: result.verdict.total });
  return { ...result, product: 'review', inputHash, latencyMs, logs, engine: 'local-rules-v4', cached: false };
}
