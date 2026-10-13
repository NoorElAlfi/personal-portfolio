---
id: 2026-10-12-elden-ring-rag-overhaul
date: 2026-10-12
project: elden-ring-rag
kind: fixed
visibility: public
summary: errag overhaul measured on real playthrough questions; held-out retrieval 4/20 to 18/20 on first run, with intent-aware retrieval, a shorthand file, quest progress and a local web page.
links: []
tags:
  - elden-ring
  - rag
  - retrieval
  - evaluation
  - local-llm
status: published
sources:
  - "context: first version built in an evening with DeepSeek; its own eval set passed 54 of 54 checks while failing most real playthrough questions"
  - "command: errag eval --file data/eval/playthrough.json -> 32 questions written before measuring; original code + original corpus 7/32; original code + widened corpus 10/32; rewritten retrieval 32/32 (tuned against)"
  - "command: errag eval --file data/eval/heldout.json -> 20 questions written after the rewrite, run once: 18/20 first run; original code + original corpus 4/20; original code + widened corpus 8/20; 20/20 after two general fixes (plural phrase folding; region fallback for a boss the quest list never names)"
  - "command: errag fetch --yes -> 572 new cache files (NPC, Characters, Locations, Legacy Dungeons, Subregions, Shadow of the Erdtree Locations, Catacombs, Caves, Churches, Ruins, Sites of Grace, Mechanics, guide pages)"
  - "retrieval cases pass when an answering page is in the top 3 retrieved blocks"
  - "data/curated/shorthand.json -> 32 name nicknames, 53 concept phrases"
  - "comparison at temperature 0 on identical context, 'what should I do after beating godrick': llama3.1:8b returned 1 step, qwen2.5:7b returned 11 ordered steps; qwen2.5:7b made the default"
  - "system prompt rules: direct answer first, at most six ordered bullets, citation on every line, question repeated after the context; written because 7 to 8B models failed each without it"
  - "command: errag eval --chat over playthrough + heldout (52 questions, qwen2.5:7b) -> 50 passed, 0 failed, 2 warned (no citation)"
  - "Leyndell tie-break: 'Leyndell, Royal Capital' is mentioned in 222 passages, 'Leyndell, Ashen Capital' in 52; ties now go to the more-mentioned page"
  - "command: errag eval -> 114 passed, 0 failed; python3 -m unittest -> 50 tests OK"
  - "item infobox stats (requirements, scaling, skill, weight) kept for 1,588 items"
  - "quest list: 12 DLC steps with no region tags, 270 base-game steps; 282 steps total"
  - "corpus: 2,867 items, 10,616 passages; runs on an 8 GB RTX 2070 SUPER"
---

errag answered its own eval set perfectly and still failed the questions I had while playing,
because that set was mostly item lookups. I wrote 32 questions the way I actually ask them,
before measuring: the original system passed 7. Running the original retriever over a corpus
widened with 572 NPC, location and system pages gave 10; the retrieval rewrite gave 32, tuned
against. A held-out set of 20, written afterwards and run once, scored 18 (original code: 4;
original code with the widened corpus: 8).

The causes were concrete. There were no NPC or location pages. A page counted as a boss only
if "Bosses" was its first category, so Margit, filed first under "Characters", lost to Margit's
Shackle. Items named after people outranked the people. The player's vocabulary ("respec",
"bleed", "walking mausoleum") never met the wiki's ("Rebirth", "Blood Loss", "Wandering
Mausoleum"). Progression questions ignored the quest list.

The fixes: page kinds from every category, intent-aware name resolution, possessive demotion,
a curated shorthand file, an ordered quest-list window with tracked progress, a popularity
tie-break, spelling correction limited to words the wiki never uses, and infobox stats on item
cards. On the generation side, qwen2.5:7b replaced llama3.1:8b as the default and the system
prompt became a short rulebook. Reading answers, not tests, found most of the remaining bugs.
