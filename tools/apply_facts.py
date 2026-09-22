#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""One-shot migration: rewrite authored HTML so every fact reference becomes @@key@@.

Run it once after adding a fact, then prove with `tools/build.py --check` that rendering
reproduces the pre-tokenisation bytes.

It was named tools/tokenize.py until that turned out to shadow the standard library.
build.py puts tools/ at the front of sys.path, so any dependency that does
`import tokenize` - the stdlib `inspect` does, and fontTools pulls it in - executed this
script as an import side effect. This script writes the authored pages. Nothing may be
able to trigger that by accident, hence the __main__ guard as well as the rename.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facts_rules import RULES
from build import discover_pages

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    os.chdir(ROOT)
    facts = json.load(open('assets/data/facts.json', encoding='utf-8'))

    # Same default as build.py's leak detector: no rule means a literal
    # substring search, so a new fact degrades to noisy rather than silent.
    rules = {k: RULES.get(k, [re.escape(facts[k])]) for k in facts}

    total = {}
    for page in discover_pages():
        s = open(page, encoding='utf-8').read(); before = s
        for k, pats in rules.items():
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


if __name__ == '__main__':
    main()
