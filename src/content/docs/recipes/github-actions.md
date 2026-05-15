---
title: InstallGuard in GitHub Actions
description: Run InstallGuard in GitHub Actions on every pull request, fail builds on blocked dependencies, and post a sticky risk summary.
---

A complete workflow that:

1. Caches the InstallGuard signal cache.
2. Runs `installguard ci` and produces a JSON summary.
3. Posts (and updates) a sticky comment on the PR with the verdict.

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
    steps:
      - uses: actions/checkout@v4

      - name: Install InstallGuard
        run: |
          curl -L https://github.com/jt-systems/installguard/releases/latest/download/installguard-x86_64-unknown-linux-musl \
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

## Why split scan and fail?

Splitting the scan from the failure step lets the comment post even when the scan blocks. Otherwise the workflow fails before the comment job runs, and reviewers don't see *why* it failed without digging into the logs.

If the same workflow also installs dependencies, add your package-manager
cache separately (`actions/setup-node`, `actions/setup-python`, uv's
cache, etc.). InstallGuard itself only needs the lockfile and its own
signal cache.
