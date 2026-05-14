---
title: Monorepos
description: Running InstallGuard across multiple packages in one repo.
---

InstallGuard scans one lockfile per invocation. For a monorepo with multiple lockfiles (e.g. workspaces with their own `pnpm-lock.yaml`), invoke once per lockfile and aggregate.

## pnpm workspaces

```sh
# Single root lockfile (most common)
installguard scan

# Per-package scans (rare; only if you have multiple lockfiles)
for lock in $(find . -name 'pnpm-lock.yaml' -not -path '*/node_modules/*'); do
  ( cd "$(dirname "$lock")" && installguard scan )
done
```

## Shared policy

For consistent rules across packages, keep one `installguard.yaml` at the repo root and pass it explicitly:

```sh
installguard scan --policy ../../installguard.yaml
```

## CI recipe

The [GitHub Actions recipe](/recipes/github-actions/) works as-is for single-lockfile monorepos. For multi-lockfile setups, fan out with a matrix:

```yaml
strategy:
  matrix:
    workspace: [packages/api, packages/web, packages/worker]
steps:
  - run: installguard ci --summary-file ${{ matrix.workspace }}/summary.json
    working-directory: ${{ matrix.workspace }}
```
