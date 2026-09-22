# Teddy Wu — AI Product Portfolio

四场景横向作品台。静态 HTML + CSS + vanilla ES modules，无框架、无打包器、无 npm 依赖。

**但有一个构建步骤。** 仓库根目录的 `*.html` 是**授权源文件**，里面的数字还是 `@@fact.key@@`
占位符，直接打开只会看到裸 token。真正可部署的是 `dist/`。

```bash
python3 tools/build.py          # sources + facts.json -> dist/
python3 tools/bundle.py         # dist/ -> dist/teddy-wu.html (单文件，可双击打开)
python3 tools/build.py --check  # 不变量闸门
python3 tools/serve.py 4174     # 先构建，再以关闭缓存的方式服务 dist/
```

<http://localhost:4174/> 是站点，<http://localhost:4174/teddy-wu.html> 是单文件版。
服务根目录刻意设在 `dist/`：仓库根目录的 HTML 是授权源，数字还没展开。

## 部署

两条路都是「推上去就行」，构建产物不需要手工搬运。

### GitHub Pages（当前在用）

`src` 是授权分支，`main` 是 Pages 服务的内容——**`main` 是生成物，不要手改**。
推 `src` 触发 `.github/workflows/deploy.yml`：跑 `--check` 闸门 → 构建 → 把 `dist/` 推到 `main`。

```bash
git push origin src
```

### Cloudflare Pages

Connect to Git 之后只需要三个值，其余保持默认：

| 项 | 值 |
|---|---|
| Framework preset | `None` |
| Build command | `python3 tools/build.py && python3 tools/bundle.py` |
| Build output directory | `dist` |

Cloudflare Pages 会注入 `CF_PAGES_URL`，`build.py` 自动把 `canonical`、`og:url`、
`sitemap.xml` 指向它，不需要改任何源码。要绑自定义域名，在 Pages 里加域名即可，同样零改动。

### 域名是怎么定的

`build.py` 的 `detect_site_url()` 按这个顺序解析，第一个命中即生效：

1. `SITE_URL` 环境变量（显式覆盖，本地想模拟线上时用它）
2. `CF_PAGES_URL` / `PAGES_URL`（托管平台自己报的规范地址）
3. `GITHUB_REPOSITORY`（user/org 仓走根域，project 仓走子路径）
4. `https://teddywu-0506.github.io`

源码里统一写 `https://teddywu.site` 作为品牌规范地址，构建期重写。所以**换域名不用改文件**，
改的是这一处解析。

## 内容在哪里

| 什么 | 在哪 |
|---|---|
| 每个数字及其口径 | `assets/data/facts.json` |
| 文案、版式、结构 | 仓库根目录的授权 `*.html`（数字写成 `@@fact.key@@`） |
| demo 的规则库与脱敏达人索引 | `assets/data/rules.json`、`creators.json` |
| 审核 demo 的样例稿件 | `assets/data/demo-samples.json` |
| 字体 | `assets/fonts/`，用 `python3 tools/fonts.py` 重新拉取 |

改一个数字：改 `facts.json`，然后 `python3 tools/build.py && python3 tools/bundle.py`。
`dist/` 永远不要手改——`build.py` 会先清空它再重建。

## 加一个页面

放进 `work/<slug>/index.html` 或 `demo/<slug>/index.html` 就行。**不用改 `build.py`**：
页面是 `discover_pages()` 走目录发现的，写死清单的话，加一页忘了登记，这一页就会静默地
不参与构建、不参与 token 渲染、不参与泄漏检测——等于不存在。

新页面记得带上 `<head>` 里那套 meta（照 `demo/match/index.html` 抄最快），以及
`/assets/css/site.css` 之外的六个 `<link>` 保持原样，构建会把它们合并成一个。

## 加一个 demo

1. 引擎放 `assets/js/engine-<name>.js`，导出一个 `async run<Name>(brief, data, onStep)`，
   返回 `{results, poolSize, latencyMs, engine}` 这个形状。
2. 数据放 `assets/data/<name>.json`，`build.py` 会整目录拷进 `dist/`。
3. 在 `assets/js/demo-runtime.js` 的 `mountDemo` 里加一个 `product` 分支，
   宿主写 `<div class="panel panel--live" data-demo="<name>" data-source="deck" data-case-url="…">`。
4. 单文件离线包要能跑，就把新数据文件名加进 `bundle.py` 的 `DATA`。

demo 必须是本地确定性计算，不调模型、不发请求、访客粘贴的内容不出页面。这是这个站的可信度
来源，不是风格偏好。

## `--check` 在守什么

任何一条不满足，构建失败：

- 授权 HTML **和 `assets/js/*.js`** 里不得出现 fact 的裸值——数字只有 `facts.json` 一个主人
- `@@token@@` 必须有定义；定义了却没被渲染出来的 fact 也算问题
- dist 里每个根绝对 `href`/`src`/`fetch()`/`url()` 必须能在 dist 里解析到
- 六个样式表 `<link>` 必须真的合并成了 `site.css`
- `og:image` / `og:url` 出厂时必须是绝对且引号完整的
- `index.size` 必须等于 `creators.json` 的行数
- `assets/` 下不得有两个文件字节完全相同
- 单个产物文件不得超过 1.5 MB
- `tools/` 下不得有遮蔽标准库的模块名
- 同一段文案不得同时存在于数据文件和授权页面里
- `.panel--preview` 必须包在 `.app` 里，`<div>` 必须配平

本地另有一条需要字体库才能查的：`python3 tools/fonts.py --verify` 会读每个 woff2 的
`OS/2.usWeightClass`，确认它和文件名声明的字重一致。

## 结构

- `/` 场景台 — 身份 / 作品 / 轨迹 / 联系
- `/work/content-review/` `/work/creator-match/` 完整项目档案
- `/profile/` 完整履历（含可下载的简历 PDF）
- `/demo/review/` `/demo/match/` 独立 demo 深链

原始（未脱敏）达人数据在 web 根目录之外的 `../_private/`，不在仓库里。
