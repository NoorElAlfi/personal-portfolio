---
id: 2026-08-26-lucidhover-graph-view-redesign
date: 2026-08-26
project: lucidhover
kind: shipped
visibility: public
summary: Redesigned the blast-radius and execution-trace graph-view cards and fixed panel refresh sequencing and QuickPick navigation staleness.
links:
  - repo: NoorElAlfi/lucidHover
  - commit: 34a5a0d
  - commit: 9851d17
  - commit: 2fc3518
  - commit: 7ea9b9f
tags:
  - vscode
  - ui
  - graph-view
  - call-graph
status: published
sources:
  - "commit:34a5a0d: Session 59: blast-radius graph-view card redesign"
  - "commit:9851d17: Session 60: execution-trace graph-view card redesign"
  - "commit:744cde8: Session 60: execution-trace graph-view card redesign"
  - "commit:7ea9b9f: Session 61: refreshFor request sequencing fix"
  - "commit:2fc3518: Session 62: QuickPick-navigation panel-refresh fix"
---
The blast-radius and execution-trace views were rebuilt as graph-view cards. Following that, the docked panel's refresh path was tightened: `refreshFor` request sequencing was fixed so overlapping requests cannot land out of order, and navigating from the QuickPick no longer leaves a stale panel behind.
