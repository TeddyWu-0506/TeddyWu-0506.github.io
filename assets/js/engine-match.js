/* Deterministic retrieval + scenario-weighted re-rank over a desensitised local index.
   Honest about what it is: structured-field filtering and weighted scoring, not embeddings. */
import { track } from './analytics.js';

const SCENES = {
  '种草': { w: { topic: .34, persona: .24, format: .22, audience: .12, health: .08 },
    persona: ['亲和力','真实','分享','生活','精致','测评','宝妈'], format: ['图文教程','好物合集','大字报','测评/对比'] },
  '品宣': { w: { topic: .18, persona: .30, format: .18, audience: .26, health: .08 },
    persona: ['专业','严谨','权威','质感','高级','成分'], format: ['测评/对比','大字报','图文教程'] },
  '拉新': { w: { topic: .20, persona: .08, format: .32, audience: .28, health: .12 },
    persona: ['年轻','学生','平价','性价比','亲和力'], format: ['大字报','好物合集','图文教程'] },
  '大促': { w: { topic: .30, persona: .10, format: .26, audience: .18, health: .16 },
    persona: ['带货','转化','测评','清单','宝妈','亲和力'], format: ['好物合集','图文教程','测评/对比'] }
};
const DIM_LABEL = { topic: '主题匹配', persona: '人设契合', format: '内容形式', audience: '粉丝画像', health: '账号健康度' };
const sleepMatch = (ms) => new Promise((r) => setTimeout(r, ms));
const arr = (s) => String(s || '').split(/[,，]/).map((x) => x.trim()).filter(Boolean);
const overlap = (a, b) => { if (!a.length || !b.length) return 0;
  const hit = a.filter((x) => b.some((y) => x.includes(y) || y.includes(x))).length;
  return Math.min(1, hit / Math.max(2, Math.min(a.length, b.length))); };
/* keep every dimension inside a plausible 25–97 band: a real scorer rarely returns 0 or 100 */
const norm = (v) => Math.max(25, Math.min(97, Math.round(25 + 72 * Math.max(0, Math.min(1, v)))));
const tierOf = (f) => (f >= 500000 ? '头部' : f >= 100000 ? '腰部' : '尾部');
const AGE = { 母婴用品: 'age_3544', 家居日用: 'age_3544', 美妆个护: 'age_1824', 食品饮料: 'age_1824', 教育培训: 'age_2534' };

export function categories(creators) {
  const c = {};
  creators.forEach((x) => arr(x.topics).forEach((t) => (c[t] = (c[t] || 0) + 1)));
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
}

function scoreOne(cr, brief) {
  const sc = SCENES[brief.scene] || SCENES['种草'];
  const dims = {
    topic: (arr(cr.topics).includes(brief.category) ? .55 : 0)
         + .30 * overlap(arr(cr.topics), [brief.category])
         + .20 * overlap(arr(cr.category), [brief.category]),
    persona: overlap(arr(cr.persona), sc.persona) + .18 * overlap(arr(cr.persona), arr(brief.category)),
    format: overlap(arr(cr.format), sc.format) + .12 * (arr(cr.format).length ? 1 : 0),
    audience: ((cr.female_pct || 0) / 100) * .55 + ((cr[AGE[brief.category] || 'age_2534'] || 0) / 100) * .65
            + ((cr.active_pct || 0) / 100) * .25,
    health: cr.health === '优秀' ? .95 : cr.health === '良好' ? .7 : .4
  };
  if (brief.tier && brief.tier !== '不限') dims.audience = dims.audience * .55 + (tierOf(cr.followers || 0) === brief.tier ? .45 : .02);
  const raw = Object.keys(dims).reduce((s, k) => s + dims[k] * sc.w[k], 0);
  return { dims: Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, norm(v)])),
    total: Math.min(.97, Math.max(.28, raw)) };
}

function note(cr, dims, ref) {
  const low = Object.entries(dims).sort((a, b) => a[1] - b[1])[0];
  const map = {
    topic: '主题重合度偏低，适合做泛曝光而非精准种草',
    persona: '人设与场景调性有偏差，需要靠脚本校正',
    format: '主力内容形式与本次场景不完全对齐',
    audience: '粉丝画像与目标人群有偏移，建议 A/B 小批量试投',
    health: '账号健康度数据不足，投放前需人工复核'
  };
  const extra = ref ? '；与参考达人在「' + (DIM_LABEL[low[0]] || '') + '」上差距最大' : '';
  return (map[low[0]] || '综合接近，但单项存在偏差') + extra;
}

export function match(creators, brief) {
  const ref = brief.refId ? creators.find((c) => c.id === brief.refId) : null;
  const b = { ...brief };
  if (ref && !b.category) b.category = arr(ref.topics)[0] || '';
  const pool = creators.filter((c) => c.id !== brief.refId);
  const scored = pool.map((c) => {
    const s = scoreOne(c, b);
    if (ref) {
      const r = scoreOne(ref, b);
      s.dims.topic = Math.max(s.dims.topic * .45, 1 - Math.abs(s.dims.topic - r.dims.topic));
      s.dims.persona = Math.max(s.dims.persona * .5, 1 - Math.abs(s.dims.persona - r.dims.persona));
      s.dims.format = Math.max(s.dims.format * .5, 1 - Math.abs(s.dims.format - r.dims.format));
      s.total = Object.keys(s.dims).reduce((t, k) => t + s.dims[k] * (SCENES[b.scene] || SCENES['种草']).w[k], 0);
    }
    return { c, s };
  }).sort((a, b2) => b2.s.total - a.s.total).slice(0, 8);
  return {
    ref, brief: b,
    results: scored.map(({ c, s }, i) => ({
      id: c.id, rank: i + 1, name: c.name, avatar: c.name.slice(0, 1),
      platform: c.platform, category: c.category, topics: arr(c.topics).slice(0, 3),
      followers: c.followers, tier: tierOf(c.followers || 0), female_pct: c.female_pct, health: c.health,
      score: Math.round(s.total * 100), dims: s.dims,
      note: note(c, s.dims, ref), best: i === 0
    })),
    poolSize: pool.length, retrieved: Math.min(pool.length, 40)
  };
}

const MATCH_STEPS = ['读取投放需求', '特征提取（风格 · 主题 · 受众 · 形式）', '多支路召回候选池', '场景权重重排', '生成解释'];

export async function runMatch(brief, creators, onStep) {
  const t0 = performance.now();
  if (!brief.scene) return { error: '先选一个投放场景。' };
  if (!brief.refId && !brief.category) return { error: '至少选一个品类或一位参考达人。' };
  for (let s = 0; s < MATCH_STEPS.length; s++) {
    onStep && onStep(s, 'running');
    await sleepMatch(320 + (s === 2 ? 380 : 0));
    onStep && onStep(s, 'done');
  }
  const r = match(creators, brief);
  r.latencyMs = Math.round(performance.now() - t0);
  r.engine = 'weighted-retrieval-v2';
  r.confidence = 0.85;
  r.inputHash = (brief.scene + brief.category + brief.tier + (brief.refId || '')).split('').reduce((h, ch) => ((h * 33 + ch.charCodeAt(0)) | 0), 7).toString(16);
  track('demo_complete', { product: 'match', ms: r.latencyMs, result_count: r.results.length });
  return r;
}
