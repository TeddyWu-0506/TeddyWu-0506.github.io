# -*- coding: utf-8 -*-
"""One definition of how each fact is recognised in markup.

Shared by tokenize.py (rewrites sources) and build.py (detects leaks), so the
two can never disagree. Short numeric facts such as "20" or "92%" need explicit
boundaries: a plain substring test would match inside 2026 or 192%.
"""
FACTS_FILE = 'assets/data/facts.json'

RULES = {
 'review.time':    [r'10min → 3min'],
 'review.prov':    [r'口径：单条小红书图文[^<]*'],
 'review.eff':     [r'审核效率 \+70% · 返稿占比 80%→40%'],
 'review.recall':  [r'(?<![\d.])92%(?![\d])'],
 'match.time':     [r'30min → 5min'],
 'match.prov':     [r'口径：从收到 brief[^<]*'],
 'match.eff':      [r'选号效率 \+83% · 中选率 30%→50%'],
 'match.pool':     [r'(?<![\d.])85%(?![\d])'],
 'index.size':     [r'(?<![\d.,])20(?= ?条脱敏)', r'(?<![\d.,])20(?= 位)', r'(?<![\d.,])20(?= 条)'],
 'scale.creators': [r'(?<![\d.])200\+(?= 达人| 博主| 位|筛选|达人筛选| 达人筛选)'],
 'scale.spend':    [r'150W\+'],
 'problem.volume': [r'(?<![\d.])600 条'],
}
