---
id: 2026-09-16-lucidhover-packaging-leaks
date: 2026-09-16
project: lucidhover
kind: fixed
visibility: public
summary: Restored CHANGELOG.md, fixed two packaging leaks and a Windows EPERM teardown flake, and kept internal docs out of git.
links:
  - repo: NoorElAlfi/lucidHover
  - commit: bcf5487
  - commit: 03d204f
  - commit: 426fcb4
  - commit: 67f3ae9
tags:
  - vscode
  - packaging
  - tests
  - windows
status: published
sources:
  - "commit:23eae87: Untrack internal AI-workflow docs from git"
  - "commit:bcf5487: Restore CHANGELOG.md, fix two real packaging leaks"
  - "commit:03d204f: Fix Windows EPERM teardown flake across integration test suites"
  - "commit:426fcb4: Fix stale off-by-one line expectation in resolve_function test"
  - "commit:67f3ae9: Fix: restore validateAndPersistSignup's missing return statement"
---
Restoring `CHANGELOG.md` came with fixes for two real packaging leaks — files that should not have been shipping. Internal AI-workflow docs were untracked from git so they stay out of the repository.

On the test side, integration suites were flaking on Windows because teardown did not tolerate EPERM, a `resolve_function` test held a stale off-by-one line expectation, and `validateAndPersistSignup` had lost a return statement.
