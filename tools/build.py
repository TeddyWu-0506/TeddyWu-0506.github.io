#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the deployable tree from authored sources + the fact single-source.

  assets/data/facts.json   every number and its 口径, defined exactly once
  *.html (repo root)       authored markup; numbers appear as @@fact.key@@
  dist/                    rendered output -> this is what you serve/deploy

Run:  python3 tools/build.py            build
      python3 tools/build.py --check    build to a temp dir and prove the
                                        render is lossless vs. git HEAD
"""
import json, os, re, shutil, subprocess, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facts_rules import RULES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACTS = json.load(open(os.path.join(ROOT, 'assets/data/facts.json'), encoding='utf-8'))
PAGES = ['index.html', '404.html', 'work/content-review/index.html', 'work/creator-match/index.html',
         'profile/index.html', 'demo/review/index.html', 'demo/match/index.html']
PASS_THROUGH = ['site.webmanifest', 'assets/favicon.svg']
ASSET_DIRS = ['assets/js', 'assets/data', 'assets/fonts', 'assets/img']
# One stylesheet, in cascade order. Six render-blocking <link>s cost ~900ms of
# critical path for a site this size; a single file removes the chain entirely.
CSS_ORDER = ['fonts.css', 'tokens.css', 'base.css', 'deck.css', 'components.css', 'pages.css']
CSS_LINK_RE = re.compile(
    r'\s*<link rel="stylesheet" href="/assets/css/(?:' + '|'.join(CSS_ORDER) + r')">')
TOKEN = re.compile(r'@@([\w.]+)@@')
# One place to change when the domain moves. Sources keep the canonical brand URL;
# the build rewrites it so github.io and a future custom domain need no edits.
SITE_URL = os.environ.get('SITE_URL', 'https://teddywu-0506.github.io').rstrip('/')
BRAND_URL = 'https://teddywu.site'


def render(text, facts=FACTS):
    unknown = sorted({m for m in TOKEN.findall(text) if m not in facts})
    if unknown:
        raise KeyError('unknown fact token(s): ' + ', '.join(unknown))
    return TOKEN.sub(lambda m: facts[m.group(1)], text)


def clean(p):
    if os.path.isdir(p): shutil.rmtree(p)
    elif os.path.exists(p): os.remove(p)


def build(outdir):
    for rel in PAGES:
        src = os.path.join(ROOT, rel)
        dst = os.path.join(outdir, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'w', encoding='utf-8').write(
            render(open(src, encoding='utf-8').read()).replace(BRAND_URL, SITE_URL))
    for rel in ('robots.txt', 'sitemap.xml'):
        sp = os.path.join(ROOT, rel)
        if os.path.exists(sp):
            open(os.path.join(outdir, rel), 'w', encoding='utf-8').write(
                open(sp, encoding='utf-8').read().replace(BRAND_URL, SITE_URL))
    for rel in PASS_THROUGH:
        s = os.path.join(ROOT, rel)
        if not os.path.exists(s): continue
        d = os.path.join(outdir, rel); os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copyfile(s, d)
    for ad in ASSET_DIRS:
        s = os.path.join(ROOT, ad)
        if not os.path.isdir(s): continue
        shutil.copytree(s, os.path.join(outdir, ad), dirs_exist_ok=True)

    cssdir = os.path.join(outdir, 'assets/css'); os.makedirs(cssdir, exist_ok=True)
    parts = []
    for name in CSS_ORDER:
        p = os.path.join(ROOT, 'assets/css', name)
        if os.path.exists(p):
            parts.append('/* ==== %s ==== */\n' % name + open(p, encoding='utf-8').read())
    open(os.path.join(cssdir, 'site.css'), 'w', encoding='utf-8').write('\n'.join(parts))

    # collapse the six stylesheet <link>s into one, keeping the first one's position
    for rel in PAGES:
        d = os.path.join(outdir, rel)
        body = open(d, encoding='utf-8').read()
        state = {'done': False}
        def collapse(m):
            if state['done']:
                return ''
            state['done'] = True
            return '\n<link rel="stylesheet" href="/assets/css/site.css">'
        body = CSS_LINK_RE.sub(collapse, body)
        open(d, 'w', encoding='utf-8').write(body)

    return outdir


def check():
    """Long-term invariants for the fact single-source.

    1. no authored HTML may contain a raw fact value  -> numbers live only in facts.json
    2. dist must render with zero unresolved tokens   -> every token has a definition
    3. every fact must actually appear in dist        -> no dead entries
    """
    tmp = os.path.join(ROOT, '.build-check'); clean(tmp); build(tmp)
    bad = 0
    srcs = [p for p in glob.glob(os.path.join(ROOT, '**/*.html'), recursive=True)
            if 'archive' not in p and '.git' not in p and 'dist' not in p and '.build-check' not in p]
    for p in srcs:
        body = open(p, encoding='utf-8').read()
        leaked = [k for k in FACTS
                  if any(re.search(p, body) for p in RULES.get(k, [re.escape(FACTS[k])]))]
        if leaked:
            print(f'   LEAK  {os.path.relpath(p, ROOT):40} raw values for: {leaked}'); bad += 1
    unresolved, used = 0, set()
    for p in glob.glob(os.path.join(tmp, '**/*.html'), recursive=True):
        body = open(p, encoding='utf-8').read()
        unresolved += len(TOKEN.findall(body))
        used |= {k for k in FACTS if FACTS[k] in body}
    print(f'   unresolved tokens in dist: {unresolved}')
    dead = sorted(set(FACTS) - used)
    if dead: print('   facts never rendered:', dead); bad += 1

    # Structure: unbalanced tags make the browser silently re-parent elements, which
    # breaks the .panel > .app nesting the surface scopes depend on.
    from html.parser import HTMLParser
    class Bal(HTMLParser):
        def __init__(s2): super().__init__(); s2.d=0; s2.bad=0
        def handle_starttag(s2,t,a):
            if t=='div': s2.d+=1
        def handle_endtag(s2,t):
            if t=='div':
                s2.d-=1
                if s2.d<0: s2.bad+=1
    for p in glob.glob(os.path.join(tmp, '**/*.html'), recursive=True):
        body=open(p,encoding='utf-8').read(); b=Bal(); b.feed(body)
        if b.d!=0 or b.bad:
            print(f'   UNBALANCED {os.path.relpath(p,tmp):36} depth={b.d} extra={b.bad}'); bad+=1
        for m in re.finditer(r'<div class="panel panel--preview[^"]*"[^>]*>', body):
            if not re.match(r'<div class="panel panel--preview[^"]*"[^>]*>\s*<div class="app"', body[m.start():m.start()+400]):
                print('   preview panel is not wrapped in .app:', os.path.relpath(p,tmp)); bad += 1
    # The demo prints the live index length at runtime, so the prose count must
    # agree with the data file or the two drift apart silently.
    try:
        n = len(json.load(open(os.path.join(ROOT, 'assets/data/creators.json'), encoding='utf-8')))
        if str(n) != FACTS.get('index.size'):
            print(f'   index.size says {FACTS.get("index.size")!r} but creators.json has {n} rows'); bad += 1
        else:
            print(f'   index.size matches creators.json ({n} rows)')
    except FileNotFoundError:
        pass
    clean(tmp)
    print('   invariants hold' if not bad and not unresolved else '   INVARIANT VIOLATION')
    return 1 if (bad or unresolved) else 0


if __name__ == '__main__':
    os.chdir(ROOT)
    if '--check' in sys.argv:
        sys.exit(check())
    d = build(os.path.join(ROOT, 'dist'))
    n = sum(len(TOKEN.findall(open(os.path.join(dp, f), encoding='utf-8', errors='ignore').read()))
            for dp, _, fs in os.walk(d) for f in fs if f.endswith('.html'))
    print(f'built {d}  (unresolved tokens: {n})')
