---
id: 2026-09-07-siem-guard-mitre-rule-matchers
date: 2026-09-07
project: siem-guard-code
kind: shipped
visibility: public
summary: Replaced the RNG stub with real rule matchers for MITRE T1078 and T1195.
links:
  - repo: NoorElAlfi/siem-guard-code
  - commit: bb845a8
tags:
  - python
  - mitre
  - detection-rules
status: published
sources:
  - "commit:bb845a8: Session 26: real rule matchers for MITRE T1078/T1195, replacing the RNG stub"
---
Rule matching for MITRE T1078 and T1195 now runs on real matchers. The previous implementation was a random stub, so those techniques were not actually being detected.
