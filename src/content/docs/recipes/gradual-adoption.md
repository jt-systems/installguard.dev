---
title: Gradual adoption
description: Roll InstallGuard into an existing repo without turning day one into a wall of red CI.
---

InstallGuard is most effective when it becomes a normal part of every
pull request. The trap is trying to jump from "no policy at all" to
"strict block on every signal" in one merge. Existing repos usually need
one pass to separate real risk from known-good noise.

This recipe uses four stages:

1. Generate a reviewed baseline locally.
2. Merge an onboarding policy that still blocks the things you already care about.
3. Gate CI with a warn budget so new noise cannot grow unchecked.
4. Tighten the policy with [`simulate`](/usage/simulate/) before each ratchet.

## 1. Baseline locally

Start on a real lockfile from the repo's default branch:

```sh
# 1. See the raw findings.
installguard scan

# 2. Generate candidate allowlists / severity tweaks for review.
installguard doctor > proposed.yaml

# 3. Preview the effect before touching the real policy.
installguard simulate proposed.yaml
```

`doctor` is intentionally conservative: it suggests reviewed
`scripts.allow` entries, `nameSquatAllow` candidates, and explicit
severity overrides for classes that teams commonly demote during
adoption. It does **not** paper over obviously risky findings like
known-vulnerable or suspicious-script packages.

## 2. Commit an onboarding policy

Most teams do best with a temporary onboarding policy file that lives
next to the final one. That keeps the rollout explicit and makes the
ratchet easy to review in later PRs.

Example `.installguard/adopt.yaml`:

```yaml
policyVersion: 1

defaults:
  minimumReleaseAge: 1440
  minMaintainerAccountAgeDays: 30
  maxAdvisorySeverity: high

scripts:
  allow:
    - core-js
    - "@firebase/util"

severity:
  release-age-below-threshold: warn
  maintainer-new-account: warn
```

The shape above is the usual "warn first, then tighten" move:

- The thresholds are real from day one.
- Advisories at `high` and above still block immediately.
- Brand-new releases and brand-new publisher accounts are visible, but
  do not stop delivery while the team learns the signal.

Keep the temporary policy small. If a line cannot be defended in review,
do not add it just to make CI green.

## 3. Gate CI with a warn budget

Wire the onboarding policy into CI and set `--max-warn` to your current
warn count. That freezes the baseline: the existing known noise is
allowed, but new warnings fail the build.

```yaml
# install step / cache omitted for brevity
- name: Scan with onboarding policy
  run: |
    installguard ci \
      --policy .installguard/adopt.yaml \
      --max-warn 18 \
      --summary-file installguard-summary.json
```

This is the key adoption trick:

- `block` decisions still fail immediately.
- Existing warns stay visible in the summary.
- A PR that pushes the warn count above `18` now fails.

If the baseline is still noisy, start with a larger number and ratchet it
down every week or every sprint.

## 4. Tighten with simulate, not guesswork

When you want to promote a warning class back to `block`, preview the
change before merging it:

```sh
cp .installguard/adopt.yaml proposed.yaml

# Edit proposed.yaml:
# - remove one temporary severity demotion
# - tighten a threshold
# - or drop a reviewed allowlist entry you no longer need

installguard simulate proposed.yaml --policy .installguard/adopt.yaml
```

The output tells you exactly which packages would become newly blocked,
newly warned, or newly allowed. That keeps policy PRs reviewable and
prevents surprise breakage on the next CI run.

## 5. Exit onboarding

You're done with the onboarding phase when:

- `doctor` no longer proposes large blocks of policy changes.
- The warn budget has been ratcheted close to zero.
- Temporary `severity:` demotions have either been removed or are now
  intentional long-term policy.
- The repo can switch from `.installguard/adopt.yaml` to the normal
  `installguard.yaml` used by the standard
  [GitHub Actions recipe](/recipes/github-actions/) or
  [GitLab CI recipe](/recipes/gitlab-ci/).

At that point, move the final policy into `installguard.yaml` and delete
the temporary onboarding file.

## What not to do

- Do not bulk-paste `doctor` output without checking each package and
  each comment.
- Do not demote obviously dangerous classes just to make a dashboard
  green.
- Do not leave a warn budget permanently unowned. If a number exists, it
  should be trending down or be justified in the policy review.

## Related

- [`doctor`](/usage/doctor/) — propose the initial policy edits.
- [`simulate`](/usage/simulate/) — preview each ratchet safely.
- [Policy YAML reference](/usage/policy-yaml/) — every key and reason code.
