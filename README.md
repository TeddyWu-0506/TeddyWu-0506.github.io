# Teddy Wu — AI Product Portfolio

四场景横向作品台。静态 HTML + CSS + vanilla ES modules，无构建步骤。

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
| Demo fixtures and sample drafts | `assets/data/content.json`, `rules.json`, `creators.json` |

Change a number once in `facts.json`, then `python3 tools/build.py && python3 tools/bundle.py`.
`--check` fails the build if a source file hard-codes a fact, if a token has no
definition, if a fact is never rendered, or if `index.size` disagrees with the row
count in `creators.json`. Never edit `dist/` by hand.

## Structure

- `/` scene deck — identity / work / trajectory / contact
- `/work/content-review/` `/work/creator-match/` full product dossiers
- `/profile/` full CV
- `/demo/review/` `/demo/match/` standalone demo deep links

Demos run a local deterministic rule/weighting engine. No model call, no network, no data leaves the page.
Raw (un-desensitised) creator data lives outside the web root at `../_private/`.
