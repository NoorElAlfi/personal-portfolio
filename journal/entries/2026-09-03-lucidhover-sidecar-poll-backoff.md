---
id: 2026-09-03-lucidhover-sidecar-poll-backoff
date: 2026-09-03
project: lucidhover
kind: shipped
visibility: public
summary: Made the sidecar RPC loop poll with queue-aware adaptive backoff instead of a fixed rate.
links:
  - repo: NoorElAlfi/lucidHover
  - commit: 14bce0c
tags:
  - vscode
  - sidecar
  - rpc
  - performance
status: published
sources:
  - "commit:14bce0c: Session 75: queue-aware adaptive poll backoff for sidecar RPC loop"
---
The sidecar RPC loop's polling is now queue-aware and adaptive: the backoff follows how much work is actually queued instead of polling at a fixed interval.
