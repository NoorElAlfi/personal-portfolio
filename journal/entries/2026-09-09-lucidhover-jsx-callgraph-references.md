---
id: 2026-09-09-lucidhover-jsx-callgraph-references
date: 2026-09-09
project: lucidhover
kind: shipped
visibility: public
summary: Captured JSX tag usage as call-graph references, added a Python adapter with fixture, and documented the Python extension requirement.
links:
  - repo: NoorElAlfi/lucidHover
  - commit: aca503a
  - commit: 563f32e
  - commit: 2733afc
tags:
  - vscode
  - call-graph
  - jsx
  - python
status: published
sources:
  - "commit:aca503a: Session 78: capture JSX tag usage as call-graph references"
  - "commit:563f32e: Session 79: re-verify JSX confidence generalization + trim redundant recompute"
  - "commit:2733afc: Session 91: Python adapter and fixture"
  - "commit:fd6fc70: Session 95: document Python language-extension requirement"
---
JSX tag usage is now captured as call-graph references rather than being invisible to the graph, with the JSX confidence generalization re-verified afterwards and a redundant recompute trimmed out of that path. A Python adapter and its fixture landed in the same stretch, together with documentation of the language-extension requirement that Python support depends on.
