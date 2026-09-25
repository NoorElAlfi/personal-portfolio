---
id: 2026-09-23-siemplify-tenant-isolation
date: 2026-09-23
project: siem-guard
kind: fixed
visibility: private
summary: Closed a tenant-isolation gap where an analysis query could read another tenant's events.
links:
  - repo: NoorElAlfi/siem-guard
tags: [security, multi-tenancy]
status: pending
sources:
  - "commit:9f8e7d6: scope analysis queries by tenant id"
  - "pr:12: Tenant scoping for analysis queries"
---

The analysis path built its SQL from a filter expression without carrying the tenant id
through the rewrite, so a query issued inside one workspace could read events belonging
to another. The dashboard never hit it because it always filtered by the signed-in
tenant before calling in; the CLI and the scheduled path did not.

The fix pushes the tenant id through the query builder instead of adding it at the call
sites, and rejects a query whose plan does not reference it. That means the invariant is
enforced where the SQL is produced, so a new caller cannot forget it.

Two callers were relying on the old behaviour and now fail closed.
