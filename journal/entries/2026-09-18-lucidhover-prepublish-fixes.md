---
id: 2026-09-18-lucidhover-prepublish-fixes
date: 2026-09-18
project: lucidhover
kind: fixed
visibility: public
summary: Cleared LucidHover 0.2.0's pre-publish blockers — hover error handling, pausing indexing across a sidecar restart, and a codebase digest export command.
links:
  - repo: NoorElAlfi/lucidHover
  - commit: b3c2d28
tags: [vscode, typescript]
status: pending
sources:
  - "commit:b3c2d28: Pre-publish fixes: hover error handling, pause indexing across sidecar restart"
  - "commit:a5b9527: Add codebase digest export command"
  - "commit:99edd58: Truncate long file paths in the panel header"
  - "commit:8467ffb: Bump version to 0.2.0"
  - "commit:bcf5487: Restore CHANGELOG.md, fix two real packaging leaks"
  - "commit:03d204f: Fix Windows EPERM teardown flake across integration test suites"
  - "repo:NoorElAlfi/lucidHover: default branch master, 86 commits since 2026-07-27, no tags and no GitHub releases"
---

The pre-publish pass on LucidHover 0.2.0 landed as four days of fixes on `master` (the repository's
default branch) between 2026-09-16 and 2026-09-18.

- `b3c2d28` (2026-09-18, the newest commit in the window) handled hover errors and paused indexing
  across a sidecar restart.
- `a5b9527` added a codebase digest export command.
- `99edd58` made the panel header truncate long file paths.
- `8467ffb` bumped the version to 0.2.0.
- `bcf5487` restored `CHANGELOG.md` and fixed two packaging leaks.
- `03d204f` fixed a Windows `EPERM` teardown flake that had been failing the integration test
  suites.

The repository has 86 commits since 2026-07-27. Two notes worth keeping honest: no Marketplace or
GitHub release was cut in this window — the repo carries no tags and no releases, so 0.2.0 exists
only as the `8467ffb` bump — and the last push to the repo was 2026-09-18T16:36:09Z, so nothing has
landed since.
