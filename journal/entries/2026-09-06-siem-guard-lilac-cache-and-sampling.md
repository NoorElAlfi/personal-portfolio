---
id: 2026-09-06-siem-guard-lilac-cache-and-sampling
date: 2026-09-06
project: siem-guard-code
kind: shipped
visibility: public
summary: LILAC template cache with hierarchical sampling built standalone and wired into parse_async; extraction and substring-collision fixes.
links:
  - repo: NoorElAlfi/siem-guard-code
  - commit: 12e6fe4
  - commit: e8d8fe4
tags:
  - llm
  - caching
  - parsing
  - python
status: published
sources:
  - "commit:12e6fe4: Session 16A: LILAC template cache + hierarchical sampling (standalone)"
  - "commit:e8d8fe4: Session 16B: wire LILAC template cache into LLMLogParser.parse_async"
  - "commit:8416e03: Fix template_cache extraction dropping short/normalized fields"
  - "commit:66410e1: Session 28: confirm and document template_cache.py substring-collision fix"
---
The LILAC template cache and hierarchical sampling were built standalone (Session 16A) and then wired into LLMLogParser.parse_async (Session 16B). Extraction that dropped short or normalized fields was fixed, and the template_cache.py substring-collision fix was confirmed and documented (Session 28).
