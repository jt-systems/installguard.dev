---
title: Nightly drift rescan
description: Re-check the committed installguard.lock on a schedule so new advisories or publisher changes do not wait for the next PR.
---

PR gates only evaluate the world as it looked when the PR ran. Registry
state, advisories, publisher metadata, and trust signals can all change
after merge.

The fix is a scheduled re-check against the committed
[`installguard.lock`](/usage/lock/):

1. Developers keep `installguard.lock` current in normal PRs.
2. A nightly workflow re-runs live evaluation with
   [`verify`](/usage/verify/) against that lock.
3. If the result drifts, the workflow opens or updates one rolling issue
   on `main` instead of spamming a new ticket every night.

This catches "clean yesterday, blocked today" cases such as:

- a new OSV / GHSA advisory landing after merge
- a package being deprecated or yanked
- publisher or provenance signals changing under the same locked version
- a stale `installguard.lock` that no longer matches the repo's current
  lockfile or policy

## Prerequisite

This pattern assumes the repo commits an up-to-date `installguard.lock`.
If you do not already generate one in CI, start with
[Air-gapped promotion](/recipes/air-gapped-promotion/) or add a normal
`installguard lock` step to your mainline pipeline.

## The workflow

```yaml
# .github/workflows/installguard-nightly.yml
name: InstallGuard nightly drift

on:
  schedule:
    - cron: "17 3 * * *"
  workflow_dispatch:

permissions:
  contents: read
  issues: write

jobs:
  drift:
    runs-on: ubuntu-latest
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
          key: installguard-${{ runner.os }}-${{ hashFiles('**/package-lock.json', '**/pnpm-lock.yaml', '**/yarn.lock', '**/uv.lock', '**/poetry.lock', '**/requirements.txt', '**/pyproject.toml', 'installguard.lock', 'installguard.yaml') }}
          restore-keys: |
            installguard-${{ runner.os }}-

      - name: Verify against committed lock
        id: verify
        run: |
          set +e
          installguard verify --against installguard.lock > verify.txt 2>&1
          echo "exit_code=$?" >> "$GITHUB_OUTPUT"
          exit 0

      - name: Render current summary
        if: steps.verify.outputs.exit_code != '0'
        run: |
          set +e
          installguard ci --summary-file summary.json
          ci_exit=$?
          set -e
          if [ -f summary.json ]; then
            installguard report \
              --from summary.json \
              --commit "$GITHUB_SHA" \
              --exit-code "${{ steps.verify.outputs.exit_code }}" \
              > drift.md
          else
            {
              echo "# InstallGuard drift on main"
              echo
              echo "Nightly verify failed and a fresh CI summary could not be rendered."
              echo
              echo "The verification log below is still enough to tell whether this was decision drift or digest drift."
            } > drift.md
          fi
          {
            echo
            echo "---"
            echo
            echo "Nightly verify detected drift relative to the committed \`installguard.lock\`."
            echo
            echo "A zero-block summary can still be a real failure here:"
            echo
            echo "- exit 1 = decision drift since the lock was generated"
            echo "- exit 2 = lockfile or policy digest drift"
            echo
            echo "\`\`\`text"
            cat verify.txt
            echo "\`\`\`"
          } >> drift.md

      - name: Open or update drift issue
        if: steps.verify.outputs.exit_code != '0'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          issue_number="$(gh issue list --state open --search 'InstallGuard drift on main in:title' --json number --jq '.[0].number // empty')"
          if [ -n "$issue_number" ]; then
            gh issue edit "$issue_number" --title "InstallGuard drift on main" --body-file drift.md
          else
            gh issue create --title "InstallGuard drift on main" --body-file drift.md
          fi

      - name: Close drift issue when clean
        if: steps.verify.outputs.exit_code == '0'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          issue_number="$(gh issue list --state open --search 'InstallGuard drift on main in:title' --json number --jq '.[0].number // empty')"
          if [ -n "$issue_number" ]; then
            gh issue close "$issue_number" --comment "Nightly verify is clean again on ${GITHUB_SHA}."
          fi

      - name: Upload diagnostics
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: installguard-nightly-drift
          path: |
            verify.txt
            summary.json
            drift.md
          if-no-files-found: ignore

      - name: Fail when drift exists
        if: steps.verify.outputs.exit_code != '0'
        run: exit 1
```

## Why use `verify` instead of just `scan`?

[`verify`](/usage/verify/) compares the current live evaluation to the
committed baseline snapshot.

That means the nightly job can tell the difference between:

- "the repo is blocked right now"
- and "the repo's recorded security snapshot is stale"

Both matter, but they mean different remediation paths.

## Response playbook

When the nightly job opens the issue:

1. Re-run `installguard verify` locally to confirm the drift.
2. If the verdict changed because the outside world changed, review the
   finding and either fix the dependency or intentionally update the
   policy.
3. If the verdict changed because `installguard.lock` is stale, refresh
   it with `installguard lock` and commit the new snapshot.

## Related

- [`lock`](/usage/lock/) - the baseline snapshot.
- [`verify`](/usage/verify/) - live drift detection.
- [GitHub Actions](/recipes/github-actions/) - per-PR gate on top of the nightly rescan.
