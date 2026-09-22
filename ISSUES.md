# Teddy Wu Personal WebSite — 问题清单与修正方案

> Version 1.0 · 2026-09-22 · 基线 commit `9ff5974`
> 本文档记录**审计发现**与**修正方案**，是 `PLAN.md` 的执行附属文档。
> `PLAN.md` 仍是产品与设计的 Source of Truth；本文只回答"现在坏在哪、怎么修、修完怎么验"。
> 每条修正完成后在状态列打勾并记 commit。

## 审计方法

本地 `tools/build.py` + `tools/serve.py`，用 Playwright（Chromium 151）跑四种场景：桌面 1440×900、移动 390×844、`javaScriptEnabled:false`、以及拦截 `demo-samples.json` 使其永久挂起。另对线上 `teddywu-0506.github.io` 逐路径 curl，对 woff2 做 md5 与 OS/2 表检查，对 token 表做 WCAG 对比度计算。

**已经是对的**：CLS = 0（桌面与移动）；无 JS 报错；无横向溢出；HTML 引用的静态资源除一处外全部存在；`build.py --check` 通过；CI `build and publish` 与 Pages 部署链路正常；主要文字对比度 5.1–16:1，token 表里的实测注释可信。

---

## P0 · 功能真的坏了

### I-01 简历 PDF 从未进入 dist，线上 404

| | |
|---|---|
| 现象 | `/profile/` 的「下载简历 PDF」按钮 404。线上实测 `curl -o /dev/null -w "%{http_code}" https://teddywu-0506.github.io/assets/Teddy-Wu-Resume.pdf` → `404` |
| 根因 | `tools/build.py:22` `ASSET_DIRS = ['assets/js','assets/data','assets/fonts','assets/img']` 只覆盖子目录；`assets/` 根目录只有 `favicon.svg` 在 `PASS_THROUGH` 白名单里 |
| 方案 | 新增 `ROOT_ASSETS = ['Teddy-Wu-Resume.pdf']` 白名单并在 `build()` 里拷贝。**同时给 `check()` 补一条不变量**：扫描全部 authored HTML 的 `href`/`src` 根绝对路径，任何在 dist 中不存在的目标即 fail。这条漏检才是根问题——PDF 只是第一个受害者 |
| 验证 | `build.py --check` 通过；`dist/assets/Teddy-Wu-Resume.pdf` 存在；删掉该文件后 `--check` 必须 fail（证明不变量真的在守） |
| 依赖 | **需确认 D-2**：PDF 首页含手机号 `13680369508`，且体积 4.2 MB |
| 状态 | ◐ 机制已完成（批次 B），是否上线待 D-2 |

### I-02 独立 demo 页没有样例 chip，分享出去的深链是残缺的

| | |
|---|---|
| 现象 | `/demo/review/` 空状态写着「粘贴一段稿件，或选一个样例 ↓」，但下方一个样例都没有；`使用缓存样例` 兜底按钮永远不出现。Playwright 实测 `document.querySelectorAll('.chip[data-sample]').length === 0` |
| 根因 | `window.__SAMPLES__` 只在 `assets/js/main.js:11` 的 `boot()` 里赋值，而 `demo/review/index.html:42` 与 `demo/match/index.html:42` 用的是自己的内联 module，只调 `bindCta() + mountDemo()`。`assets/js/demo-runtime.js:74` 读到 `undefined`，`|| []` 静默降级 |
| 方案 | 把样例加载移进 `demo-runtime.js`：模块内维护一个 `let samplesPromise`，`mountDemo` 的 review 分支 `await` 它再渲染 chip 行；渲染前 chip 行显示骨架占位，避免布局跳动。`main.js` 删掉 `__SAMPLES__` 全局，deck 与独立页走同一条路径。README 承诺的"可分享深链"才算成立 |
| 验证 | `/demo/review/` 上 chip 数 = 3；`?case=tide-detergent&run=1` 深链在独立页仍能自动填充并运行；断网时 chip 行显示诚实的空状态而不是假装成功 |
| 状态 | ☑ 批次 A |

### I-03 移动端屏序指示器永远停在「01 / 04 · IDENTITY」

| | |
|---|---|
| 现象 | 390×844 下滚到 work / trajectory / contact，底部唯一可见的进度文字始终是 `01 / 04 · IDENTITY` |
| 根因 | `index.html:281` 的 `<summary>` 文本是写死的。`assets/js/deck.js:54-55` 的 `paintDeck()` 只更新 `.rail-index .cur` 和 `.rail-name`，而 `deck.css:111` 在 `max-width:768px` 把 `.rail-index,.rail-segs,.rail-name` 全部 `display:none`。实测 `segCurrent` 正确跟随（说明 `paintDeck` 确实跑了），只有 summary 不动 |
| 方案 | `paintDeck()` 里一并更新 summary：`sumEl.querySelector('.cur').textContent` + 末尾 label 节点。label 用 `<span class="sum-label">` 包起来，避免用 `textContent` 整体覆写把 `.cur` 子节点打碎（同 I-16 的教训） |
| 验证 | Playwright 依次滚到 4 个场景，断言 summary 文本等于 `01..04 / 04 · <LABEL>` 且 `.cur` 仍是可样式化的 span |
| 状态 | ☑ 批次 A |

### I-04 `[hidden]{display:none!important}` 把自己的 no-js 兜底打死了

| | |
|---|---|
| 现象 | 关闭 JS 后，Creator Match 六格、Agent Loop 六格、工作方法 tab 三块内容不可达。实测 `#p-cm`、`#p-al`、`tp-m` 计算样式 `display:none` |
| 根因 | `assets/css/base.css:13` 的 `!important` 优先级高于 `assets/css/components.css:329` `html.no-js .work-panel[hidden]{display:grid}` 和 `:333` `html.no-js [role="tabpanel"][hidden]{display:block}`。作者规则本来就胜过 UA 的 `[hidden]`，这个 `!important` 是多余的自我封锁 |
| 方案 | 去掉 `!important`。同时给 `check()` 补一条 no-js 可达性不变量的思路：`html.no-js` 前缀规则不得被任何 `!important` 规则压制（用选择器特异性 + `!important` 做一次静态比对）。若嫌重，退一步：至少在 `--check` 里断言这两条 no-js 规则存在且不含 `!important` |
| 验证 | `javaScriptEnabled:false` 下 `#p-cm`、`#p-al`、`tp-m` 计算 `display !== 'none'`；同时确认 JS 正常时 tab 切换仍只有一格可见（没把 hidden 语义弄坏） |
| 状态 | ☑ 批次 A |

### I-05 一个 JSON 请求挂起 = 整站卡在第一屏，比完全没 JS 还糟

| | |
|---|---|
| 现象 | 把 `/assets/data/demo-samples.json` 永久挂起后：只有 `identity` 场景可见，点导航只改 hash 不换屏，用户被困死在首屏。而完全关闭 JS 时兜底正常（4 个场景全部可见） |
| 根因 | `assets/js/main.js:10-13` 的 `boot()` 把 `createDeck`、`wireTabs`、provenance、clipboard 的**全部**初始化 `await` 在这次 fetch 之后。head 里的内联脚本已经把 `documentElement.className` 设成 `js`，no-js 兜底同时失效——部分失败比彻底失败更糟 |
| 方案 | fetch 不 `await`，只存 promise；由 I-02 改造后的 `demo-runtime.js` 在真正需要样例时 `await`。deck 与 tabs 的初始化提到 fetch 之前，同步执行。这样网络好坏都不影响页面可用性 |
| 验证 | 重跑挂起用例：4 个场景可切换、tab 可切换、provenance 可展开；只有 demo 的 chip 行显示"样例加载失败"并给出重试 |
| 依赖 | 与 I-02 同一批改动，必须一起做 |
| 状态 | ☑ 批次 A |

### I-06 离线单文件的所有内链指向不存在的域名

| | |
|---|---|
| 现象 | `dist/teddy-wu.html`（README 承诺"双击可打开、可拷到任何地方"）里每个链接都是 `https://teddywu.site/#work` 这种死链。实测 `teddywu.site` DNS 不存在（NXDOMAIN）。线上独立页页脚 `TEDDYWU.SITE →` 同源 |
| 根因 | `tools/bundle.py:21` `SITE = 'https://teddywu.site'` 硬编码，没接 `build.py:29` 已有的 `SITE_URL` 环境变量。两个文件各持一份域名真相 |
| 方案 | `bundle.py` 改为从同一个地方读 `SITE_URL`（默认值与 `build.py` 一致），并把默认值指向**当前真实可解析**的 `https://teddywu-0506.github.io`。`build.py` 里 `BRAND_URL → SITE_URL` 的重写机制保留，源码继续写品牌域名，构建期决定实际域名 |
| 验证 | `bundle.py` 输出的 `teddy-wu.html` 里 grep 不到未解析域名；`curl -I` 其内链目标返回 200 |
| 依赖 | **需确认 D-1**：`teddywu.site` 是准备启用的自定义域名，还是废弃占位 |
| 状态 | ☐ |

---

## P1 · 分享与检索

### I-07 `og:image` / `og:url` 是相对路径，社交卡片抓不到图

- **现象**：微信、Twitter/X、LinkedIn、Slack 的抓取器基本都要求绝对 URL。全站 `og:image` 为 `/assets/img/og-home.png`；`og:url` 在子页为相对（`/profile/`、`/demo/review/`、`/404`）。首页 `og:url` 因 `BRAND_URL` 重写侥幸是绝对的，子页不是。
- **方案**：`build.py` 增加一步——以 `SITE_URL` 为 base，把 `og:image`、`og:url`、`twitter:image` 的相对值统一补成绝对；`twitter:domain` 一并校正。这样源码保持相对写法（换域名零成本），产物是绝对的。
- **验证**：`dist/**/*.html` 里 `og:image` 与 `og:url` 全部以 `SITE_URL` 开头；`--check` 加一条断言防止回退。
- **状态**：☐

### I-08 两张专用 OG 图做好了但零引用

- **现象**：`assets/img/og-review.png`、`og-match.png`（均 1200×630，与声明一致）无任何文件引用，所有子页共用 `og-home.png`。
- **方案**：按 `PLAN.md §22.2` 落实——`/work/content-review/` 与 `/demo/review/` 用 `og-review.png`，`/work/creator-match/` 与 `/demo/match/` 用 `og-match.png`，其余用 `og-home.png`。
- **验证**：三张图各至少被两个页面引用；`--check` 断言 `assets/img/` 下无零引用图片。
- **状态**：☐

### I-09 `sitemap.xml` lastmod 全部停在 2026-09-20

- **方案**：`build.py` 用 git 生成 lastmod——对每个 `PAGES` 取 `git log -1 --format=%cd --date=short -- <path>`，构建期写进 sitemap。CI 里 `actions/checkout` 有完整历史，可行；若浅克隆导致失败则回退到工作流日期。
- **验证**：改动某页后重建，该条 lastmod 前进，其余不变。
- **状态**：☐

### I-10 `site.webmanifest` 声明 `standalone` 却没有 `icons`

- **方案**：从 `assets/favicon.svg` 导出 192/512 PNG 图标补进 manifest，并在 HTML 补 `apple-touch-icon`。图标文件归入 `ASSET_DIRS` 覆盖范围（`assets/icons/`）。
- **验证**：Chrome DevTools 的 manifest 面板无 error；Lighthouse PWA 图标项通过。
- **状态**：☐

---

## P2 · 字体资产是坏的

### I-11 两个"字重"是同一个文件，且真实字重是 ExtraBold

**证据**（md5 + OS/2 表）：

| 文件 | md5 关系 | 内部真实 `usWeightClass` |
|---|---|---|
| `BricolageGrotesque-normal-500.woff2` | **与 -700 完全相同** | **800 ExtraBold**（表名 "Bricolage Grotesque 96pt ExtraBold"） |
| `BricolageGrotesque-normal-700.woff2` | 同上 | 800 |
| `InterTight-normal-400.woff2` | **与 -600 完全相同** | 400 Regular |
| `InterTight-normal-600.woff2` | 同上 | 400 |
| `JetBrainsMono-normal-400.woff2` | 唯一 | 400，但 CSS 多处要 500 |
| `Newsreader-italic-400.woff2` | — | 全站从未加载 |

**后果**：不存在真实字重梯度，看到的"粗体"是浏览器伪造描边。实测同字号下 Inter Tight 400 与 600 渲染宽度 347.7 vs 364.0——差的是合成加粗，不是字重。`.sw-name` 要 600 实际得到 ExtraBold；`.btn`、`.stat`、`.verdict b`、`.res-row b`、`.crow-score` 要 mono 500 得到伪粗，等宽字伪粗尤其糊。另外约 86 KB 是重复字节，24 KB 是死字体。

**方案（二选一，见 D-3）**

- **A（推荐）** 重新导出正确字重：Bricolage Grotesque 500 + 700、Inter Tight 400 + 600、JetBrains Mono 400 + 500，沿用现有拉丁子集与 `unicode-range`，文件名与 `fonts.css` 结构不动。删除 Newsreader 或按 `PLAN.md §24.2` 给 `.pf-quote` 真正用上。
- **B** 反向收敛：CSS 只用现有真实字重（Bricolage 一档 ExtraBold、Inter Tight 一档 Regular、Mono 一档 Regular），靠字号/字距/颜色建立层级，`@font-face` 各族只声明一次。零下载风险，但会牺牲 `§24.2` 想要的 display 两档对比。

**验证**：重建后逐族 `md5` 互不相同；`document.fonts` 里每个声明的 face 都能被实际用到；Playwright 断言 `.btn` 与 `.name` 的渲染宽度差来自真实字重（对比 `font-synthesis-weight: none` 前后）。

**状态**：☐

### I-12 重复与零引用图片

- `assets/wechat-qr.jpg` 与 `assets/img/wechat-qr.jpg` **md5 相同**（各 133 KB），且两者零引用——联系区只复制微信号 `TeddyGorrr`，二维码从未露出。`PLAN.md:1143` 写的正是「微信用 `wechat_copy` 代理」，所以二维码是计划外遗留。
- `assets/avatar.jpg`、`assets/img/portrait.jpg`（76 KB）零引用。
- **方案**：删 `assets/` 根下的重复 QR；`portrait.jpg` / `avatar.jpg` 移入 `archive/`。QR 是否要在联系区露出见 **D-4**。
- **验证**：`--check` 新增"零引用图片即 fail"，与 I-08 共用同一条不变量。
- **状态**：☐

---

## P3 · 一致性与仓库卫生

### I-13 `85%` 硬编码在 JS 里，绕开了 fact 单一来源

- **现象**：`assets/js/demo-runtime.js:264` 写死「候选池匹配率 85%」，而 `facts.json` 已有 `match.pool`，`work/creator-match/index.html:53` 用 `@@match.pool@@` 渲染。`build.py --check` 只扫 HTML，不扫 JS——这正是 `PLAN.md:872`「五处数字必须一致」的漏洞。
- **方案**：`build.py` 对 `ASSET_DIRS` 里的 `assets/js/*.js` 同样做 token 替换（JS 里写 `'@@match.pool@@'`），并把 leak 检测的文件集合扩到 `assets/js/*.js`。
- **验证**：改 `facts.json` 的 `match.pool` 后重建，demo 输出同步变化；在 JS 里手写 `85%` 会让 `--check` fail。
- **状态**：☑ 批次 B

### I-14 `reveal.js` 整份是死代码

- **现象**：全站没有任何 `.reveal` 元素（HTML/JS 均无），`components.css:304-312` 的 6 条规则永不命中。`revealScene()` 里 `if (n++ < 6) el.classList.add('is-in'); else el.classList.add('is-in');` 两个分支完全一样；`seen` WeakSet 在 `initReveal` 里从不写入。
- **方案**：删除 `assets/js/reveal.js`、`bundle.py` JS 列表里的 `reveal.js`、`components.css` 的 `.reveal*` 规则、`deck.js` 的三处 `revealScene` 调用与 `main.js` 的 `initReveal`。场景动效已由 `deck.css` 的 `resolve` 系列承担，不需要第二套。
- **验证**：重建后 `bundle.py` 的 `node --check` 通过；CLS 仍为 0。
- **状态**：☑ 批次 B

### I-15 `track()` 只入队，无人消费

- **现象**：`assets/js/analytics.js:2` 把事件 push 进 `window.__ev`，`window.plausible` 从未加载（全站无该 script 标签）。结果既没有埋点，数组又随会话无限增长。`PLAN.md §23.1` 是明确要接 Plausible 的，所以这是"Phase 未做"而非"设计错误"。
- **方案**：给队列加上限（如 200 条环形）与 `pagehide` 冲刷钩子；Plausible script 标签留到域名定了再接（见 **D-5**）。页脚「No cookies. No tracking of what you paste.」的表述保持真实——当前确实什么都没上传。
- **验证**：长会话压测下 `window.__ev.length` 有界。
- **状态**：☐

### I-16 复制微信号会吃掉箭头的样式

- **现象**：`assets/js/main.js` 的 clipboard 分支用 `b.textContent` 存/取，回填后 `<span class="ar">↗</span>` 变成裸文本 `↗`，箭头字体与位移全丢。实测 before `"微信 <span class=\"ar\">↗</span>"` → after `"微信 ↗"`。
- **方案**：改用 `innerHTML` 快照（内容是 authored 常量，无注入面），或更干净：只切换一个 `.is-copied` class，文案与图标交给 CSS `::after`。
- **验证**：复制后等 2 s，断言 `innerHTML` 与初始一致。
- **状态**：☑ 批次 A

### I-17 `analyse()` 在一次运行里被完整跑 6 遍

- **现象**：`assets/js/engine-review.js:93` 在 5 次进度循环内每次都调用，`:99` 再调一次。纯浪费 CPU，且 `latencyMs` 里混进了重复计算。
- **方案**：循环外算一次，循环只推进视觉状态。
- **验证**：`demo_complete` 的 `ms` 下降；输出 findings 与 `revised` 逐字节不变（回归对比）。
- **状态**：☑ 批次 A

### I-18 预览面板写「召回 40」，实际候选池 19

- **现象**：`index.html:174` 与 `:179` 写 `多支路召回 40` / `40→8`，而 demo 实测 `poolSize 19 → retrieved 19 → top 8`。`engine-match.js` 的 `retrieved: Math.min(pool.length, 40)` 在 20 条索引上永远取不到 40。
- **方案**：预览面板改为与 demo 同源的真实数字（`@@index.size@@` 已渲染 20，补一个 `recall → rank` 的诚实表述），`retrieved` 的 40 上限常量删掉——它是从线上系统抄来的，本地索引撑不起来。这条与 `PLAN.md` 的诚实性原则（R12）直接相关：面试官真去点 demo，看到的必须是同一个数。
- **验证**：预览面板数字与 demo log 一致。
- **状态**：☑ 批次 B

### I-19 README 与实际相反

- **现象**：`README.md:3` 写「静态 HTML + CSS + vanilla ES modules，**无构建步骤**」，紧接着第 5 行就要求 `python3 tools/build.py`；内容表里还列着已在 HEAD `9ff5974` 删掉的 `assets/data/content.json`。
- **方案**：删掉"无构建步骤"，第一句就讲清"源码 + facts.json → dist"；内容表改指 `demo-samples.json` / `rules.json` / `creators.json`。
- **状态**：☐

### I-20 `.gitignore` 与实际跟踪状态矛盾，生成物被提交

- **现象**：`tools/tokenize.py` 与 `tools/_tokens.json` 写在 `.gitignore` 里但**已被 git 跟踪**，忽略规则形同虚设。`templates_out.json` 是 `extract.py` 的一次性产物，被跟踪且零引用。
- **方案**：`git rm --cached templates_out.json` 并加入忽略；`tokenize.py` / `_tokens.json` 是 `facts_rules.py` 的配套工具链，从 `.gitignore` 里摘掉声明（保留跟踪）；`extract.py` 若是一次性迁移脚本，移入 `archive/`。
- **验证**：`git status --ignored` 与 `git ls-files` 不再互相打脸。
- **状态**：☐

### I-21 9px 等宽小字成片

- **现象**：`components.css` 有 8 处 `font-size:9px`（`.sev`、`.finding-why`、`.crow-main span`、`.crow-facts span`、`.cc-tags span`、`.app-metrics span`、`.sw-state`、`.cell-label`），且 `.finding-why` 是承载"依据"正文语义的角色。`--micro` 本身是 10px。
- **方案**：统一提到 `--micro`（10px），`.finding-why` 提到 `--caption`（12px）。深色面板上的小字对比度已够（`#9A9C93` on ink ≈ 5.7:1），问题只在字号。
- **验证**：移动 390px 下重截 demo 结果图，逐格确认可读且不破版。
- **状态**：☐

### I-23 `build.py` 从不清理 dist，删掉的源文件会永远留在产物里

- **现象**：`build()` 用 `shutil.copytree(..., dirs_exist_ok=True)`，只增不删。删掉 `assets/js/reveal.js` 之后 `dist/assets/js/reveal.js` 依然存在并被本地 dev server 服务。
- **根因**：没有"产物树等于源树"的承诺。CI 侧靠 `rsync -a --delete` 兜住了，所以线上没坏，但本地 dist 会无限累积陈旧文件，任何基于 dist 的判断都不可信。
- **方案（已做）**：`build()` 开头 `clean(outdir)`。dist 是生成物，README 已明令不得手改。
- **验证**：重建后 `dist/assets/js/` 只剩 6 个文件；Playwright 断言 `/assets/js/reveal.js` 返回 404。
- **状态**：☑ 批次 B

### I-22 零散项（续）

- `index.html:33` JSON-LD 的 `email` 与 `:250` `mailto:?subject=From%20teddywu.site` 归入 D-1 一起处理。
- `robots.txt` `Disallow: /api/` 指向不存在的路径（Phase 2 预留，保留但在注释里说明）。
- `profile/index.html:26` 的 `<h1>TEDDY<br>WU</h1>` 读屏为 "TEDDYWU"，`index.html` 同。给两个 span 之间加空格或用 `aria-label`。
- `deck.js` 同时监听 `pagehide` 与 `beforeunload` 上报离场事件，语义重复且 `beforeunload` 在移动端基本不触发；只留 `pagehide`。
- `build.py` 的 `CSS_LINK_RE` 依赖六条 `<link>` 的精确字面量，任何属性顺序变化会静默不合并。加一条断言：合并后 `dist` 中不得残留 `assets/css/(fonts|tokens|base|deck|components|pages).css`。

---

## 待确认决策

| # | 决策 | 影响条目 | 我准备的默认做法 |
|---|---|---|---|
| **D-1** | `teddywu.site` 是准备启用的自定义域名，还是废弃占位？ | I-06、I-07、I-09、I-22 | 源码继续写品牌域名，构建期由 `SITE_URL` 统一决定；默认值指向当前可解析的 `teddywu-0506.github.io` |
| **D-2** | 简历 PDF 是否公开？首页含手机号 `13680369508`，且体积 4.2 MB | I-01 | 先补打包白名单与不变量（机制），**是否让 PDF 真的上线等你点头**；同时建议压到 <500 KB |
| **D-3** | 字体走 A（重新导出正确字重）还是 B（收敛到现有真实字重）？ | I-11 | 倾向 A，需要联网取字体文件；A 失败则退 B |
| **D-4** | 微信二维码要不要在联系区露出？资产已存在但 `PLAN.md:1143` 写的是复制微信号 | I-12 | 按 PLAN 保持复制，把重复 QR 清掉；你要露出我再加 |
| **D-5** | Plausible 现在接还是等域名定了再接？ | I-15 | 先修队列无界问题，script 标签等 D-1 落地后再接 |

---

## 执行记录

- **批次 A（完成）** I-04 → I-03 → I-02 + I-05 → I-16 → I-17。回归 22/22 通过（no-js 四格可达、JS 开启时 hidden 语义未坏、移动端 summary 跟随场景、独立 demo 页 chip=3 且 `?case=&run=1` 深链可自动运行、`demo-samples.json` 永久挂起时 deck 仍可用并给出诚实错误、复制后箭头样式保留、`analyse()` 单次通过且 findings 不变）。
- 执行中新增一项计划外修正：`loadSamples()` 加 8s 超时。永久挂起的请求会永远停在「样例加载中」，比失败更糟，所以给它一个兜底。

## 执行记录

- **批次 A（完成）** I-04 → I-03 → I-02 + I-05 → I-16 → I-17。回归 22/22。commit `c29ae49`。
  计划外新增一项：`loadSamples()` 加 8s 超时。永久挂起的请求会永远停在「样例加载中」，比失败更糟。
- **批次 B（完成）** I-13 → I-01 机制 → I-18 → I-14 → I-23 → I-22 的 CSS 合并断言。回归 32/32。
  两条新不变量都做了**反向验证**，证明它们真的会拦而不是永远通过：把 `assets/Teddy-Wu-Resume.pdf`
  从源树移走，`--check` 报 `BROKEN REF in dist: profile/index.html -> /assets/Teddy-Wu-Resume.pdf`
  并 exit 1；把 `85%` 硬编码回引擎，`--check` 报 `LEAK assets/js/demo-runtime.js raw values for:
  ['match.pool']` 并 exit 1。恢复后重新通过。
  `bundle.py` 现在从 `dist/assets/js/` 取已渲染 token 的 JS，并 `from build import SITE_URL`，
  域名与 fact 各自只剩一个主人。

## 修正批次

按依赖排序，每批独立可验，做完一批跑一次 `build.py --check` + Playwright 回归。

1. **批次 A · 可用性（无需任何决策）** — I-04 → I-03 → I-02 + I-05（同一文件，一起做）→ I-16 → I-17
2. **批次 B · 单一来源与不变量（无需决策）** — I-13 → I-01 的机制部分 → I-18 → I-14 → I-22 的 `CSS_LINK_RE` 断言
3. **批次 C · 分享与检索（需 D-1）** — I-07 → I-08 → I-09 → I-10 → I-06 → I-22 的 mailto/JSON-LD
4. **批次 D · 资产（需 D-2 / D-3 / D-4）** — I-11 → I-12
5. **批次 E · 文档与卫生（需 D-5）** — I-19 → I-20 → I-15 → I-21

批次 A、B 不依赖任何回答，先做。
