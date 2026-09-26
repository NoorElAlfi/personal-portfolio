---
id: 2026-09-15-lucidhover-reference-accuracy-fixes
date: 2026-09-15
project: lucidhover
kind: fixed
visibility: public
summary: "Fixed reference-graph accuracy: compound-component aliases, glob dir exclusions, caller/callee misattribution and name-bias hallucinations."
links:
  - repo: NoorElAlfi/lucidHover
  - commit: e77e83c
  - commit: a234dd7
  - commit: e423788
  - commit: 14a9144
  - commit: "5050066"
tags:
  - vscode
  - call-graph
  - accuracy
  - aliases
status: published
sources:
  - "commit:e77e83c: Session 105: compound-component definition-side alias fix"
  - "commit:a234dd7: Session 102: glob-shaped dir exclusions, close *.egg-info gap"
  - "commit:e423788: Session 106: fix retrieved-context caller/callee misattribution"
  - "commit:14a9144: Session 96: traced name-bias and side_effects verbatim-copy hallucination fix"
  - "commit:5050066: Session 93: background-index symbol-provider cold-start retry"
  - "commit:5219ac8: Session 101: remove redundant depth sort in renderTrace"
  - "commit:7cdedc5: Session 99: freshness badge test coverage for the docked panel"
---
Definition-side aliases for compound components were not being resolved, so their references went missing; the same pass moved directory exclusions onto glob shapes and closed the `*.egg-info` gap that was leaking generated trees into the index. Retrieved context misattributed callers and callees, and traced name bias plus `side_effects` produced verbatim-copy hallucinations — both fixed.

Two smaller repairs ride along: the symbol provider now retries on a cold start while background indexing is still catching up, and a redundant depth sort was removed from `renderTrace`. The docked panel's freshness badge got its missing test coverage.
