#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rewrite authored HTML so every fact reference becomes @@key@@, then prove with
tools/build.py --check that rendering reproduces the pre-tokenisation bytes."""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
from facts_rules import RULES
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
facts = json.load(open('assets/data/facts.json', encoding='utf-8'))
PAGES = ['index.html', 'work/content-review/index.html', 'work/creator-match/index.html',
         'profile/index.html', 'demo/review/index.html', 'demo/match/index.html']

for k in facts:
    if k not in RULES: sys.exit('no rule for fact ' + k)

total = {}
for page in PAGES:
    s = open(page, encoding='utf-8').read(); before = s
    for k, pats in RULES.items():
        for p in pats:
            s, n = re.subn(p, lambda m, k=k: '@@%s@@' % k, s)
            if n: total[k] = total.get(k, 0) + n
    if s != before:
        open(page, 'w', encoding='utf-8').write(s)
        print(f'{len(open(page,encoding="utf-8").read().split("@@"))-1:>3} tokens  {page}')

print('\nreplacements per fact:')
for k in sorted(total): print(f'  {k:16} x{total[k]}')
missing = [k for k in facts if k not in total]
print('never used (remove from facts.json?):', missing or 'none')
