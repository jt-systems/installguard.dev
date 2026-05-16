---
title: InstallGuard in GitHub Actions
description: Run InstallGuard in GitHub Actions as a minimal read-only gate, or add a sticky PR comment when your token can write.
---

Two integration shapes cover most teams:

1. **Minimal gate** — the safest default. Read-only token, pinned binary, JSON summary uploaded as an artifact.
2. **PR comment workflow** — the same gate plus a sticky PR comment. Use this only when the workflow token can write back to the PR.

## Minimal gate

This is the best starting point for most repos, especially if you accept
fork PRs or rely on Dependabot. It fails the build on blocked
dependencies and always preserves the machine-readable summary.

```yaml
# .github/workflows/installguard.yml
name: InstallGuard

on:
  pull_request:
  push:
    branches: [main]

jobs:
  scan:
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

      - name: Scan
        run: installguard ci --summary-file installguard-summary.json

      - name: Upload summary
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: installguard-summary
          path: installguard-summary.json
          if-no-files-found: ignore
```

## PR comment workflow

If your PR runs have a write-capable `GITHUB_TOKEN`, swap in this
variant. It uses the same scan but delays the final failure so the
rendered report can still be posted to the PR.

```yaml
# .github/workflows/installguard.yml
name: InstallGuard

on:
  pull_request:
  push:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
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

      - name: Scan
        id: scan
        run: |
          set +e
          installguard ci --summary-file summary.json
          echo "exit_code=$?" >> "$GITHUB_OUTPUT"
          exit 0

      - name: Render comment
        if: github.event_name == 'pull_request'
        run: |
          installguard report \
            --from summary.json \
            --commit "${{ github.event.pull_request.head.sha }}" \
            --exit-code "${{ steps.scan.outputs.exit_code }}" \
            > comment.md

      - name: Post comment
        if: github.event_name == 'pull_request'
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: comment.md

      - name: Fail on block
        if: steps.scan.outputs.exit_code != '0'
        run: exit 1
```

## When does the comment variant work?

- Same-repo PRs are the easy case: `pull-requests: write` is usually enough.
- Dependabot PRs and fork PRs often receive a read-only `GITHUB_TOKEN` unless the repo owner explicitly enables write tokens for those runs.
- Do not switch to `pull_request_target` and then check out or execute PR code just to post a comment. Keep the security decision on `pull_request`; if you need comments for untrusted PRs, use a separate trusted follow-up workflow that only reads the summary artifact and posts the comment.

## Why split scan and fail?

Splitting the scan from the failure step lets the comment post even when
the scan blocks. Otherwise the workflow fails before the comment job
runs, and reviewers don't see *why* it failed without digging into the
logs.

## Version pinning

Pin to a release tag in production. Floating `releases/latest` is useful
during evaluation, but it makes CI behaviour non-reproducible and can
change underneath a branch with no workflow diff.

If the same workflow also installs dependencies, add your package-manager
cache separately (`actions/setup-node`, `actions/setup-python`, uv's
cache, etc.). InstallGuard itself only needs the lockfile and its own
signal cache.
