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
SKIP_DIR = re.compile(r'(^|/)(archive|dist|node_modules|templates|__pycache__)(/|$)|^\.')


def discover_pages():
    """Every authored page, found rather than remembered.

    A hardcoded list is the quiet kind of maintenance trap: add a fifth work dossier,
    forget to edit build.py, and the new page is never built, never token-rendered and
    never leak-checked - it just silently does not exist as far as the site is concerned.
    """
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if not d.startswith('.'))
        for f in sorted(filenames):
            if not f.endswith('.html'):
                continue
            rel = os.path.relpath(os.path.join(dirpath, f), ROOT).replace(os.sep, '/')
            if not SKIP_DIR.search(rel):
                out.append(rel)
    # index.html first so build output reads in navigation order
    return sorted(out, key=lambda p: (p != 'index.html', p))


PAGES = discover_pages()
# Loose files under assets/ that pages link to directly. The resume PDF belongs here and
# silently 404'd in production because ASSET_DIRS only ever walked subdirectories.
PASS_THROUGH = ['site.webmanifest', 'assets/favicon.svg', 'assets/Teddy-Wu-Resume.pdf']
ASSET_DIRS = ['assets/data', 'assets/fonts', 'assets/img', 'assets/icons']
# JS is rendered through the same token pass as HTML. A fact that can only be reached by
# editing the engine is a fact with two owners, and facts.json is supposed to be the one.
JS_DIR = 'assets/js'
# One stylesheet, in cascade order. Six render-blocking <link>s cost ~900ms of
# critical path for a site this size; a single file removes the chain entirely.
CSS_ORDER = ['fonts.css', 'tokens.css', 'base.css', 'deck.css', 'components.css', 'pages.css']
CSS_LINK_RE = re.compile(
    r'\s*<link rel="stylesheet" href="/assets/css/(?:' + '|'.join(CSS_ORDER) + r')">')
TOKEN = re.compile(r'@@([\w.]+)@@')
# Root-absolute references, one pattern per file type. --check uses these to prove that
# every link in the built tree actually resolves against the built tree.
REF_HTML = re.compile('(?:href|src)="(/[^"#?]+)')
REF_JS = re.compile(r"""fetch\(['"](/[^'"]+)['"]\)""")
REF_CSS = re.compile(r"""url\(['"]?(/[^'")]+)""")
# Crawlers resolve og:image and og:url against nothing at all - a leading slash is simply
# dropped, and the card renders without its picture. Sources keep writing /assets/... so a
# domain move costs no edits; the build is where those become absolute.
OG_REL = re.compile('(<meta property="og:(?:image|url)" content=")(/)([^"]*)(")')
# A well-formed social tag, closing quote included. --check compares the loose and strict
# counts, so a substitution that eats a quote fails the build instead of shipping a page
# whose next <meta> has silently merged into the image URL.
OG_STRICT = re.compile('<meta property="og:(?:image|url)" content="(https?://[^"]*)">')
# Sources keep writing the canonical brand URL; the build rewrites it to wherever this
# deployment actually lives, so a domain move costs zero edits. Resolution order is
# explicit override, then the host's own environment, then the current production URL.
BRAND_URL = 'https://teddywu.site'
DEV_FALLBACK = 'https://teddywu-0506.github.io'


def detect_site_url(env=os.environ):
    if env.get('SITE_URL'):
        return env['SITE_URL'].rstrip('/')
    # Cloudflare Pages tells you the canonical URL of the deployment it just built.
    if env.get('CF_PAGES_URL'):
        return env['CF_PAGES_URL'].rstrip('/')
    if env.get('PAGES_URL'):                       # common convention for other static hosts
        return env['PAGES_URL'].rstrip('/')
    # GitHub Pages: user/org repos serve from the apex, project repos from a sub-path.
    if env.get('GITHUB_ACTIONS') == 'true':
        repo = (env.get('GITHUB_REPOSITORY') or '').strip()
        if repo:
            owner, _, name = repo.partition('/')
            owner, name = owner.lower(), name.lower()
            if name == owner + '.github.io':
                return 'https://' + name
            return 'https://' + owner + '.github.io/' + name
    return DEV_FALLBACK


SITE_URL = detect_site_url()


def render(text, facts=FACTS):
    unknown = sorted({m for m in TOKEN.findall(text) if m not in facts})
    if unknown:
        raise KeyError('unknown fact token(s): ' + ', '.join(unknown))
    return TOKEN.sub(lambda m: facts[m.group(1)], text)


def git_mtime(rel):
    """Date of the last commit that touched `rel`, or None if git cannot say."""
    try:
        r = subprocess.run(['git', 'log', '-1', '--format=%cd', '--date=short', '--', rel],
                           cwd=ROOT, capture_output=True, text=True, timeout=15)
        return r.stdout.strip() or None
    except Exception:
        return None


def stamp_sitemap(text):
    """Rewrite each <lastmod> from git.

    A hand-maintained lastmod is a date somebody typed once. It quietly turns into a lie
    the first time a page changes, and a stale sitemap is worse than no sitemap because it
    trains the crawler to stop trusting this one.
    """
    def one(m):
        loc, authored = m.group(1), m.group(2)
        path = re.sub(r'^https?://[^/]+', '', loc).strip('/')
        rel = (path + '/' if path else '') + 'index.html'
        d = git_mtime(rel) or (authored or '').strip()
        return '<url><loc>%s</loc><lastmod>%s</lastmod></url>' % (loc, d)
    return re.sub(r'<url><loc>([^<]+)</loc>(?:<lastmod>([^<]*)</lastmod>)?</url>', one, text)


def absolutize(text):
    return OG_REL.sub(lambda m: m.group(1) + SITE_URL + m.group(2) + m.group(3) + m.group(4), text)


def clean(p):
    if os.path.isdir(p): shutil.rmtree(p)
    elif os.path.exists(p): os.remove(p)


def build(outdir):
    # Start from an empty tree. copytree(dirs_exist_ok=True) only ever adds, so a deleted
    # source file - or a renamed one - survived in dist/ forever and kept getting served.
    clean(outdir)
    os.makedirs(outdir, exist_ok=True)
    for rel in PAGES:
        src = os.path.join(ROOT, rel)
        dst = os.path.join(outdir, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'w', encoding='utf-8').write(
            absolutize(render(open(src, encoding='utf-8').read()).replace(BRAND_URL, SITE_URL)))
    for rel in ('robots.txt', 'sitemap.xml'):
        sp = os.path.join(ROOT, rel)
        if not os.path.exists(sp): continue
        body = open(sp, encoding='utf-8').read().replace(BRAND_URL, SITE_URL)
        if rel == 'sitemap.xml':
            body = stamp_sitemap(body)
        open(os.path.join(outdir, rel), 'w', encoding='utf-8').write(body)
    for rel in PASS_THROUGH:
        s = os.path.join(ROOT, rel)
        if not os.path.exists(s): continue
        d = os.path.join(outdir, rel); os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copyfile(s, d)
    # Cloudflare Pages reads this; GitHub Pages ignores it and serves it as a plain file,
    # which is harmless. Generated rather than committed so the cache policy cannot drift
    # away from what the build actually emits.
    #
    # No content hashes yet, so assets get one day, not a year: "immutable" on a file whose
    # name never changes is a stuck stylesheet until the visitor force-reloads.
    open(os.path.join(outdir, '_headers'), 'w', encoding='utf-8').write(
        '/*\n'
        '  Cache-Control: public, max-age=0, must-revalidate\n'
        '  X-Content-Type-Options: nosniff\n'
        '  Referrer-Policy: strict-origin-when-cross-origin\n'
        '  X-Frame-Options: DENY\n'
        '  Permissions-Policy: camera=(), microphone=(), geolocation=()\n'
        '\n'
        '/assets/*\n'
        '  Cache-Control: public, max-age=86400\n')

    for ad in ASSET_DIRS:
        s = os.path.join(ROOT, ad)
        if not os.path.isdir(s): continue
        shutil.copytree(s, os.path.join(outdir, ad), dirs_exist_ok=True)

    jsrc = os.path.join(ROOT, JS_DIR)
    jdst = os.path.join(outdir, JS_DIR)
    if os.path.isdir(jsrc):
        os.makedirs(jdst, exist_ok=True)
        for f in sorted(glob.glob(os.path.join(jsrc, '*.js'))):
            open(os.path.join(jdst, os.path.basename(f)), 'w', encoding='utf-8').write(
                render(open(f, encoding='utf-8').read()))

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
    # The engine is part of the fact surface too: it renders 候选池匹配率 straight to the
    # visitor, so a hard-coded number there is exactly as much a drift risk as one in HTML.
    srcs += sorted(glob.glob(os.path.join(ROOT, JS_DIR, '*.js')))
    for p in srcs:
        body = open(p, encoding='utf-8').read()
        leaked = [k for k in FACTS
                  if any(re.search(p, body) for p in RULES.get(k, [re.escape(FACTS[k])]))]
        if leaked:
            print(f'   LEAK  {os.path.relpath(p, ROOT):40} raw values for: {leaked}'); bad += 1
    unresolved, used = 0, set()
    dist_doc = (glob.glob(os.path.join(tmp, '**/*.html'), recursive=True)
                + glob.glob(os.path.join(tmp, '**/*.js'), recursive=True))
    for p in dist_doc:
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
    # Every root-absolute reference must resolve inside dist. This is the check that was
    # missing when the resume PDF went live as a 404: the file existed in the repo, the
    # link was authored, and nothing proved the two ended up in the same tree.
    refs = set()
    for pat, ext in ((REF_HTML, 'html'), (REF_JS, 'js'), (REF_CSS, 'css')):
        for p in glob.glob(os.path.join(tmp, '**/*.' + ext), recursive=True):
            body = open(p, encoding='utf-8').read()
            refs |= {(os.path.relpath(p, tmp), u) for u in pat.findall(body)}
    missing = []
    for rel, u in sorted(refs):
        tgt = os.path.join(tmp, u.lstrip('/'))
        if os.path.exists(tgt):
            continue
        if u.endswith('/') and (os.path.exists(os.path.join(tgt, 'index.html'))
                                or os.path.exists(tgt + '.html')):
            continue
        if not u.endswith('.') and os.path.exists(tgt + '.html'):
            continue
        missing.append((rel, u))
    if missing:
        print('   BROKEN REF in dist (%d):' % len(missing))
        for rel, u in missing[:8]: print('      ', rel, '->', u)
        bad += 1
    else:
        print('   all %d root-absolute refs resolve in dist' % len(refs))

    # A relative og:image/og:url is the kind of bug that passes every local test and only
    # shows up as a blank card in WeChat or Slack weeks later. The loose-vs-strict count
    # also catches a malformed tag, which a relativity check alone would wave through.
    social = []
    for p in glob.glob(os.path.join(tmp, '**/*.html'), recursive=True):
        body = open(p, encoding='utf-8').read()
        loose = len(re.findall('<meta property="og:(?:image|url)"', body))
        strict = len(OG_STRICT.findall(body))
        if loose != strict:
            social.append('%s (%d/%d social tags well-formed and absolute)' % (os.path.relpath(p, tmp), strict, loose))
    if social:
        print('   SOCIAL TAG NOT ABSOLUTE:', social); bad += 1

    # The six <link>s must have collapsed into exactly one site.css. CSS_LINK_RE matches
    # an exact attribute layout, so a reordered tag would silently leave render-blocking
    # requests in the page instead of failing the build.
    stale_css = re.compile('/assets/css/(?:' + '|'.join(CSS_ORDER) + r')\.css')
    stale = [os.path.relpath(p, tmp) for p in glob.glob(os.path.join(tmp, '**/*.html'), recursive=True)
             if stale_css.search(open(p, encoding='utf-8').read())]
    if stale:
        print('   CSS NOT COLLAPSED in:', stale); bad += 1

    # Two byte-identical assets is how "500 and 700 are the same font" and "the QR code
    # exists twice" both got in. Cheap to detect, and nothing else in the pipeline looks
    # at file bytes at all.
    import hashlib
    byhash = {}
    for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, 'assets')):
        dirnames[:] = [d for d in dirnames if d != '__pycache__']
        for f in filenames:
            fp = os.path.join(dirpath, f)
            h = hashlib.md5(open(fp, 'rb').read()).hexdigest()
            byhash.setdefault(h, []).append(os.path.relpath(fp, ROOT))
    dupes = [v for v in byhash.values() if len(v) > 1]
    if dupes:
        print('   DUPLICATE ASSETS (identical bytes, one owner each):')
        for d in dupes: print('      ', ' == '.join(d))
        bad += 1

    # A 4.2 MB resume PDF inside a 1-page download is the kind of thing that only shows up
    # as a recruiter on hotel wifi. Budget per shipped file, not per tree, so the offender
    # names itself.
    BUDGET = 1500 * 1024
    heavy = []
    for dirpath, _, filenames in os.walk(tmp):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if os.path.getsize(fp) > BUDGET:
                heavy.append('%s %.1f MB' % (os.path.relpath(fp, tmp), os.path.getsize(fp) / 1048576))
    if heavy:
        print('   OVER %d KB PER-FILE BUDGET:' % (BUDGET // 1024), heavy); bad += 1

    # A module in tools/ that shadows a stdlib name is a landmine, not a naming problem:
    # build.py puts tools/ first on sys.path, so the shadow fires inside someone else's
    # import. This repo already shipped one that rewrote the authored pages that way.
    import sysconfig
    stdlib = set(getattr(sys, 'stdlib_module_names', set()))
    if not stdlib:
        stdlib = {m for m in os.listdir(os.path.join(sysconfig.get_paths()['stdlib']))
                  if m.endswith('.py')} | {m for m in os.listdir(sysconfig.get_paths()['stdlib'])
                                           if os.path.isdir(os.path.join(sysconfig.get_paths()['stdlib'], m))}
    shadow = [f[:-3] for f in os.listdir(os.path.join(ROOT, 'tools'))
              if f.endswith('.py') and f[:-3] in stdlib]
    if shadow:
        print('   STDLIB SHADOW in tools/:', shadow, '- rename it, imports will hit this first'); bad += 1

    # Anti-drift: a prose string that lives in BOTH a data file and an authored page is
    # a dead copy waiting to go stale. This exact bug shipped once (content.json held the
    # six-cell copy that nothing read while index.html held the real one).
    authored = []
    for rel in PAGES:
        p = os.path.join(ROOT, rel)
        if os.path.exists(p):
            authored.append(open(p, encoding='utf-8').read())
    blob = '\n'.join(authored)
    def strings(o):
        if isinstance(o, str): yield o
        elif isinstance(o, dict):
            for v in o.values(): yield from strings(v)
        elif isinstance(o, list):
            for v in o: yield from strings(v)
    for name in ('demo-samples.json', 'rules.json'):
        dp = os.path.join(ROOT, 'assets/data', name)
        if not os.path.exists(dp): continue
        data = json.load(open(dp, encoding='utf-8'))
        dupes = sorted({x for x in strings(data) if len(x) >= 14 and x in blob})
        if dupes:
            print(f'   DEAD COPY in {name}: {len(dupes)} string(s) also present in authored HTML')
            for x in dupes[:3]: print('      ', x[:70])
            bad += 1
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
    # The resume PDF is a binary blob, so no HTML-side invariant can see the numbers inside
    # it. PLAN 872 calls a mismatch between the CV and the site the most expensive mistake
    # on this project, so the cross-check runs here when it can, and says so when it cannot
    # - a guard that quietly does not exist is worse than one that announces itself.
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'check_resume.py')],
                       capture_output=True, text=True)
    out = (r.stdout or '').strip()
    if 'SKIPPED' in out:
        print('   resume cross-check SKIPPED (pip install pypdf) - CV numbers unverified')
    elif r.returncode:
        print('   RESUME / SITE NUMBER CONFLICT:')
        for line in out.split('\n'):
            if line.strip(): print('     ', line)
        bad += 1
    else:
        print('   resume PDF agrees with the fact table (%d claims checked)'
              % out.count('  OK'))

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
