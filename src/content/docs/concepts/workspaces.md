---
title: Workspaces
description: How InstallGuard handles workspace members in npm / pnpm / yarn monorepos.
---

InstallGuard treats workspace members — your own packages, declared in your repo and resolved on disk — as **first-party code** and short-circuits to `Allow` without consulting any registry-shaped detector. Typosquat / publisher / lifecycle-script signals are about *what arrived from the registry*; they have nothing useful to say about code you wrote.

## How they're detected

Each lockfile dialect records workspace members differently:

- **npm** (`package-lock.json` v3+) — workspace members appear at their on-disk path (e.g. `apps/api`) inside `packages:` with a `name` and `version` but **no** `resolved` URL. The npm adapter (added in v0.1.8) classifies any entry whose key does not start with `node_modules/` as `Source::Workspace`.
- **yarn** (`yarn.lock` Berry) — workspace members carry a `workspace:` resolution. Already classified correctly since v0.1.0.
- **pnpm** (`pnpm-lock.yaml`) — workspace members live in the top-level `importers:` map and never appear in `packages:`. They were never visible to InstallGuard's package walker.

## What's skipped

Once a dependency is `Source::Workspace`:

1. The CLI's signal-gather phase skips the package entirely — no network call goes out.
2. `Policy::evaluate` returns `Decision::Allow` immediately, with no reasons attached.
3. The package still appears in the `allow` count of the summary.

## Why this matters

Before v0.1.8, an npm monorepo with N workspace members produced N `signal-unavailable` findings — the public registry returned `HTTP 404` for the private name `@your-org/api`. With `signal-unavailable` defaulting to `block` (the pre-v0.1.7 default) this could turn a clean repo into "every CI run is red".

Today the same scan reports nothing for those packages, by design. If you need the *public* dependencies of a workspace member audited in isolation, scan the workspace's own lockfile (or use the per-package recipe in [Recipes › Monorepos](/recipes/monorepos/)).

## What still gets scanned

Everything *transitive* — every public dependency reached via a workspace member's `package.json` is parsed out of the root lockfile and evaluated normally. The short-circuit only applies to the workspace members themselves.
