---
id: 2026-09-06-siem-guard-package-name-normalization
date: 2026-09-06
project: siem-guard-code
kind: shipped
visibility: public
summary: Added package-name normalization and confidence scoring, confirming the typosquat recall improvement it targeted.
links:
  - repo: NoorElAlfi/siem-guard-code
  - commit: bbb03f0
  - commit: 2bbf6a4
tags:
  - python
  - typosquat
  - normalization
  - confidence
status: published
sources:
  - "commit:bbb03f0: Session 18A: Package Name Normalization (Part 1 of 2)"
  - "commit:2bbf6a4: Session 18B: confidence scoring for package names, confirm typosquat recall improvement"
---
Package names are normalized before matching, and package-name hits now carry a confidence score instead of a binary verdict. The change was checked against typosquat recall, which it improved.
