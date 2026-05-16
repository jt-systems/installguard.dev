---
title: Polyglot monorepos
description: Run InstallGuard across npm and PyPI lockfiles in one repo with one shared policy and one CI matrix.
---

InstallGuard supports npm-family and PyPI lockfiles, but it still scans
**one lockfile per invocation**. In a polyglot monorepo, that means you
need one run per workspace or service that owns its own lock.

This recipe covers the common shape:

- a JavaScript frontend with `pnpm-lock.yaml`
- a Python service with `uv.lock` or `poetry.lock`
- one shared `installguard.yaml` at the repo root

## Why a separate recipe?

When multiple lockfiles live in the same repo, root auto-detection picks
one by priority. That is correct for single-project repos, but not for a
polyglot monorepo where both ecosystems are first-class release inputs.

The right move is an explicit matrix, one workspace per job.

## Example layout

```text
installguard.yaml
apps/web/pnpm-lock.yaml
services/api/uv.lock
tools/release/poetry.lock
```

## Shared policy with ecosystem prefixes

Bare allowlist entries still work, but polyglot repos are where the
ecosystem-prefix grammar becomes genuinely useful.

```yaml
policyVersion: 1

defaults:
  minimumReleaseAge: 1440
  nameSquatAllow:
    - npm:gaxios
    - pypi:requests

scripts:
  allow:
    - npm:core-js
    - pypi:our-internal-build-backend
```

Prefixes keep the review intent obvious:

- `npm:gaxios` means "this JS package is legitimate"
- `pypi:requests` means "this Python package is legitimate"

Without the prefix, a bare name would match either family.

## GitHub Actions matrix

```yaml
# .github/workflows/installguard-polyglot.yml
name: InstallGuard polyglot

on:
  pull_request:
  push:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        include:
          - name: web
            path: apps/web
          - name: api
            path: services/api
          - name: release-tools
            path: tools/release
    permissions:
      contents: read
    env:
      INSTALLGUARD_VERSION: v0.3.4
    steps:
      - uses: actions/checkout@v4

      - name: Install InstallGuard
        run: |
          curl -fsSL "https://github.com/jt-systems/installguard/releases/download/${INSTALLGUARD_VERSION}/installguard-x86_64-unknown-linux-musl" \
            -o /usr/local/bin/installguard
          chmod +x /usr/local/bin/installguard

      - name: Cache signals
        uses: actions/cache@v4
        with:
          path: ~/.cache/installguard
          key: installguard-${{ runner.os }}-${{ hashFiles('**/package-lock.json', '**/pnpm-lock.yaml', '**/yarn.lock', '**/uv.lock', '**/poetry.lock', '**/requirements.txt', '**/pyproject.toml') }}
          restore-keys: |
            installguard-${{ runner.os }}-

      - name: Scan workspace
        run: |
          installguard ci \
            --path "${{ matrix.path }}" \
            --policy installguard.yaml \
            --summary-file "${{ matrix.name }}-summary.json"

      - name: Upload summary
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: installguard-${{ matrix.name }}-summary
          path: "${{ matrix.name }}-summary.json"
          if-no-files-found: ignore
```

## Workspace-specific notes

- `requirements.txt` only counts as a supported Python lock when it is
  hash-pinned. Plain requirements files are not lockfiles.
- If one workspace has its own policy exceptions, keep the root policy as
  the default and add a workspace-local policy only for the narrow
  delta.
- Use `fail-fast: false` so one failing ecosystem does not hide findings
  in the others.

## When to split policies

One shared policy is the right default. Split into per-workspace policy
files only when:

- teams genuinely own different risk thresholds
- the repo contains internal tooling with intentionally looser rules
- or the same package name appears in both ecosystems and the exception
  set becomes hard to review

Even then, keep the common baseline in the root and layer narrow
workspace overrides on top.

## Related

- [Monorepos](/recipes/monorepos/) - the single-ecosystem version of this pattern.
- [Ecosystems](/concepts/ecosystems/) - lockfile support and signal coverage by family.
- [Policy YAML](/usage/policy-yaml/) - ecosystem-prefix grammar.
