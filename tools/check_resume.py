#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Cross-check the resume PDF against the fact single-source.

PLAN 872 makes this a product requirement, not a nicety: "站内、六格、/work/*、简历 PDF、
OG 描述五处数字必须一致 - 不一致是面试官最容易抓到、代价最大的失误." HTML gets that
guarantee from build.py --check. A PDF is a binary blob, so nothing looked at it - the
numbers inside it were free to drift the moment anyone edited facts.json.

This closes that gap for the claims worth pinning. Add a row to MUST_AGREE when you add a
number that also appears on the CV.

  python3 tools/check_resume.py            needs pypdf: pip install pypdf
  SKIPPED with exit 0 when pypdf is absent, so a bare CI box cannot fail on it - but
  build.py --check prints a loud reminder when the guard did not run.
"""
import os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, 'assets/Teddy-Wu-Resume.pdf')

# fact key -> regexes that must ALL hit the extracted PDF text.
# Written to accept the CV's own formatting (thin spaces, 万 vs W, arrows).
MUST_AGREE = {
    'scale.spend':    [r'月均消耗\s*(?P<n>\d+)\s*(万|W)'],
    'scale.creators': [r'月均\s*(?P<n>\d+)\+?\s*(达人|博主)'],
    'review.time':    [r'(?P<from>\d+)\s*min\s*(→|->|➜)\s*(?P<n>\d+)\s*min'],
    'review.recall':  [r'召回率\s*(?P<n>\d+)%'],
    'match.pool':     [r'匹配率\s*(?P<n>\d+)%'],
}


def pdf_text():
    try:
        from pypdf import PdfReader
    except ImportError:
        return None
    if not os.path.exists(PDF):
        return ''
    raw = ' '.join((p.extract_text() or '') for p in PdfReader(PDF).pages)
    # NFKC is not cosmetic. This PDF's text layer encodes 月 as the Kangxi radical ⽉ and
    # 风 as ⻛, a by-product of the font that produced it, so a plain regex over the raw
    # extraction silently matches nothing and the guard looks like it passed.
    raw = unicodedata.normalize('NFKC', raw)
    return re.sub(r'\s+', ' ', raw)


def fact_number(value):
    """Lead numeric part of a fact string: '150W+' -> 150, '10min → 3min' -> 3."""
    nums = re.findall(r'\d+', value)
    return int(nums[-1]) if nums else None


def main():
    text = pdf_text()
    if text is None:
        print('SKIPPED: pypdf not installed (pip install pypdf) - resume cross-check did not run')
        return 0
    if not text.strip():
        print('SKIPPED: no text layer in %s - is it a scanned export?' % os.path.basename(PDF))
        return 0

    import json
    facts = json.load(open(os.path.join(ROOT, 'assets/data/facts.json'), encoding='utf-8'))
    bad = 0
    for key, patterns in MUST_AGREE.items():
        if key not in facts:
            print('  no such fact: %s' % key); bad += 1; continue
        want = fact_number(facts[key])
        hit = None
        for pat in patterns:
            m = re.search(pat, text)
            if m:
                hit = m
                break
        if hit is None:
            print('  MISSING   %-16s site says %r, but the PDF never states it' % (key, facts[key]))
            bad += 1
            continue
        got = int(hit.groupdict().get('n') or fact_number(hit.group(0)))
        flag = '  OK       ' if got == want else '  CONFLICT '
        if got != want:
            bad += 1
        print('%s %-16s PDF %-10r  site %-10r' % (flag, key, hit.group(0).strip(), facts[key]))
    print('resume cross-check: %d issue(s)' % bad)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
