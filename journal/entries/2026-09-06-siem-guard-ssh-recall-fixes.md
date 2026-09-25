---
id: 2026-09-06-siem-guard-ssh-recall-fixes
date: 2026-09-06
project: siem-guard-code
kind: fixed
visibility: public
summary: Recovered SSH behavioral recall via entity-identity and population-scoring fixes, after fixing the LILAC SSH corroboration gate.
links:
  - repo: NoorElAlfi/siem-guard-code
  - commit: 45618b4
  - commit: 8b2cb0f
tags:
  - security
  - ssh
  - recall
status: published
sources:
  - "commit:8b2cb0f: Session 21: LILAC SSH corroboration-gate fix"
  - "commit:45618b4: Session 23: recover SSH behavioral recall via entity-identity + population-scoring fixes"
---
The LILAC SSH corroboration gate was fixed (Session 21), and SSH behavioral recall was recovered through entity-identity and population-scoring fixes (Session 23).
