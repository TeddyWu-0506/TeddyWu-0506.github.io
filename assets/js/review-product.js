/* Content QC System · 产品交互 Demo（Mock）
   1:1 复刻线上 Content QC Dev Platform（frontend/src/features/content-qc）的界面与交互：
   顶栏 / 品牌侧栏 / 步骤指示 / 来源选择 / 文档导入 / BRIEF 选择 / 流式审核 /
   问题卡片（批准·拒绝·编辑·写回）/ 右侧文档预览联动 / 品牌配置面板。
   数据全部来自本文件与预置稿件（芸朵泡饭 · 汰渍原液 CMS1），不发起任何真实 API / CLI 请求。 */
import { track } from './analytics.js';

const qesc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const qsleep = (ms) => new Promise((r) => setTimeout(r, ms));
const A = '/assets/qc';

const BRANDS = [{"id": "ariel", "name": "Ariel", "cn": "碧浪", "logo": "ariel.png"}, {"id": "braun", "name": "Braun", "cn": "博朗", "logo": "braun.png"}, {"id": "crest", "name": "Crest", "cn": "佳洁士", "logo": "crest.png"}, {"id": "downy", "name": "Downy", "cn": "当妮", "logo": "downy.png"}, {"id": "gillette", "name": "Gillette", "cn": "吉列", "logo": "gillette.png"}, {"id": "hairrecipe", "name": "Hair Recipe", "cn": "发之食谱", "logo": "hair-recipe.png"}, {"id": "olay", "name": "OLAY", "cn": "玉兰油", "logo": "olay.png"}, {"id": "olaypcc", "name": "OLAY-PCC", "cn": "身体护理", "logo": "olay-pcc.png"}, {"id": "oralb", "name": "Oral-B", "cn": "欧乐B", "logo": "oral-b.png"}, {"id": "pampers", "name": "Pampers", "cn": "帮宝适", "logo": "pampers.png"}, {"id": "pantene", "name": "Pantene", "cn": "潘婷", "logo": "pantene.png"}, {"id": "safeguard", "name": "Safeguard", "cn": "舒肤佳", "logo": "safeguard.png"}, {"id": "skii", "name": "SK-II", "cn": "护肤", "logo": "sk-ii.png"}, {"id": "tampax", "name": "Tampax", "cn": "丹碧丝", "logo": "tampax.png"}, {"id": "tide", "name": "Tide", "cn": "汰渍", "logo": "tide.png"}, {"id": "venus", "name": "Venus", "cn": "维纳斯", "logo": "venus.png"}, {"id": "whisper", "name": "Whisper", "cn": "护舒宝", "logo": "whisper.png"}];
const LETTER_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C2D12', '#4338CA', '#0D9488'];
const letterColor = (id) => { let h = 0; for (const c of id) h = c.charCodeAt(0) + ((h << 5) - h); return LETTER_COLORS[Math.abs(h) % LETTER_COLORS.length]; };

const CATEGORIES = {
  all: { label: '全部', color: '#64748B' },
  brief_mismatch: { label: '内容与 BRIEF 不符合', color: '#EF4444' },
  ad_risk: { label: '存在广告审核风险', color: '#F59E0B' },
  typo: { label: '错别字', color: '#8B5CF6' },
  better_expression: { label: '有更好的表述方式', color: '#3B82F6' },
};
const STATUS_COLORS = {
  pending:  { bg: '#F8FAFC', border: '#CBD5E1', badge: '#64748B', label: '待处理' },
  approved: { bg: '#F0FDF4', border: '#86EFAC', badge: '#15803D', label: '已批准' },
  rejected: { bg: '#FEF2F2', border: '#FCA5A5', badge: '#B91C1C', label: '已拒绝' },
  edited:   { bg: '#EFF6FF', border: '#93C5FD', badge: '#1D4ED8', label: '已修改' },
};
const TYPE_LABEL = { title: '标题', text: '正文', image: '图片', tag: '标签', image_desc: '图片描述' };
const CATEGORY_LABELS = {
  efficacy_overclaim: '绝对化/夸大描述，有广告合规风险', ad_risk: '存在广告审核风险',
  brief_mismatch: '内容与 BRIEF 不符合', typo: '存在错别字',
  better_expression: '有更好的表述方式', brand_inconsistency: '品牌/产品名表述不一致',
};

/* ── 预置稿件：5.12【图文稿件】芸朵泡饭-汰渍原液-CMS1（真实稿件，block 化） ── */
const DOC_NAME = '5.12【图文稿件】芸朵泡饭-汰渍原液-CMS1-洗全家衣服.docx';
const BLOCKS_SEED = [
  { id: 'b01', type: 'text', content: 'KOL Name：芸朵泡饭' },
  { id: 'b02', type: 'text', content: '个人主页：https://www.xiaohongshu.com/user/profile/5c4ea86b…（脱敏）' },
  { id: 'b03', type: 'text', content: '合作产品：汰渍原液' },
  { id: 'b04', type: 'text', content: '内容方向：CMS1 - 一瓶洗全家衣服' },
  { id: 'b05', type: 'text', content: '发布标题：' },
  { id: 'b06', type: 'title', content: '挖到宝！这瓶洗衣液让我精简洗衣步骤🧺' },
  { id: 'b07', type: 'text', content: '发布正文：' },
  { id: 'b08', type: 'text', content: '✨ 以前洗衣服真的好繁琐😭 洗衣液、衣领净、柔顺剂、留香珠……瓶瓶罐罐摆满一阳台，洗个衣服跟做化学实验一样🧪 直到闺蜜安利了这瓶汰渍洗衣液，才知道什么叫一瓶搞定日常洗衣！特殊流体质地，深层清洁+持久留香+护衣亮彩+温和护衣多重功效融于一瓶，活性物含量丰富，用量更省💪' },
  { id: 'b09', type: 'text', content: '💪 去渍效果挺惊喜的～家里那位吃火锅必溅油点的白T，以前手搓半天还留印。现在直接扔洗衣机倒100ML就行，不用预涂也能洗得比较干净！领口袖口油渍、果渍这些日常污渍对付起来很轻松👍 入的是薰衣草香，洗完衣服是那种清雅花香，晾干叠进衣柜还能闻到淡淡香气，感觉可以少放留香珠啦🌸' },
  { id: 'b10', type: 'text', content: '👐 配方温和亲肤，pH值偏碱性，手洗不粘手，机洗低泡易漂。日常白衣洁净、彩衣不串色，娇贵针织衫也能放心洗💡 浓缩配方用量超省，一瓶能用超久，性价比很可！现在洗衣区就这一瓶，阳台都清爽了🌿 亲测好用，懒人必备，真心推荐给各位姐妹～' },
  { id: 'b11', type: 'text', content: 'TAG：' },
  { id: 'b12', type: 'tag', content: '汰渍洗衣液' },
  { id: 'b13', type: 'tag', content: '洗衣原液' },
  { id: 'b14', type: 'tag', content: '懒人洗衣神器' },
  { id: 'b15', type: 'tag', content: '家务好物分享' },
  { id: 'b16', type: 'tag', content: '衣物清洁' },
  { id: 'b17', type: 'tag', content: '洗衣好物' },
  { id: 'b18', type: 'tag', content: '家居好物' },
  { id: 'b19', type: 'tag', content: '洗衣液推荐' },
  { id: 'b20', type: 'tag', content: '去渍神器' },
  { id: 'b21', type: 'tag', content: '持久留香' },
  { id: 'b22', type: 'tag', content: '山茶花香' },
  { id: 'b22a', type: 'image', img: 'image1.jpg', content: '图1｜封面图：芸朵泡饭 × 汰渍洗衣原液' },
  { id: 'b23', type: 'image', img: 'image2.jpg', content: '图2｜产品质地特写：手拿原液瓶往透明玻璃杯里倒出原液，展示非牛顿流体稠稠质地，高浓缩挂壁性强。花字："高浓缩，少量即可满足日常洗涤需求！"' },
  { id: 'b24', type: 'image', img: 'image3.jpg', content: '图3｜顽固污渍清洁对比：左右对比图，左边沾了火锅油渍/领口发黄的白T（洗之前），右边洗完干干净净（洗之后）。花字："顽固油渍轻松搞定🔥"' },
  { id: 'b25', type: 'image', img: 'image4.jpg', content: '图4｜一瓶替代N瓶：左边堆一堆瓶子——洗衣液、柔顺剂、留香珠、衣领净……右边只有一瓶汰渍洗衣原液。花字："告别瓶瓶罐罐❌ 一瓶就够了✅"' },
  { id: 'b26', type: 'image', img: 'image5.jpg', content: '图5｜香味体验图：洗好的白色衣物挂在阳台上，阳光洒下来。标签："雨后山茶花味🌺 持久清新"。或者可以拍手捏着一件洗好的衣服凑近闻的动作特写。' },
  { id: 'b27', type: 'image', img: 'image6.jpg', content: '图6｜用量展示：瓶盖打开，展示半盖用量。标注："约8-10件衣物，半盖用量即可（具体视污渍程度调整）💰超省钱"' },
  { id: 'b28', type: 'image', img: 'image7.jpg', content: '图7｜种草总结图：核心卖点（去渍💪、留香、护衣、省量💰）小图标+短句排布，中间放产品图。底部号召语："姐妹们冲！谁用谁真香✨"' },
];

/* ── 预置审核问题（基于该稿件的真实风险点） ── */
const PRESET = {
  common: [
    { category: 'ad_risk', llm_category: 'efficacy_overclaim', block: 'b10', occ: 1,
      issue: '「懒人必备」为绝对化推荐用语',
      reason: '「必备」属绝对化表述，违反《广告法》第九条，与 GR-001（真实性）及 GR-004（Claim 授权范围）精神冲突，建议改为限定表述。',
      before: '懒人必备', after: '值得一试' },
    { category: 'ad_risk', llm_category: 'ad_risk', block: 'b24', occ: 1,
      issue: '对比图功效承诺缺少证据',
      reason: '前后对比图未标注测试条件，「轻松搞定」构成无证据功效承诺（GR-005 证据及限定语 / GR-007 图文一致性）。',
      before: '顽固油渍轻松搞定', after: '顽固油渍实测对比，清洁力看得见' },
    { category: 'typo', llm_category: 'typo', block: 'b26', occ: 1,
      issue: '「拍手捏着」漏字歧义',
      reason: '应为「拍：手捏着」，交付脚本歧义影响拍摄理解（GR-010 基础内容质量）。',
      before: '或者可以拍手捏着一件洗好的衣服凑近闻的动作特写', after: '或者拍一个手捏着衣服凑近闻的动作特写' },
    { category: 'better_expression', llm_category: 'better_expression', block: 'b28', occ: 1,
      issue: '口号式绝对诱导表述',
      reason: '「谁用谁真香」为绝对化诱导 + 平台低质口头禅，改写后更自然且合规（GR-001 / GR-008）。',
      before: '谁用谁真香', after: '用完都想回购' },
  ],
  brief: [
    { category: 'brief_mismatch', llm_category: 'brand_inconsistency', block: 'b06', occ: 1,
      issue: '标题产品名与 Brief 不符',
      reason: 'Campaign Brief 指定产品为「汰渍洗衣原液」，标题写成「洗衣液」与 SKU 不符（GR-003 品牌及产品信息准确）。',
      before: '这瓶洗衣液', after: '这瓶洗衣原液' },
    { category: 'brief_mismatch', llm_category: 'brand_inconsistency', block: 'b08', occ: 2,
      issue: '正文与 TAG 产品名口径不一致',
      reason: '正文「汰渍洗衣液」及 TAG「#汰渍洗衣液」需统一为 Brief 全称「汰渍洗衣原液」（GR-003）。',
      before: '汰渍洗衣液', after: '汰渍洗衣原液' },
    { category: 'brief_mismatch', llm_category: 'brand_inconsistency', block: 'b09', occ: 1,
      issue: '正文香型与图文素材冲突',
      reason: '图5 与 TAG 均为「雨后山茶花味」，正文写「薰衣草香」构成图文冲突（GR-007 图文一致性）。',
      before: '入的是薰衣草香', after: '入的是雨后山茶花香' },
  ],
};
const BATCH_PLAN = ['common:0', 'common:1', 'common:2', 'common:3', 'brief:0', 'brief:1', 'brief:2'];

/* ── 真实全局规则（backend/data/briefs/GLOBAL_RULES.md）与预置 BRIEF ── */
const GLOBAL_RULES_MD = `# Content QC Global Rules 2.0

> **状态：待业务、法务及品牌团队确认**

## 1. 适用范围

适用于品牌商业合作图文内容的默认 QC 基线。

Global Rules 仅定义跨品牌、跨 Campaign 均成立的基础要求。具体产品信息、Claims、必提卖点、Tag、账号、链接、画面规范及交付要求，必须从当前已确认的 Campaign Brief 中读取，不得写死在 Global Rules 中。

Campaign Rules 可以增加更严格的要求，但不得削弱真实性、商业披露、产品信息准确、功效证据、使用安全及隐私保护要求。

---

## 2. 判定等级

- **Blocker / 硬阻断**：存在重大合规、真实性、安全或误导风险，不允许进入发布流程。
- **Major / 退回修改**：内容不符合要求，修改并重新审核后方可通过。
- **Needs review / 人工复核**：资料不足、证据不完整、OCR 异常或上下文不清，无法可靠自动判断。
- **Not applicable / 不适用**：规则适用条件未触发，不参与通过或不通过判定。

---

## 3. 全局规则

| ID | 规则 | 适用条件 | 失败等级 |
|---|---|---|---|
| **GR-001** | **内容真实性**：使用过程、实际体验、推荐理由、前后变化及效果描述必须基于真实经历，不得虚构、伪造或制造误导性印象。 | 始终 | Blocker |
| **GR-002** | **商业合作披露**：商业合作内容必须按照适用的法律、平台及 Campaign 要求，清晰披露与品牌的合作关系。 | 商业合作内容 | Blocker |
| **GR-003** | **品牌及产品信息准确**：稿件中实际出现的品牌、产品、SKU、规格、包装、成分等信息，必须与已确认资料一致；未确认的信息不得推测。 | 稿件出现相关信息，或 Campaign 明确要求露出 | 明确冲突为 Blocker；无法确认则 Needs review |
| **GR-004** | **Claim 授权范围**：功效、卖点、成分作用、适用人群及效果描述不得超出已确认 Brief 或证据材料的授权范围。 | 出现产品 Claim | Blocker |
| **GR-005** | **证据及限定语**：涉及数据、测试、临床、认证、排名、对比或效果结论时，必须有对应证据，并完整保留必要的适用条件、数据来源及限定语。 | 出现相关陈述 | Blocker |
| **GR-006** | **使用方法及安全**：产品使用部位、方法、步骤、用量、频率及安全提醒必须正确，不得展示或引导危险、错误或未经确认的使用方式。 | 展示或描述产品使用 | Blocker |
| **GR-007** | **图文一致性**：图片中的产品、使用动作、效果演示及关键信息必须与文案和已确认资料一致，不得通过画面制造与文字不同的产品理解或效果认知。 | 含图片或视觉素材 | 一般不一致为 Major；涉及产品身份、Claim 或安全冲突为 Blocker |
| **GR-008** | **比较及表达合规**：不得出现未经授权的竞品标识、缺乏证据的比较、贬低拉踩、侮辱、歧视或与内容无关的高风险争议表达。 | 涉及竞品、比较或相关表达 | Blocker |
| **GR-009** | **隐私及个人信息保护**：涉及消费者互动、用户素材或个人信息时，不得未经授权收集、使用、展示或披露个人信息。 | 涉及消费者或个人信息 | Blocker |
| **GR-010** | **基础内容质量**：不得出现影响产品理解、合规判断或发布质量的错别字、错误数字、事实矛盾、前后冲突或明显逻辑断裂。 | 始终 | Major |

---

## 4. GR-003 判定边界

GR-003 只检查：

> **稿件中实际出现的信息，是否与已确认资料一致。**

不得要求每份 Brief 都必须包含品牌名、产品名、SKU、规格、包装及成分等全部字段。

| 已确认资料情况 | 稿件情况 | 判定 |
|---|---|---|
| 对应字段已确认 | 与已确认字段一致 | \`pass\` |
| 对应字段已确认 | 与已确认字段明确冲突 | \`fail / Blocker\` |
| Brief 未提供该字段 | 稿件未出现该字段 | \`not_applicable\` |
| Brief 未提供或字段尚未确认 | 稿件主动新增该字段 | \`needs_review\` |
| 字段存在 OCR、乱码、图片模糊、版式缺失或低置信度 | 无法可靠比较 | \`needs_review\` |
| Campaign 明确要求露出某字段，但 Brief 未提供 | 进入 \`pending_confirmation\`，不得直接判定稿件失败 |
| 同一字段存在多个版本且未确认最终版本 | 无法确定正确值 | \`needs_review\` |

不得根据品牌归属、历史 Campaign、互联网资料或模型常识推测当前 Campaign 的产品、SKU、规格、成分或授权 Claim。

---

## 5. 不属于 Global Rules 的内容

以下内容必须从当前已确认的 Campaign Brief 或 Campaign 配置中读取。

### 5.1 产品及 Claim

- 具体品牌、产品名和 SKU
- 具体卖点、功效及 Claim 文案
- Claim 对应的数据、脚注及限定语
- 指定成分及成分作用
- 具体适用人群及使用场景
- 产品专属禁用词

### 5.2 内容及画面

- 必提关键词、卖点和话术
- 产品露出次数、时长、顺序和位置
- 封面构图、背景、花字、字体及颜色
- 产品和 Logo 的具体展示方式
- 指定 Demo、实验、道具或代言人素材
- 图片数量、顺序及交付组件

### 5.3 发布配置

- 平台及发布账号
- 标题、Tag、话题及品牌账号
- 电商链接及跳转地址
- 发布时间及发布形式
- 评论区话术及互动要求

以上内容统一归入：

- \`Campaign Brief Hard Rules\`
- \`Creative Asset Rules\`
- \`Publishing Rules\`

不得作为跨品牌默认值写入 Global Rules。

---

## 6. 规则优先级

\`\`\`text
法律、监管要求、平台政策及公司合规政策
  >
Global Rules 与已确认 Campaign Brief Hard Rules 中更严格的要求
  >
Creative Asset Rules / Publishing Rules
  >
Campaign Guidance
\`\`\`

### 判定原则

- Campaign Rule 可以补充或强化 Global Rule。
- Campaign Rule 不得放宽真实性、商业披露、证据、信息准确、安全及隐私要求。
- Campaign Guidance 属于建议项，未明确标记为强制要求时，不得判定为 \`fail\`。
- 不同来源存在冲突时，不得由系统自行选择，必须返回 \`needs_review\`。

---

## 7. QC 输出格式

每条已执行规则必须返回：

\`\`\`json
{
  "rule_id": "GR-003",
  "status": "pass | fail | needs_review | not_applicable",
  "severity": "blocker | major | null",
  "evidence": "用于判定的稿件文字或画面证据",
  "content_locator": "稿件 block_id、图片 ID 或其他可定位信息",
  "reference": "用于比对的已确认资料及来源",
  "explanation": "中文判定理由"
}
\`\`\`

### 输出要求

- \`evidence\` 必须来自稿件，不得由模型改写后作为原始证据。
- \`reference\` 必须指向已确认资料；仅检查基础表达质量时可以为空。
- 图片类证据必须定位到具体图片。
- 同一问题同时触发多条规则时，可以分别返回，但不得重复生成相同修改建议。
- 不能可靠定位证据时，不得输出确定性 \`fail\`。

---

## 8. 最终判定策略

\`\`\`text
任意 Blocker + fail
→ blocked，不允许发布

无 Blocker fail，但存在 Major + fail
→ revision_required，退回修改

无 fail，但存在 needs_review
→ manual_review，等待人工复核

所有适用规则均为 pass，且不存在 needs_review
→ passed

规则条件未触发
→ not_applicable，不得计为 pass
\`\`\`

系统不得因以下原因直接判定失败：

- Brief 没有提供非必填字段。
- Campaign 未要求出现某项信息。
- OCR、图片或版式导致内容无法可靠识别。
- 不同资料来源尚未完成版本确认。
- 稿件未出现该规则所检查的内容。`;
const BRIEF_ITEM = { id: 'tide-cms1', name: '汰渍·洗衣原液 · CMS1 图文BRIEF', status: '审核通过',
  rules: [
    ['产品全称', '正文、标题与 TAG 统一使用「汰渍洗衣原液」，禁用「洗衣液」泛称'],
    ['核心卖点', '一瓶搞定（去渍+留香+护衣+省量）· 特殊流体高浓缩 · 温和不伤手'],
    ['香型口径', '统一「雨后山茶花」，不得与其他香型描述混用'],
    ['内容结构', '痛点场景 → 去渍实测 → 温和护衣 → 香味与省量 → 总结号召'],
    ['禁用项', '绝对化用语 · 医疗功效 · 拉踩其他品牌 · 无依据对比图'],
  ] };


export function mountReviewProduct(host) {
  const source = host.dataset.source || 'deck';
  const S = { platform: 'feishu', brand: 'tide', brief: 'global_rules',
    loaded: false, docUrl: '', uploading: false, progress: '', uploadErr: null, showConfig: false,
    blocks: [], issues: [], auditing: false, stop: false, batch: 0, batchTotal: BATCH_PLAN.length,
    selectedCategory: 'all', applyingId: null, applyResults: {}, showBlocks: false,
    hlBlock: null, hlText: null, modal: null, rulesTab: 'feishu', apiSaved: false };
  const PNAME = () => S.platform === 'tencent' ? '腾讯文档' : '飞书';

  host.innerHTML = '<div class="qcapp"><div class="qc-shell" data-layout></div></div>';
  const app = host.querySelector('.qcapp');
  const layout = app.querySelector('[data-layout]');
  const toasts = document.createElement('div'); toasts.className = 'qc-toasts'; app.appendChild(toasts);
  function toast(msg) {
    const el = document.createElement('div'); el.className = 'qc-toast'; el.setAttribute('role', 'status');
    el.innerHTML = `<b>🧪 模拟环境</b>${qesc(msg)}`;
    toasts.appendChild(el);
    setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 350); }, 2800);
  }

  /* ================================================================ 渲染 */
  function render() {
    layout.innerHTML = `<div class="qc-appinner${S.showConfig ? '' : ' qc-layout--no-config'}">` +
      topNav() + sidebar() + `<main class="qc-main-workspace${S.loaded ? ' qc-main-workspace--dual' : ''}">` +
      `<div class="qc-main-workspace-left">${workspace()}</div>${S.loaded ? previewCol() : ''}</main>` +
      (S.showConfig ? configPanel() : '') + signature() + `</div>`;
    renderModal();
  }
  function renderModal() {
    let mz = app.querySelector('[data-modalzone]');
    if (!mz) { mz = document.createElement('div'); mz.setAttribute('data-modalzone', '1'); app.appendChild(mz); }
    mz.innerHTML = S.modal ? modalHTML() : '';
  }
  const refreshAudit = () => { const z = app.querySelector('[data-auditzone]'); if (z) z.innerHTML = auditArea(); const cta = app.querySelector('[data-cta-btn]'); if (cta) { cta.textContent = S.auditing ? '审核中...' : '🚀 开始 AI 审核'; cta.disabled = S.auditing || !S.loaded; } };
  const refreshPreview = () => { const pz = app.querySelector('[data-previewzone]'); if (pz) pz.innerHTML = S.blocks.map(previewBlock).join(''); };
  const topNav = () => `<nav class="qc-top-nav">
    <div class="qc-top-nav-left"><img src="${A}/logo-dark.png" alt="Logo" class="qc-top-nav-logo">
      <h1 class="qc-top-nav-title">浅层内容QC工具<span>（图文稿件版）</span></h1>
      <span class="qc-beta-badge">Beta</span><span class="qc-mock-badge">Mock 演示数据</span></div>
    <div class="qc-top-nav-right"><button class="qc-nav-toggle-btn" data-act="toggle-config">${S.showConfig ? '收起配置' : '⚙ 展开配置'}</button><a class="qc-nav-guide-btn" href="/work/content-review/">使用指南</a></div></nav>`;
  const signature = () => `<div class="qc-signature"><span style="color:#94A3B8">Co-created by </span><a href="mailto:teddy.wu@starcomww.com">Teddy Wu</a></div>`;

  function sidebar() {
    return `<aside class="qc-brand-sidebar"><div class="qc-brand-sidebar-header"><div class="qc-brand-sidebar-title">选择品牌</div></div>
      <div class="qc-brand-list">${BRANDS.map((b) => `<button class="qc-brand-item ${S.brand === b.id ? 'qc-brand-item--active' : ''}" data-brand="${b.id}">
        <div class="qc-brand-logo-wrapper"><img src="${A}/brands/${b.logo}" alt="${qesc(b.name)}" class="qc-brand-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="qc-brand-letter" style="display:none;background:${letterColor(b.id)}">${(b.cn || b.name)[0]}</span></div>
        <div class="qc-brand-text"><span class="qc-brand-name">${qesc(b.name)}</span><span class="qc-brand-cn">${qesc(b.cn)}</span></div>
        <span class="qc-brand-delete" title="删除品牌 ${qesc(b.cn)}">✕</span></button>`).join('')}</div>
      <div class="qc-brand-sidebar-footer"><button class="qc-brand-add" data-act="add-brand"><span style="font-size:16px;line-height:1">＋</span>添加品牌</button>
        <div class="qc-brand-config-hint"><div class="qc-brand-config-hint-title">🏷️ 品牌独立配置</div>每个品牌的 BRIEF、审核规则、API Keys 等配置互不影响，独立管理。</div></div></aside>`;
  }

  function workspace() {
    const step = S.loaded ? 3 : 2;
    return `<div class="qc-card" style="padding:16px 20px">${stepIndicator(step)}</div>
      ${sourceSelector()}${docImport()}${briefSection()}${S.loaded ? docOverview() : ''}
      <div data-auditzone>${S.auditing || S.issues.length ? auditArea() : ''}</div>${bottomCTA()}`;
  }
  function stepIndicator(cur) {
    const steps = [[1, '选择内容来源'], [2, '导入文档'], [3, '开始审核']];
    return `<div class="qc-step-indicator">${steps.map(([n, label], i) => {
      const st = cur > n ? 'completed' : cur === n ? 'active' : 'inactive';
      return `<div style="display:flex;align-items:center"><div class="qc-step qc-step--${st}"><div class="qc-step-number">${st === 'completed' ? '✓' : n}</div><div class="qc-step-label">${label}</div></div>${i < 2 ? `<div class="qc-step-connector ${st === 'completed' ? 'qc-step-connector--completed' : ''}"></div>` : ''}</div>`;
    }).join('')}</div>`;
  }
  function sourceSelector() {
    return `<div><h3 style="font-size:14px;font-weight:600;color:var(--qc-text-primary);margin-bottom:4px">选择内容来源</h3>
      <p style="font-size:12px;color:var(--qc-text-muted);margin-bottom:12px">请选择稿件所在的平台</p>
      <div class="qc-source-selector">
        <div class="qc-source-card ${S.platform === 'feishu' ? 'qc-source-card--active' : ''}" data-platform="feishu"><img src="${A}/platforms/feishu.png" alt="飞书" class="qc-source-card-icon"><div class="qc-source-card-title">飞书文档</div><div class="qc-source-card-desc">从飞书云文档导入链接或文件</div></div>
        <div class="qc-source-card ${S.platform === 'tencent' ? 'qc-source-card--active' : ''}" data-platform="tencent"><img src="${A}/platforms/tencent-docs.png" alt="腾讯文档" class="qc-source-card-icon"><div class="qc-source-card-title">腾讯文档</div><div class="qc-source-card-desc">从腾讯文档导入链接或文件</div></div></div>
</div>`;
  }
  function docImport() {
    if (S.loaded) {
      return `<div class="qc-doc-import"><div class="qc-doc-import-title">导入文档</div>
        <div class="qc-doc-import-subtitle">已导入演示稿件库的预置稿件</div>
        <div class="file-import-panel"><div style="padding:14px;background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:18px">✅</span><span style="font-size:14px;font-weight:600;color:#15803D">文件导入成功</span></div>
          <div style="font-size:13px;color:#334155"><strong>${qesc(DOC_NAME)}</strong></div>
          <div style="font-size:13px;color:#334155;margin-top:6px"><strong>${PNAME()}链接：</strong><a href="${qesc(S.docUrl)}" style="color:#2563EB;text-decoration:underline;margin-left:4px;word-break:break-all">${qesc(S.docUrl)}</a><span class="qc-mock-tag-inline">mock</span></div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <span style="padding:6px 14px;background:#3B82F6;color:#FFF;border-radius:6px;font-size:13px;display:inline-flex;align-items:center;gap:4px">🔗 在${PNAME()}中打开</span>
            <button style="padding:6px 14px;background:#F1F5F9;border:1px solid #CBD5E1;border-radius:6px;font-size:13px;cursor:pointer;color:#475569" data-act="reset-doc">重新导入</button></div></div></div></div>`;
    }
    return `<div class="qc-doc-import"><div class="qc-doc-import-title">导入文档</div>
      <div class="qc-doc-import-subtitle">演示环境已预置一份真实脱敏稿件，无需手动上传或粘贴链接</div>
      <button class="qc-btn qc-btn-primary qc-quick-import" data-act="quickfile" ${S.uploading ? 'disabled' : ''}>${S.uploading ? '导入中...' : '📥 一键导入预置稿件 · 芸朵泡饭-汰渍原液（.docx）'}</button>
      ${S.progress ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#EFF6FF;border-radius:6px;margin-top:12px;font-size:13px;color:#1D4ED8"><span class="qc-spin"></span>${qesc(S.progress)}</div>` : ''}
      ${S.uploadErr ? `<div class="qc-error-alert" style="margin-top:12px"><span>⚠️</span><span>${qesc(S.uploadErr)}</span></div>` : ''}
      <p style="font-size:11.5px;color:var(--qc-text-muted);margin:10px 0 0">导入后自动转换为${PNAME()}云文档（mock）并载入右侧预览；上方平台卡片决定审核完成后写回哪个平台。</p></div>`;
  }
  function briefSection() {
    return `<div class="qc-brief-section-v2">
      <div class="qc-brief-header-v2"><div class="qc-brief-label-v2">📚 选择 BRIEF 或 使用默认审核规则</div>
        <div class="qc-brief-actions"><button class="qc-config-card-action" style="margin-top:0" data-act="manage-brief">管理 BRIEF</button>
        <button class="qc-config-card-action" style="margin-top:0" data-act="show-rules">🌐 查看具体规则</button></div></div>
      <select class="qc-select" data-brief>
        <option value="global_rules" ${S.brief === 'global_rules' ? 'selected' : ''}>默认审核规则（适用于所有品牌）</option>
        <option value="tide-cms1" ${S.brief === 'tide-cms1' ? 'selected' : ''}>${qesc(BRIEF_ITEM.name)}</option></select>
      <div class="qc-brief-hint-v2">${S.brief === 'tide-cms1' ? '当前使用品牌 BRIEF：通用规则 + 产品全称、香型口径与卖点校验（推荐）。点「查看具体规则」可核对全文。' : '可上传品牌专属 BRIEF 文件，或使用默认审核规则。点「查看具体规则」核对 GR-001 ~ GR-010。'}</div></div>`;
  }
  function docOverview() {
    return `<div class="qc-doc-overview-v2"><div style="display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:13px;color:var(--qc-text-secondary)"><span style="font-weight:600;color:var(--qc-text-primary)">文档已加载</span>&nbsp; 共 ${S.blocks.length} 个 block，其中 ${S.blocks.length - 2} 个可审核</div>
      <button class="qc-btn qc-btn-secondary" style="font-size:12px;padding:4px 10px" data-act="toggle-blocks">${S.showBlocks ? '收起 block' : '展开 block'}</button></div>
      ${S.showBlocks ? `<div style="margin-top:12px;max-height:300px;overflow-y:auto;font-size:12px">${S.blocks.map((b) => `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #F1F5F9;align-items:baseline">
        <span style="flex-shrink:0;padding:1px 6px;border-radius:3px;background:#EEF2FF;color:#4338CA;font-size:11px;font-weight:600">${TYPE_LABEL[b.type] || b.type}</span>
        <span style="color:${b.content ? '#334155' : '#94A3B8'};flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${qesc(b.content) || '(空)'}</span></div>`).join('')}</div>` : ''}</div>`;
  }
  function auditArea() {
    const approvedCount = S.issues.filter((i) => i.status === 'approved' || i.status === 'edited').length;
    const writtenCount = S.issues.filter((_, idx) => S.applyResults[idx] && S.applyResults[idx].ok).length;
    return `${S.auditing ? `<div class="qc-audit-progress-v2">正在审核第 ${S.batch}/${S.batchTotal} 批...${S.issues.length ? `&nbsp; 已发现 ${S.issues.length} 个问题` : ''}${S.stop ? '' : ` <button class="qc-stop-btn" data-act="stop">停止</button>`}</div>` : ''}
      ${S.issues.length ? `<div>
        <div class="qc-audit-results-header"><div class="qc-audit-results-title">审核结果 — 已发现 ${S.issues.length} 个问题</div>
          ${approvedCount > 0 ? `<button class="qc-audit-apply-all-btn" data-act="apply-all" ${S.applyingId === 'batch' ? 'disabled' : ''}>批量写回 (${approvedCount} 条)${writtenCount ? ` · 已写回 ${writtenCount}` : ''}</button>` : ''}</div>
        <div class="qc-category-filter">${Object.entries(CATEGORIES).map(([k, c]) => `<button class="qc-category-btn ${S.selectedCategory === k ? 'qc-category-btn--active' : ''}" data-cat="${k}">${c.label}</button>`).join('')}</div>
        <div style="display:flex;flex-direction:column;gap:12px">${S.issues.map((iss, idx) => ({ iss, idx })).filter(({ iss }) => S.selectedCategory === 'all' || iss.category === S.selectedCategory).map(({ iss, idx }) => issueCard(iss, idx)).join('')}</div></div>` : ''}
      ${!S.auditing && S.issues.length === 0 && S.batch >= S.batchTotal && S.loaded ? '<div class="qc-audit-empty-result">审核完成，未发现问题</div>' : ''}`;
  }
  function issueCard(iss, idx) {
    const sc = STATUS_COLORS[iss.status] || STATUS_COLORS.pending;
    const applied = S.applyResults[idx];
    const seq = idx + 1;
    if (iss.status === 'rejected') {
      return `<div class="qc-issue-collapsed" data-card="${idx}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid ${sc.border};background:${sc.bg};border-radius:8px;cursor:pointer;transition:all .2s;opacity:.65">
        <span style="font-size:12px;font-weight:700;color:${sc.badge};flex-shrink:0">#${seq}</span>
        <span style="flex-shrink:0;padding:2px 8px;border-radius:3px;font-size:11px;background:${sc.badge}22;color:${sc.badge};font-weight:600">${sc.label}</span>
        <span style="font-size:13px;font-weight:600;color:#64748B;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${qesc(iss.issue)}</span>
        <button style="padding:3px 10px;font-size:11px;font-weight:500;background:none;color:#64748B;border:1px solid #CBD5E1;border-radius:4px;cursor:pointer" data-fa="undo" data-i="${idx}">撤回拒绝</button></div>`;
    }
    return `<div data-card="${idx}" class="qc-issue-card" style="border:1px solid ${sc.border};background:${sc.bg};border-radius:8px;padding:14px 16px;cursor:pointer;transition:all .2s">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:12px;font-weight:700;color:${sc.badge}">#${seq}</span>
        <span class="qc-sc-badge" style="flex-shrink:0;padding:2px 8px;border-radius:3px;font-size:11px;background:${sc.badge}22;color:${sc.badge};font-weight:600">${sc.label}</span>
        <span style="flex-shrink:0;padding:1px 6px;border-radius:3px;font-size:11px;background:#EEF2FF;color:#4338CA">${TYPE_LABEL[(S.blocks.find((b) => b.id === iss.block) || {}).type] || ''}</span>
        ${iss.occ > 1 ? `<span style="flex-shrink:0;padding:1px 6px;border-radius:3px;font-size:11px;background:#FEF3C7;color:#92400E;font-weight:600">共 ${iss.occ} 处</span>` : ''}</div>
      <div style="margin-bottom:8px"><span style="font-size:11px;color:#94A3B8;font-weight:500">审核原因：</span>
        <span style="font-size:12px;color:#B45309;font-weight:600">${qesc(CATEGORY_LABELS[iss.llm_category] || iss.llm_category || iss.category)}</span></div>
      <div style="margin-bottom:10px"><div style="font-size:11px;color:#94A3B8;margin-bottom:4px;font-weight:500">AI审核反馈</div>
        <div style="font-size:12px;color:#374151;line-height:1.6;padding:8px 10px;background:rgba(0,0,0,0.02);border-radius:4px">${qesc(iss.reason)}</div></div>
      <div style="margin-bottom:10px"><div style="font-size:11px;color:#94A3B8;margin-bottom:6px;font-weight:500">修改建议</div>
        <div style="display:flex;gap:8px;align-items:flex-start">
          <div style="flex:1"><div style="font-size:11px;color:#B91C1C;margin-bottom:2px">原文</div>
            <div style="padding:6px 8px;background:#FEF2F2;border-radius:4px;font-size:12px;color:#7F1D1D;word-break:break-all;line-height:1.5">${qesc(iss.before)}</div></div>
          <div style="padding-top:18px;color:#94A3B8;font-size:14px">→</div>
          <div style="flex:1"><div style="font-size:11px;color:#15803D;margin-bottom:2px">修改</div>
            <textarea data-edit="${idx}" rows="3" style="width:100%;padding:6px 8px;background:#F0FDF4;border-radius:4px;border:1px solid #86EFAC;font-size:12px;color:#14532D;resize:vertical;box-sizing:border-box;font-family:inherit;line-height:1.5">${qesc(iss.after)}</textarea></div></div></div>
      <div data-acts="${idx}" style="display:flex;gap:8px;align-items:center">${actsHTML(iss, idx)}</div></div>`;
  }
  function actsHTML(iss, idx) {
    const applied = S.applyResults[idx];
    return `${iss.status === 'pending' ? `<button style="padding:4px 12px;font-size:12px;font-weight:600;background:#15803D;color:#fff;border:none;border-radius:4px;cursor:pointer" data-fa="approve" data-i="${idx}">批准</button>
      <button style="padding:4px 12px;font-size:12px;font-weight:600;background:none;color:#B91C1C;border:1px solid #FCA5A5;border-radius:4px;cursor:pointer" data-fa="reject" data-i="${idx}">拒绝</button>` : ''}
      ${(iss.status === 'approved' || iss.status === 'edited') && !(applied && applied.ok) ? `<button style="padding:4px 12px;font-size:12px;font-weight:600;background:#1E3A5F;color:#fff;border:none;border-radius:4px;cursor:pointer" data-fa="apply" data-i="${idx}" ${S.applyingId !== null ? 'disabled' : ''}>${S.applyingId === idx ? '写回中...' : `写回${PNAME()}`}</button>
        <button style="padding:4px 12px;font-size:12px;background:none;color:#64748B;border:1px solid #CBD5E1;border-radius:4px;cursor:pointer" data-fa="reject" data-i="${idx}">拒绝</button>` : ''}
      ${applied && applied.ok ? `<span style="font-size:12px;color:#15803D;font-weight:600">✓ 已写回${PNAME()}</span>${iss.edited ? `<button style="padding:4px 12px;font-size:12px;font-weight:600;background:#F59E0B;color:#fff;border:none;border-radius:4px;cursor:pointer" data-fa="apply" data-i="${idx}">再次写回</button>` : ''}` : ''}
      ${applied && applied.ok === false ? `<span style="font-size:12px;color:#B91C1C">写回失败：${qesc(applied.msg)}</span>` : ''}`;
  }
  function previewCol() {
    return `<div class="qc-doc-preview-column"><div class="qc-doc-preview-panel">
      <div class="qc-doc-preview-header"><span>📄 文档预览</span><span style="font-size:11px;color:var(--qc-text-muted);font-weight:400;margin-left:8px">共 ${S.blocks.length} 个 block</span></div>
      <div class="feishu-doc-preview" style="padding:32px 40px;font-size:14px;line-height:1.7;color:#1C1917;background:#fff;min-height:100%">
        <div data-previewzone>${S.blocks.map((b) => previewBlock(b)).join('')}</div></div></div>`;
  }
  function hl(text, block) {
    // 已写回的修改保持黄色高亮；hover 联动高亮问题原文
    let html = qesc(text);
    for (const f of block._hl || []) {
      const t = qesc(f); const at = html.indexOf(t);
      if (at >= 0) html = html.slice(0, at) + `<mark class="qc-hl2">${t}</mark>` + html.slice(at + t.length);
    }
    if (S.hlBlock === block.id && S.hlText) {
      const t = qesc(S.hlText); const at = html.indexOf(t);
      if (at >= 0) html = html.slice(0, at) + `<mark class="qc-hl3">${t}</mark>` + html.slice(at + t.length);
    }
    return html;
  }
  function previewBlock(b) {
    const on = S.hlBlock === b.id;
    const base = `data-pb="${b.id}" style="margin-bottom:12px;${on ? 'padding:8px 12px;background:linear-gradient(135deg,#FEF3C7 0%,#FDE68A 100%);border-left:4px solid #F59E0B;border-radius:4px;box-shadow:0 2px 8px rgba(245,158,11,.2);' : ''}cursor:pointer;transition:all .3s ease"`;
    if (b.type === 'title') return `<div ${base}><h2 style="margin:0;font-size:20px;font-weight:600;line-height:1.4;color:#1C1917">${hl(b.content, b)}</h2></div>`;
    if (b.type === 'tag') return `<div ${base}><div style="display:inline-block;padding:4px 12px;background:#EFF6FF;color:#1E40AF;border-radius:4px;font-size:13px;font-weight:500">#${hl(b.content, b)}</div></div>`;
    if (b.type === 'image') return `<div ${base}><div style="padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;text-align:center">${b.img ? `<img src="${A}/draft/${b.img}" alt="" style="max-width:100%;max-height:300px;object-fit:contain;border-radius:4px;display:block;margin:0 auto">` : '<div style="font-size:32px;margin-bottom:8px">🖼️</div>'}<div style="font-size:12px;color:#64748B;margin-top:8px;text-align:left">${hl(b.content, b)}</div></div></div>`;
    return `<div ${base}><p style="margin:0;font-size:14px;line-height:1.7;color:#1C1917;white-space:pre-wrap;word-break:break-word">${hl(b.content, b)}</p></div>`;
  }
  function bottomCTA() {
    return `<div class="qc-bottom-cta"><div class="qc-cta-text"><div class="qc-cta-title">准备就绪，开始 AI 内容审核吧！</div>
      <ul class="qc-cta-list"><li>AI 将自动检查内容结构、品牌规范、合规性等</li><li>审核完成后可支持一键回传修改或人工微调</li></ul></div>
      <button class="qc-cta-btn" data-cta-btn data-act="run" ${S.auditing || !S.loaded ? 'disabled' : ''}>${S.auditing ? '审核中...' : '🚀 开始 AI 审核'}</button></div>`;
  }
  function configPanel() {
    const card = (icon, cls, title, desc, label, act) => `<div class="qc-config-card">
      <div class="qc-config-card-header"><div class="qc-config-card-icon ${cls}">${icon}</div>
        <div class="qc-config-card-info"><div class="qc-config-card-title">${title}</div><div class="qc-config-card-desc">${desc}</div></div></div>
      <button class="qc-config-card-action" data-act="${act}">️ ${label}</button></div>`;
    return `<aside class="qc-config-panel"><div class="qc-config-panel-header">
        <div class="qc-config-panel-title">Tide 汰渍 · 品牌配置</div>
        <div class="qc-config-panel-subtitle">当前品牌的审核依据和 AI 配置</div></div>
      ${card('🌐', 'qc-config-card-icon--global', '全局审核规则', '适用于所有品牌的通用审核规则，各品牌 BRIEF 可补充专属规则', '编辑规则', 'show-rules')}
      ${card('📖', 'qc-config-card-icon--brief', '品牌 BRIEF 管理', '上传和管理该品牌的 BRIEF 资料，AI 将基于此进行内容审核', '管理 BRIEF', 'manage-brief')}
      ${card('🔑', 'qc-config-card-icon--api', 'API Keys 配置', '配置该品牌的 AI 服务密钥，用于内容分析和审核', '配置 API Keys', 'show-api')}
      ${card('🕐', 'qc-config-card-icon--history', '历史审核记录', '查看和管理过往的审核记录', '查看历史', 'show-history')}
      ${card('📥', 'qc-config-card-icon--import', '导入历史', '查看文件导入记录', '查看导入', 'show-import-history')}</aside>`;
  }

  /* ── 弹窗 ── */
  function modalHTML() {
    if (S.modal === 'rules') return `<div class="qc-modal-overlay" data-close="1"><div class="qc-modal-content" style="max-width:720px;max-height:80vh;display:flex;flex-direction:column" data-stop="1">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div>
        <h3 style="font-size:16px;font-weight:600;margin:0">🌐 全局审核规则</h3>
        <p style="font-size:12px;color:#6B7280;margin:4px 0 0">适用于所有品牌的通用审核规则，各品牌的 BRIEF 中可补充品牌专属规则</p></div>
        <button data-close="1" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9CA3AF;padding:0 4px">✕</button></div>
      <textarea readonly style="flex:1;min-height:360px;width:100%;padding:12px;font-size:13px;font-family:'SF Mono','Fira Code',monospace;line-height:1.6;border:1px solid #D1D5DB;border-radius:8px;resize:vertical;box-sizing:border-box;background:#FAFAFA">${qesc(GLOBAL_RULES_MD)}</textarea>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
        <span style="font-size:12px;color:#9CA3AF">${GLOBAL_RULES_MD.split('\n').length} 行 · ${GLOBAL_RULES_MD.length} 字符 · Demo 中为只读</span>
        <button class="qc-btn qc-btn--outline" data-close="1">关闭</button></div></div></div>`;
    if (S.modal === 'briefs') return `<div class="qc-modal-overlay" data-close="1"><div class="qc-modal-content" style="max-width:640px" data-stop="1">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="font-size:16px;font-weight:600;margin:0">📖 品牌 BRIEF 管理 · Tide 汰渍</h3>
        <button data-close="1" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9CA3AF">✕</button></div>
      <div style="border:1px solid #E5E7EB;border-radius:8px;padding:12px 14px;margin-bottom:10px;background:${S.brief === 'tide-cms1' ? '#F5F3FF' : '#fff'}">
        <div style="display:flex;align-items:center;gap:8px"><b style="font-size:14px">${qesc(BRIEF_ITEM.name)}</b><span class="qc-brief-status">✓ ${BRIEF_ITEM.status}</span></div>
        <div style="margin-top:8px;display:grid;gap:4px">${BRIEF_ITEM.rules.map(([k, v]) => `<div style="font-size:12px;color:#374151"><span style="color:#7C3AED;font-weight:600">${k}：</span>${qesc(v)}</div>`).join('')}</div>
        <div style="margin-top:10px"><button class="qc-btn qc-btn-primary" style="font-size:12px;padding:5px 12px" data-act="use-brief" ${S.brief === 'tide-cms1' ? 'disabled' : ''}>${S.brief === 'tide-cms1' ? '当前使用中' : '选用此 BRIEF'}</button></div></div>
      <button class="qc-btn qc-btn--outline" style="font-size:12px" data-act="upload-brief">⬆ 上传 BRIEF</button>
      <p style="font-size:11.5px;color:#9CA3AF;margin:10px 0 0">模拟环境：上传走「导入 → OCR → AI 结构化提取 → 审核通过」演示流程，不产生真实解析。</p></div></div>`;
    if (S.modal === 'api') return `<div class="qc-modal-overlay" data-close="1"><div class="qc-modal-content" style="max-width:480px" data-stop="1">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="font-size:16px;font-weight:600;margin:0">🔑 配置 API Keys · Tide 汰渍</h3>
        <button data-close="1" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9CA3AF">✕</button></div>
      <div class="qc-api-tabs"><button class="qc-api-tab ${S.rulesTab === 'feishu' ? 'is-on' : ''}" data-apitab="feishu">飞书</button><button class="qc-api-tab ${S.rulesTab === 'tencent' ? 'is-on' : ''}" data-apitab="tencent">腾讯文档</button></div>
      ${S.rulesTab === 'feishu' ? `<label class="qc-api-label">App ID</label><input class="qc-input" value="cli_a1b2c3d4e5f6g7h8（内置默认）" disabled>
        <label class="qc-api-label">App Secret</label><input class="qc-input" type="password" value="********" disabled>`
      : `<label class="qc-api-label">Client ID</label><input class="qc-input" value="2000XXXX（内置默认）" disabled>
        <label class="qc-api-label">Access Token</label><input class="qc-input" type="password" value="********" disabled>`}
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;align-items:center">
        ${S.apiSaved ? '<span style="font-size:12px;color:#059669;margin-right:auto">✓ 连接成功（mock）</span>' : ''}
        <button class="qc-btn qc-btn--outline" data-close="1">关闭</button>
        <button class="qc-btn qc-btn-primary" data-act="test-api">${S.apiSaved ? '已配置' : '测试连接'}</button></div></div></div>`;
    if (S.modal === 'addbrand') return `<div class="qc-modal-overlay" data-close="1"><div class="qc-modal-content" style="max-width:420px" data-stop="1">
      <h3 style="margin-bottom:16px;font-size:16px;font-weight:600">添加新品牌</h3>
      <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin:12px 0 4px">品牌 ID（英文，无空格）*</label><input class="qc-input" placeholder="例：skincare" style="width:100%;box-sizing:border-box">
      <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin:12px 0 4px">品牌英文名 *</label><input class="qc-input" placeholder="例：Skin Care" style="width:100%;box-sizing:border-box">
      <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin:12px 0 4px">品牌中文名</label><input class="qc-input" placeholder="例：护肤品牌" style="width:100%;box-sizing:border-box">
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px"><button class="qc-btn qc-btn--outline" data-close="1">取消</button><button class="qc-btn qc-btn-primary" data-act="mock-create">创建品牌</button></div></div></div>`;
    if (S.modal === 'confirm') return `<div class="qc-confirm-overlay" data-close="1"><div class="qc-confirm-dialog" data-stop="1">
      <h3>确认切换平台</h3><p>切换平台会清空当前加载的文档和审核进度，是否继续？</p>
      <div class="qc-confirm-actions"><button class="qc-confirm-cancel" data-act="confirm-no">取消</button><button class="qc-confirm-ok" data-act="confirm-yes">确认切换</button></div></div></div>`;
    return '';
  }

  /* ============================================================ 行为 */
  function loadDoc(platform, url) {
    Object.assign(S, { loaded: true, platform, docUrl: url, blocks: BLOCKS_SEED.map((b) => ({ ...b })),
      issues: [], applyResults: {}, batch: 0, auditing: false, stop: false, selectedCategory: 'all',
      progress: '', uploadErr: null });
    render();
  }
  function resetDoc() {
    Object.assign(S, { loaded: false, blocks: [], issues: [], applyResults: {}, progress: '', uploadErr: null, batch: 0, auditing: false, docUrl: '' });
    render();
  }
  async function uploadFlow() {
    if (S.uploading) return;
    S.uploading = true; S.uploadErr = null;
    S.progress = `正在上传稿件到${PNAME()}云空间并转换为云文档...`; render();
    await qsleep(900); S.progress = '上传完成！'; render();
    await qsleep(400);
    S.uploading = false;
    track('demo_start', { product: 'review', input_type: 'preset_import', platform: S.platform, source });
    loadDoc(S.platform, S.platform === 'tencent' ? 'https://docs.qq.com/doc/QcUpload2026mock' : 'https://teddywu.feishu.cn/docx/QcUpload2026mock');
  }
  function runAudit() {
    if (S.auditing || !S.loaded) return;
    S.auditing = true; S.stop = false; S.issues = []; S.applyResults = {}; S.batch = 0;
    S.blocks = BLOCKS_SEED.map((b) => ({ ...b }));
    const pool = (p) => PRESET[p.split(':')[0]][+p.split(':')[1]];
    refreshAudit(); refreshPreview();
    track('demo_start', { product: 'review', input_type: 'run', brief: S.brief, source });
    (async () => {
      for (let b = 0; b < S.batchTotal && !S.stop; b++) {
        await qsleep(620 + Math.random() * 420);
        if (S.stop) break;
        S.batch = b + 1;
        const keys = BATCH_PLAN[b].split(',');
        for (const k of keys) {
          if (k.startsWith('brief') && S.brief !== 'tide-cms1') continue;
          const src = pool(k);
          S.issues.push({ ...src, after: src.after, status: 'pending', edited: false });
        }
        refreshAudit();
      }
      S.auditing = false; refreshAudit();
      if (!S.stop) track('demo_complete', { product: 'review', result_count: S.issues.length, source });
    })();
  }
  function applyIssue(idx) {
    const iss = S.issues[idx]; if (!iss) return;
    S.applyingId = idx; render();
    setTimeout(() => {
      let n = 0;
      S.blocks.forEach((b) => {
        if (b.content.includes(iss.before)) {
          b.content = b.split ? b.content : b.content.split(iss.before).join(iss.after);
          b._hl = (b._hl || []).concat([iss.after]); n++;
        }
      });
      S.applyResults[idx] = { ok: true };
      S.applyingId = null; refreshAudit(); refreshPreview();
      track('demo_action', { product: 'review', action: 'writeback', category: iss.category });
    }, 420);
  }
  function applyAll() {
    const idxs = S.issues.map((_, i) => i).filter((i) => (S.issues[i].status === 'approved' || S.issues[i].status === 'edited') && !(S.applyResults[i] && S.applyResults[i].ok));
    if (!idxs.length) return;
    S.applyingId = 'batch'; render();
    let k = 0;
    const tick = () => {
      if (k >= idxs.length) { S.applyingId = null; refreshAudit(); refreshPreview(); toast(`已批量写回 ${idxs.length} 条到${PNAME()}云文档，修改处黄色高亮`); return; }
      const idx = idxs[k++];
      S.issues[idx].block && S.blocks.forEach((b) => {
        if (b.content.includes(S.issues[idx].before)) { b.content = b.content.split(S.issues[idx].before).join(S.issues[idx].after); b._hl = (b._hl || []).concat([S.issues[idx].after]); }
      });
      S.applyResults[idx] = { ok: true };
      refreshAudit(); refreshPreview(); setTimeout(tick, 300);
    };
    setTimeout(tick, 350);
    track('demo_action', { product: 'review', action: 'batch_writeback', count: idxs.length });
  }
  function setStatus(idx, st) {
    const iss = S.issues[idx]; if (!iss) return;
    const ta = app.querySelector(`[data-edit="${idx}"]`); if (ta) { iss.after = ta.value; }
    iss.status = st; iss.edited = st === 'edited' || iss.edited;
    track('demo_action', { product: 'review', action: st, category: iss.category });
    refreshAudit();
  }

  /* ============================================================ 事件 */
  app.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-close]') === t) { S.modal = null; renderModal(); return; }
    if (t.closest('[data-act=toggle-config]')) { S.showConfig = !S.showConfig; render(); return; }
    const act = (t.closest('[data-act]') || {}).dataset?.act;
    const brand = t.closest('.qc-brand-item');
    if (brand) { if (brand.dataset.brand !== 'tide') toast('演示稿件库当前仅含汰渍样例稿件，已保持选中 Tide'); return; }
    if (act === 'add-brand') { S.modal = 'addbrand'; renderModal(); return; }
    if (act === 'mock-create') { toast('模拟环境不支持新增品牌'); return; }
    if (act === 'show-rules') { S.modal = 'rules'; renderModal(); return; }
    if (act === 'manage-brief') { S.modal = 'briefs'; renderModal(); return; }
    if (act === 'show-api') { S.modal = 'api'; S.apiSaved = false; renderModal(); return; }
    if (act === 'test-api') { S.apiSaved = true; renderModal(); return; }
    if (act === 'use-brief') { S.brief = 'tide-cms1'; S.modal = null; render(); return; }
    if (act === 'upload-brief') { toast('模拟环境：BRIEF 解析链路未接入，已提供预置 BRIEF'); return; }
    if (act === 'show-history' || act === 'show-import-history') { toast('Demo 环境未接入历史数据'); return; }
    const apitab = t.closest('[data-apitab]'); if (apitab) { S.rulesTab = apitab.dataset.apitab; render(); return; }
    const plat = t.closest('[data-platform]');
    if (plat) { const p = plat.dataset.platform; if (p === S.platform) return;
      if (S.loaded || S.issues.length) { S.pendingPlatform = p; S.modal = 'confirm'; render(); } else { S.platform = p; render(); } return; }
    if (act === 'confirm-yes') { S.platform = S.pendingPlatform; resetDoc(); return; }
    if (act === 'confirm-no') { S.modal = null; renderModal(); return; }
    const cat = t.closest('[data-cat]'); if (cat) { S.selectedCategory = cat.dataset.cat; refreshAudit(); return; }
    if (act === 'quickfile') { uploadFlow(); return; }
    if (act === 'reset-doc') { resetDoc(); return; }
    if (act === 'toggle-blocks') { S.showBlocks = !S.showBlocks; render(); return; }
    if (act === 'run') { runAudit(); return; }
    if (act === 'stop') { S.stop = true; return; }
    if (act === 'apply-all') { applyAll(); return; }
    const fa = t.closest('[data-fa]');
    if (fa) { const i = +fa.dataset.i;
      if (fa.dataset.fa === 'approve') setStatus(i, 'approved');
      if (fa.dataset.fa === 'reject') setStatus(i, 'rejected');
      if (fa.dataset.fa === 'undo') setStatus(i, 'pending');
      if (fa.dataset.fa === 'apply') applyIssue(i);
      return; }
    const pb = t.closest('[data-pb]');
    if (pb) { S.hlBlock = pb.dataset.pb; refreshPreview(); return; }
    const card = t.closest('[data-card]');
    if (card && !t.closest('textarea') && !t.closest('button')) {
      const iss = S.issues[+card.dataset.card]; if (iss) { S.hlBlock = iss.block; S.hlText = iss.before; refreshPreview();
        const el = app.querySelector(`[data-pb="${iss.block}"]`); el && el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
  });
  app.addEventListener('change', (e) => {
    const b = e.target.closest('[data-brief]'); if (b) { S.brief = b.value; render(); return; }

  });
  app.addEventListener('input', (e) => {
    const ta = e.target.closest('[data-edit]'); if (!ta) return;
    const iss = S.issues[+ta.dataset.edit]; if (!iss) return;
    iss.after = ta.value;
    if (iss.status === 'pending' || iss.status === 'approved') { iss.status = 'edited'; iss.edited = true; }
    if (S.applyResults[+ta.dataset.edit]) { S.applyResults[+ta.dataset.edit] = { ok: false, msg: '内容已再次编辑，请重新写回' }; }
    const card = ta.closest('[data-card]');
    if (card) {
      const acts = card.querySelector('[data-acts]'); if (acts) acts.innerHTML = actsHTML(iss, +ta.dataset.edit);
      const badge = card.querySelector('.qc-sc-badge');
      if (badge) { const sc = STATUS_COLORS[iss.status]; badge.textContent = sc.label; badge.style.background = sc.badge + '22'; badge.style.color = sc.badge; }
      card.style.borderColor = STATUS_COLORS[iss.status].border; card.style.background = STATUS_COLORS[iss.status].bg;
    }
  });

  app.addEventListener('mouseover', (e) => {
    const card = e.target.closest('[data-card]');
    if (card && !card._bound) { card._bound = 1;
      card.addEventListener('mouseleave', () => { if (S.hlBlock) { S.hlBlock = null; S.hlText = null; refreshPreview(); } }, { once: true }); }
    if (card) { const iss = S.issues[+card.dataset.card];
      if (iss && S.hlBlock !== iss.block) { S.hlBlock = iss.block; S.hlText = iss.before; refreshPreview();
        const pb = app.querySelector(`[data-pb="${iss.block}"]`); pb && pb.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
  });
  render();
}
