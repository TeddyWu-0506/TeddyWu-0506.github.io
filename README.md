# Teddy Wu — AI Product Portfolio

四场景横向作品台。静态 HTML + CSS + vanilla ES modules，无框架、无打包器、无 npm 依赖。

**但有一个构建步骤。** 仓库根目录的 `*.html` 是**授权源文件**，里面的数字还是 `@@fact.key@@`
占位符，直接打开只会看到裸 token。真正的站点是 `dist/`。

## Build then run

```bash
python3 tools/build.py          # sources + facts.json -> dist/
python3 tools/bundle.py         # dist/ -> dist/teddy-wu.html (single file, double-clickable)
python3 tools/build.py --check  # invariant gate
python3 tools/serve.py 4174         # build, then serve dist/ with caching off
```

Open <http://localhost:4174/> for the site, or <http://localhost:4174/teddy-wu.html>
for the single-file build. The server roots at `dist/` on purpose: the repo-root HTML is
authored source whose numbers are still `@@tokens@@`. `dist/teddy-wu.html` can also be copied anywhere and opened
directly from disk.

## Where content lives

| What | File |
|---|---|
| Every number and its 口径 | `assets/data/facts.json` |
| Prose, layout, markup | the authored `*.html` at the repo root (numbers appear as `@@fact.key@@`) |
| Demo rule sets and the desensitised creator index | `assets/data/rules.json`, `creators.json` |
| Sample drafts behind the review demo's chips | `assets/data/demo-samples.json` |

Facts render into `assets/js/*.js` as well as into HTML, so a number cannot be hard-coded
in the engine while `facts.json` claims to own it.

Change a number once in `facts.json`, then `python3 tools/build.py && python3 tools/bundle.py`.
`--check` fails the build when any of these hold:

- a source HTML **or JS** file hard-codes a fact value
- a `@@token@@` has no definition, or a fact is never rendered anywhere
- a root-absolute `href`/`src`/`fetch()`/`url()` in the built tree does not resolve inside it
- the six stylesheet `<link>`s did not collapse into one `site.css`
- an `og:image`/`og:url` survived the build still relative
- `index.size` disagrees with the row count in `creators.json`
- a string lives in both a data file and an authored page

Never edit `dist/` by hand; `build.py` wipes and rebuilds it.

Deploy is `push to src` -> `build and publish` builds `dist/` and pushes it to `main`,
which is the branch Pages serves. `main` is generated; do not edit it either.

## Structure

- `/` scene deck — identity / work / trajectory / contact
- `/work/content-review/` `/work/creator-match/` full product dossiers
- `/profile/` full CV
- `/demo/review/` `/demo/match/` standalone demo deep links

Demos run a local deterministic rule/weighting engine. No model call, no network, no data leaves the page.
Raw (un-desensitised) creator data lives outside the web root at `../_private/`.
