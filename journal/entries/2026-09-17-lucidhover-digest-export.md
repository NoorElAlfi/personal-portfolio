---
id: 2026-09-17-lucidhover-digest-export
date: 2026-09-17
project: lucidhover
kind: shipped
visibility: public
summary: Added a codebase digest export command, a call-graph-clustered rollup summary, and panel fixes for long paths and lists.
links:
  - repo: NoorElAlfi/lucidHover
  - commit: a5b9527
  - commit: 99edd58
  - commit: 28b5b90
  - commit: a28a16f
tags:
  - vscode
  - export
  - panel
  - digest
status: published
sources:
  - "commit:28b5b90: Session 68: add call-graph-clustered rollup summary"
  - "commit:a5b9527: Add codebase digest export command"
  - "commit:99edd58: Truncate long file paths in the panel header"
  - "commit:a28a16f: Docked panel: scroll long used-by/calls lists instead of truncating"
---
A codebase digest export command takes the analysis out of the editor, and a call-graph-clustered rollup summary groups it into clusters for reading. In the docked panel, long file paths are truncated in the header and long used-by/calls lists scroll instead of being cut off.
