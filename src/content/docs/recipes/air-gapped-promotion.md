---
title: Air-gapped promotion
description: Generate an InstallGuard lock on a connected builder, then verify it later with zero provider network calls.
---

`installguard lock` plus `installguard verify --frozen` is the cleanest
way to separate **decision time** from **promotion time**.

The pattern is:

1. A connected build job performs a normal live evaluation and writes
   `installguard.lock`.
2. That lock is carried forward with the build artefacts.
3. A restricted promotion job re-checks the current repo against the
   recorded lock **without contacting registries, OSV, deps.dev, or
   Scorecard**.

This is the right fit for air-gapped CI, regulated release pipelines,
and environments where the final deploy stage is not allowed internet
egress.

## What `--frozen` proves

In `verify --frozen` mode, InstallGuard does **not** re-run providers. It
recomputes the lockfile and policy digests, compares them to the
recorded `installguard.lock`, and exits non-zero if they drifted.

That gives you two strong guarantees at promotion time:

- The lockfile being deployed is the same one that was evaluated
  earlier.
- The policy file being enforced is the same one that was evaluated
  earlier.

What it does **not** prove is "no new advisory landed since the lock was
generated." Keep a normal connected `scan`, `ci`, or default `verify`
step earlier in the pipeline for that.

## Connected stage

Run a normal CI evaluation first, then generate the lock snapshot:

```sh
# 1. Fail immediately if the current dependency graph blocks.
installguard ci --summary-file installguard-summary.json

# 2. Snapshot the exact evaluated state for downstream promotion.
installguard lock --out installguard.lock
```

Treat `installguard.lock` like any other build artefact: upload it,
store it with the release bundle, or pass it to the next pipeline stage.

## Restricted stage

In the offline or restricted environment, verify against the snapshot:

```sh
installguard verify --frozen --against ./installguard.lock
```

Expected outcomes:

- Exit `0`: the lockfile and policy match the recorded snapshot.
- Exit `2`: the lockfile or policy changed after the connected stage, so
  the release must not proceed.

## GitHub Actions example

This example uses a normal GitHub-hosted runner for the connected stage
and a `self-hosted` runner for promotion. Replace the second job with
whatever environment actually represents your restricted zone.

```yaml
# .github/workflows/installguard-promotion.yml
name: InstallGuard promotion

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  resolve:
    runs-on: ubuntu-latest
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

      - name: Live evaluation
        run: installguard ci --summary-file installguard-summary.json

      - name: Snapshot evaluated state
        run: installguard lock --out installguard.lock

      - name: Upload InstallGuard artefacts
        uses: actions/upload-artifact@v4
        with:
          name: installguard-evidence
          path: |
            installguard-summary.json
            installguard.lock

  promote:
    needs: resolve
    runs-on: self-hosted
    permissions:
      contents: read
    env:
      INSTALLGUARD_VERSION: v0.3.4
    steps:
      - uses: actions/checkout@v4

      - name: Download InstallGuard artefacts
        uses: actions/download-artifact@v4
        with:
          name: installguard-evidence
          path: .installguard-artifacts

      - name: Install InstallGuard
        run: |
          curl -fsSL "https://github.com/jt-systems/installguard/releases/download/${INSTALLGUARD_VERSION}/installguard-x86_64-unknown-linux-musl" \
            -o /usr/local/bin/installguard
          chmod +x /usr/local/bin/installguard

      - name: Verify offline snapshot
        run: installguard verify --frozen --against .installguard-artifacts/installguard.lock
```

## Operational notes

- `--frozen` guarantees zero provider calls from InstallGuard, but it
  does not magically disable network access for the runner itself. If
  you need a hard air-gap, enforce that at the runner or firewall layer.
- Keep the same source commit across both stages. If the promotion job
  checks out a different revision, digest drift is the correct outcome.
- Pin the InstallGuard version in both jobs so the promotion path is
  reproducible.

## Next step: signed bundles

If you need a cryptographically signed handoff rather than a plain lock
artifact, the next step is:

1. [`attest`](/usage/attest/) the evaluation result.
2. [`sign`](/usage/sign/) the statement.
3. Verify downstream with [`verify --bundle`](/usage/verify/).

That adds signer identity to the same promotion flow.

## Related

- [`lock`](/usage/lock/) — produce the snapshot.
- [`verify`](/usage/verify/) — downstream verification modes.
- [`attest`](/usage/attest/) and [`sign`](/usage/sign/) — signed handoff variant.
