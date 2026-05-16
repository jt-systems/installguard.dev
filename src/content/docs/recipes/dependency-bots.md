---
title: Dependency bots (Dependabot & Renovate)
description: Gate bot-authored dependency-bump PRs through InstallGuard before they auto-merge.
---

Dependabot and Renovate ship dependency upgrades as pull requests.
That's exactly the right control point to insert InstallGuard: the bump
is already a reviewable diff, the lockfile is updated, and the PR has CI
attached. Adding InstallGuard to that pipeline means a typosquat or a
freshly-takeover'd transitive dep can't sneak in via a routine
"chore(deps)" PR.

This recipe sets up two things:

1. A **scoped scan workflow** that only runs on bot-authored PRs touching manifest/lockfile paths.
2. An **optional write-enabled follow-up** that adds PR comments and automerge once your repo settings allow bot PR workflows to write back.

## The workflow

Drop this at `.github/workflows/installguard-bot-prs.yml` on your
default branch:

```yaml
# .github/workflows/installguard-bot-prs.yml
name: InstallGuard (bot PRs)

on:
  pull_request:
    paths:
      - "**/package.json"
      - "**/pyproject.toml"
      - "**/package-lock.json"
      - "**/pnpm-lock.yaml"
      - "**/yarn.lock"
      - "**/uv.lock"
      - "**/poetry.lock"
      - "**/requirements.txt"

permissions:
  contents: read

jobs:
  scan:
    if: >-
      github.event.pull_request.user.login == 'dependabot[bot]' ||
      github.event.pull_request.user.login == 'renovate[bot]'
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

This baseline is intentionally read-only. That's the most portable setup
for bot PRs because Dependabot and fork-style runs often do **not** get a
write-capable `GITHUB_TOKEN` by default.

## Why a separate workflow file?

Three reasons:

* **Bots can't edit the gate.** Dependabot PRs run with the workflow file from the *target* branch (`main`), not the PR's branch — so a malicious bump that tried to weaken the gate by patching the workflow file would be ignored. Putting the gate in a workflow that lives on `main` is the security-correct posture.
* **Tight path scoping.** The `paths:` filter means human PRs that only touch source code don't get re-scanned by this workflow. Your broad `installguard.yml` workflow handles those.
* **Composable follow-ups.** Splitting the bot-PR gate out makes it trivial to add comments or automerge later without entangling it with the broad PR scan.

## Optional: add a sticky comment when bot PRs can write

If your repository explicitly allows write tokens for bot PR workflows,
replace the tail of the `scan` job with the same split scan/report/fail
pattern as the main [GitHub Actions recipe](/recipes/github-actions/):

```yaml
permissions:
  contents: read
  pull-requests: write

jobs:
  scan:
    steps:
      # ... checkout / install / cache unchanged ...

      - name: Scan
        id: scan
        run: |
          set +e
          installguard ci --summary-file summary.json
          echo "exit_code=$?" >> "$GITHUB_OUTPUT"
          exit 0

      - name: Render comment
        run: |
          installguard report \
            --from summary.json \
            --commit "${{ github.event.pull_request.head.sha }}" \
            --exit-code "${{ steps.scan.outputs.exit_code }}" \
            > comment.md

      - name: Post comment
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: installguard-bot-prs
          path: comment.md

      - name: Fail on block
        if: steps.scan.outputs.exit_code != '0'
        run: exit 1
```

## Optional: gate Dependabot automerge on a clean InstallGuard verdict

Add this as a second job in the same workflow file once bot PR runs have
write-capable tokens. It only runs after `scan` succeeds and only
enables automerge for patch & minor bumps — major upgrades still get
human review.

```yaml
  automerge:
    needs: scan
    if: github.event.pull_request.user.login == 'dependabot[bot]'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - name: Fetch metadata
        id: meta
        uses: dependabot/fetch-metadata@v2

      - name: Enable automerge for patch & minor
        if: >-
          steps.meta.outputs.update-type == 'version-update:semver-patch' ||
          steps.meta.outputs.update-type == 'version-update:semver-minor'
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The `automerge` job is intentionally Dependabot-only. Renovate has its
own first-class [automerge
config](https://docs.renovatebot.com/configuration-options/#automerge)
— set `automerge: true` per-package-rule in `renovate.json` and
Renovate will respect required status checks (including this
InstallGuard workflow) before merging.

## Renovate config example

A minimal `renovate.json` that automerges patch updates only after all
required checks (including InstallGuard) pass:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "packageRules": [
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "pr",
      "platformAutomerge": true
    }
  ]
}
```

Mark the `InstallGuard (bot PRs)` workflow as a **required** status
check in your branch protection rules. Without that, automerge will
happily merge before the gate's verdict lands.

## What you've built

* Bot bumps that introduce a flagged dependency get blocked at the PR — never reaching `main`, never installed by humans pulling latest.
* Bot bumps that are clean against your policy auto-merge with no human in the loop, keeping `main` close to head on transitive deps.
* The InstallGuard cache is shared with your broad scan workflow via `~/.cache/installguard`, so bot PRs hit warm signals and finish in seconds.

## Caveats

* The `if:` user-login filter assumes default usernames. If you self-host Dependabot or use a custom Renovate runner, adjust the logins accordingly.
* Comment posting and automerge need a write-capable token. If your bot PR runs stay read-only, keep the baseline scan-only gate and move write actions into a separate trusted follow-up workflow.
* `dependabot/fetch-metadata` only works for genuine Dependabot PRs; if you want similar logic for Renovate, gate on Renovate's [`commitMessageAction`](https://docs.renovatebot.com/configuration-options/#commitmessageaction) or parse the PR title.
* Major-version bumps still need human review — InstallGuard tells you whether the *new* artifact is risky, but not whether the API change is safe to absorb.
