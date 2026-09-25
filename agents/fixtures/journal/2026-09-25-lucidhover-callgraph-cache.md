---
id: 2026-09-25-lucidhover-callgraph-cache
date: 2026-09-25
project: lucidhover
kind: shipped
visibility: public
summary: Shipped a SQLite-backed call-graph cache so a hover on an unchanged file is a lookup instead of a repo-wide walk.
links:
  - repo: NoorElAlfi/lucidHover
  - commit: 1a2b3c4
  - pr: NoorElAlfi/lucidHover#41
tags: [vscode, sqlite, tree-sitter]
status: pending
sources:
  - "commit:1a2b3c4: cache resolved call graph edges in sqlite keyed on file hash"
  - "pr:41: Add call graph cache"
---

Every hover used to start from scratch: walk the file, walk its imports, resolve the
calls, then drop all of it when the card closed. That is four tree-sitter passes over the
import graph for a card the user opens for a couple of seconds.

The cache stores resolved edges in a SQLite table keyed on the file hash plus the
extension host version. A hover on an unchanged file is now a lookup; a hover on a
changed file re-walks only that file and replaces its rows, so the graph cannot silently
describe code that no longer exists.

Stale rows are pruned when the workspace folder is opened, not on every hover, because
eager pruning made the write path slower than the walk it replaced.

The remaining gap is dynamic calls: an edge that cannot be resolved is stored as
unresolved, and the hover card says so instead of reporting "no callers".
