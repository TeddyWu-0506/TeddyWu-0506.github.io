#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Produce dist/teddy-wu.html: one self-contained file that opens by double-click.

Constraints of the file:// origin drive every transformation here:
  - no <link> / <script src>     -> everything inlined
  - no ES modules                -> flattened into one IIFE (origin "null" blocks them)
  - no fetch() of local JSON     -> data embedded, fetch shimmed
  - no absolute /assets paths    -> data: URIs for fonts and the portrait
"""
import base64, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, 'tools'))

CSS_SRC = 'dist/assets/css/site.css'   # build.py already flattened the cascade
# load order matters: dependencies first, entry last
JS = ['analytics.js', 'reveal.js', 'engine-review.js', 'engine-match.js',
      'demo-runtime.js', 'deck.js', 'main.js']
DATA = ['creators.json', 'rules.json', 'content.json']
SITE = 'https://teddywu.site'
MIME = {'woff2': 'font/woff2', 'jpg': 'image/jpeg', 'png': 'image/png', 'svg': 'image/svg+xml'}


def data_uri(path):
    ext = path.rsplit('.', 1)[-1]
    b = base64.b64encode(open(path, 'rb').read()).decode()
    return f'data:{MIME[ext]};base64,{b}'


def flatten_js():
    out = []
    for f in JS:
        src = open('assets/js/' + f, encoding='utf-8').read()
        src = re.sub(r'^\s*import\s+\{[^}]*\}\s+from\s+[\'"][^\'"]+[\'"];?\s*$', '', src, flags=re.M)
        src = re.sub(r'^\s*import\s+[\'"][^\'"]+[\'"];?\s*$', '', src, flags=re.M)
        src = re.sub(r'^\s*export\s+(default\s+)?', '', src, flags=re.M)
        out.append('/* ---- %s ---- */\n%s' % (f, src.strip()))
    body = '\n'.join(out)
    # Authoritative parse check: the bundle runs as a CLASSIC script, where top-level
    # await and import/export are illegal. node --check parses in exactly that mode.
    import subprocess, tempfile
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as fh:
        fh.write(body); probe = fh.name
    r = subprocess.run(['node', '--check', probe], capture_output=True, text=True)
    os.unlink(probe)
    if r.returncode:
        raise SystemExit('flattened bundle is not a valid classic script:\n' + r.stderr[:900])
    return body


def shim():
    return (
      "window.__BUNDLE__ = " + json.dumps({d.rsplit('.', 1)[0]: json.load(open('assets/data/' + d, encoding='utf-8'))
                                           for d in DATA}, ensure_ascii=False) + ";\n"
      "window.fetch = (function (orig) {\n"
      "  return function (input, init) {\n"
      "    var p = String(typeof input === 'string' ? input : (input && input.url) || '');\n"
      "    var m = p.match(/\\/assets\\/data\\/([\\w.-]+)\\.json/);\n"
      "    if (m && window.__BUNDLE__[m[1]] !== undefined) {\n"
      "      return Promise.resolve(new Response(JSON.stringify(window.__BUNDLE__[m[1]]),\n"
      "        { status: 200, headers: { 'Content-Type': 'application/json' } }));\n"
      "    }\n"
      "    return orig.apply(this, arguments);\n"
      "  };\n"
      "})(window.fetch.bind(window));\n")


def build():
    html = open('dist/index.html', encoding='utf-8').read()

    css = open(CSS_SRC, encoding='utf-8').read()
    css = re.sub(r"url\('/assets/fonts/([^']+)'\)",
                 lambda m: 'url(' + data_uri('assets/fonts/' + m.group(1)) + ')', css)
    links = re.compile(r'\s*<link rel="(?:preload|stylesheet)"[^>]*assets/(?:css|fonts)/[^>]*>')
    html = links.sub('', html)
    html = html.replace('</head>', '<style>\n' + css + '\n</style>\n</head>')

    html = re.sub(r'<img src="/assets/img/(portrait-\d+\.jpg)"[^>]*>',
                  lambda m: '<img src="' + data_uri('assets/img/' + m.group(1))
                            + '" alt="Teddy Wu 的肖像照" width="849" height="849" decoding="async">', html)
    # An inline data-URI icon: dropping the <link> makes the browser fall back to
    # /favicon.ico, which 404s and fails the best-practices audit.
    html = re.sub(r'<link rel="icon"[^>]*>',
                  '<link rel="icon" type="image/svg+xml" href="' + data_uri('assets/favicon.svg') + '">', html)
    if 'rel="icon"' not in html:
        html = html.replace('</head>', '<link rel="icon" type="image/svg+xml" href="%s">\n</head>'
                            % data_uri('assets/favicon.svg'))
    html = re.sub(r'<link rel="preload"[^>]*>', '', html)

    # root-relative links cannot resolve under file://; send them to the live site
    html = re.sub(r'(href|src)="/(work|profile|demo)([^"]*)"',
                  lambda m: '%s="%s/%s%s"' % (m.group(1), SITE, m.group(2), m.group(3)), html)
    html = html.replace('href="/#', 'href="%s/#' % SITE).replace('href="/"', 'href="%s/"' % SITE)

    script = shim() + '\n' + flatten_js()
    tag = '\n<script>\n(function(){\n' + script + '\n})();\n</script>\n'
    html = re.sub(r'\s*<script type="module" src="/assets/js/main.js"></script>',
                  lambda _m: tag, html)

    html = html.replace('<title>', '<title>[离线单文件] ')
    out = 'dist/teddy-wu.html'
    open(out, 'w', encoding='utf-8').write(html)

    # Re-parse the FINAL inline script, not just the concatenation: wrapping in an IIFE
    # and injecting the fetch shim can both introduce syntax the earlier check misses.
    inline = re.findall(r'<script>\n(.*?)\n</script>', html, re.S)
    import subprocess, tempfile
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as fh:
        fh.write(inline[-1]); probe = fh.name
    r = subprocess.run(['node', '--check', probe], capture_output=True, text=True)
    os.unlink(probe)
    if r.returncode:
        raise SystemExit('final inline script does not parse as a classic script:\n' + r.stderr[:900])
    kb = os.path.getsize(out) / 1024
    left = re.findall(r'(?:src|href)="/[^"]*"', html)
    print(f'{out}  {kb:.0f} KB   root-relative refs left: {len(left)}   '
          f'module scripts: {html.count("type=" + chr(34) + "module")}')
    if left: print('   leftovers:', left[:5])
    return out


if __name__ == '__main__':
    build()
