---
id: 2026-08-28-lucidhover-indexing-concurrency-revert
date: 2026-08-28
project: lucidhover
kind: learned
visibility: public
summary: Raised background indexing to a concurrent worker pool, then reverted concurrency to 1 after measuring real collision frequency.
links:
  - repo: NoorElAlfi/lucidHover
  - commit: adfd894
  - commit: "2251057"
tags:
  - vscode
  - indexing
  - performance
  - measurement
status: published
sources:
  - "commit:aa8f4b7: Session 66: reduce background indexing's default scope"
  - "commit:adfd894: Session 67: raise background-indexing to a concurrent worker pool"
  - "commit:e14b8c2: Session 70: background-indexing measurement follow-up"
  - "commit:2251057: Session 71: revert BACKGROUND_INDEX_CONCURRENCY to 1 on real collision-frequency data"
---
Background indexing was reduced in default scope and raised to a concurrent worker pool, then followed by a measurement pass. On the measured collision frequency the concurrency was not worth it, so `BACKGROUND_INDEX_CONCURRENCY` was reverted to 1 on that data rather than on the assumption that more workers meant more throughput.
