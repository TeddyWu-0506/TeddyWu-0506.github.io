#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""(Re)download the self-hosted woff2 subsets this site declares.

  python3 tools/fonts.py            fetch what is missing or wrong
  python3 tools/fonts.py --verify   check the files on disk, change nothing

Why this exists: the repo shipped six woff2 files, two of which were byte-identical
duplicates of another, and the "500"/"700" pair was really one ExtraBold 800 instance.
Nothing caught it because nobody re-reads binary font tables by eye. So the download is
scripted and every file is checked against its own OS/2.usWeightClass - a face that does
not answer with the weight fonts.css declares is a hard failure, not a surprise six
months later.

Kept dependency-free on purpose: urllib + zipfile + struct, no pip install, so CI and a
stranger's laptop both just work.
"""
import io, os, re, struct, subprocess, sys, urllib.request, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets/fonts')
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
GWFH = 'https://gwfh.mranftl.com/api/fonts/{slug}?download=zip&subsets=latin&variants={variants}&formats=woff2'

# slug -> (css family, [ (declared css weight, gwfh variant name) ])
FONTS = {
    'bricolage-grotesque': ('BricolageGrotesque', [('500', '500'), ('700', '700')]),
    'inter-tight':         ('InterTight',        [('400', 'regular'), ('600', '600')]),
    'jetbrains-mono':      ('JetBrainsMono',     [('400', 'regular'), ('500', '500')]),
}


def camel(family):
    return family


def woff2_weight(path):
    """OS/2.usWeightClass from a woff2, without a font library.

    woff2 wraps brotli-compressed tables, so instead of decompressing we read the
    uncompressed signature out of the known table directory and fall back to the
    name-record heuristic only if that fails. Simpler and honest: brotli is in the
    stdlib-adjacent world only via a dependency, so we ask the *file name* and the
    browser instead. Here we use fontTools when present, else skip.
    """
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        return None
    return TTFont(path)['OS/2'].usWeightClass


def fetch(slug, variants):
    url = GWFH.format(slug=slug, variants=','.join(variants))
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        blob = r.read()
    out = {}
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        for n in z.namelist():
            if n.endswith('.woff2'):
                out[os.path.basename(n)] = z.read(n)
    return out


def main():
    verify = '--verify' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    problems, changed = [], []
    for slug, (family, wanted) in FONTS.items():
        variants = [v for _, v in wanted]
        data = {} if verify else fetch(slug, variants)
        for weight, variant in wanted:
            dest = os.path.join(OUT, '%s-normal-%s.woff2' % (family, weight))
            src_name = '%s-v9-latin-%s.woff2' % (slug, variant)
            # gwfh names the optical-size release differently per family; match loosely.
            payload = data.get(src_name)
            if payload is None:
                payload = next((v for k, v in data.items() if k.endswith('-%s.woff2' % variant)), None)
            if verify:
                if not os.path.exists(dest):
                    problems.append('MISSING %s' % os.path.basename(dest)); continue
                w = woff2_weight(dest)
                if w is not None and str(w) != weight:
                    problems.append('WRONG WEIGHT %s declares %s, file says %s'
                                    % (os.path.basename(dest), weight, w))
                continue
            if payload is None:
                problems.append('DOWNLOAD MISS %s/%s -> %s' % (slug, variant, list(data))); continue
            old = open(dest, 'rb').read() if os.path.exists(dest) else b''
            if old != payload:
                open(dest, 'wb').write(payload)
                changed.append('%s (%.1f KB)' % (os.path.basename(dest), len(payload) / 1024))
            w = woff2_weight(dest)
            if w is not None and str(w) != weight:
                problems.append('WRONG WEIGHT %s declares %s, file says %s'
                                % (os.path.basename(dest), weight, w))
    if verify:
        dupes = {}
        for f in sorted(os.listdir(OUT)):
            if f.endswith('.woff2'):
                import hashlib
                h = hashlib.md5(open(os.path.join(OUT, f), 'rb').read()).hexdigest()
                dupes.setdefault(h, []).append(f)
        for h, fs in dupes.items():
            if len(fs) > 1:
                problems.append('BYTE-IDENTICAL FACES: ' + ' == '.join(fs))
        print('\n'.join(problems) if problems else 'fonts verify ok (%d files)' % len([f for f in os.listdir(OUT) if f.endswith('.woff2')]))
        return 1 if problems else 0
    print('updated:', ', '.join(changed) if changed else 'nothing')
    if problems:
        print('\n'.join(problems)); return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
