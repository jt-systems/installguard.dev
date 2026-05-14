---
title: Expo + monorepo case study
description: Taming an InstallGuard scan of a real 2,666-package Expo monorepo from 77 blocks to 0.
---

A real walk-through of running `installguard scan` against a 2,666-package npm-workspaces repo containing an Expo 54 mobile app, a Cloudflare Workers API, and a handful of internal packages. This is the same shape as a lot of modern React Native / full-stack monorepos and the findings are representative.

## The first scan

```text
✗ InstallGuard — BLOCKED
  2666 packages — 2589 allow · 0 warn · 77 block
```

77 blocks looked alarming. None were attacks. Working through them produced four releases (v0.1.7 through v0.1.10) and a small `installguard.yaml` for the repo. Here's the breakdown.

## What was actually being flagged

| Class | Count | Why |
|---|---|---|
| `signal-unavailable` for workspace members (`@acme/api`, `@acme/shared`, …) | 8 | npm v3 lockfile records workspace members with no `resolved` URL → adapter thought they were registry packages → 404. **Fixed in v0.1.8** via [workspace classification](/concepts/workspaces/). |
| `signal-unavailable` for `@upstash/redis@v1.35.1` and friends | ~6 | Lockfile recorded `version: 'v1.35.1'` (leading `v` from a GitHub-release-tag resolution); npm registry stores bare semver. **Fixed in v0.1.9** — the npm adapter now retries with `v` stripped when followed by an ASCII digit. |
| `signal-unavailable` for transient packument decode errors | ~4 | Real flaky-egress noise. **Demoted in v0.1.7** from default `block` to default `warn`. |
| `dist-tag-anomaly` for the entire Expo SDK 54 family | ~50 | Expo deliberately keeps `latest` on SDK 55 while SDK 56 stabilises. **Demoted in v0.1.6** from default `block` to default `warn` — backwards-moving `latest` is overwhelmingly LTS-line maintenance, not an attack. |
| `name-squat` for `gaxios` | 2 | Google's official HTTP client is Levenshtein-1 from `axios`. **Allowlist mechanism added in v0.1.10** (`defaults.nameSquatAllow`). |
| `disallowed-lifecycle-script` for `core-js`, `@firebase/util`, `dtrace-provider`, `protobufjs`, `unrs-resolver` | 6 | **Real findings.** Native bindings, polyfill banners, Firebase opt-out warnings. The package does declare an install-time script; you have to make a decision about it. |

## The final policy

After the four patches landed, the only remaining signal genuinely required operator input. This `installguard.yaml` is the one shipped to the repo:

```yaml
policyVersion: 1

defaults:
  # Google's official HTTP client. Levenshtein-1 from axios.
  # Allowlist is exact-match only — gaxios2 would still fire.
  nameSquatAllow:
    - gaxios

scripts:
  # Each entry below was reviewed against its current install script.
  # Re-review on major version bump.
  allow:
    - core-js               # postinstall prints a sponsor / opt-out banner
    - "@firebase/util"      # postinstall warns about analytics opt-out
    - dtrace-provider       # install builds the C addon (DTrace probes)
    - protobufjs            # postinstall compiles the minimal runtime
    - unrs-resolver         # install builds the napi-rs native addon
```

## The result

```text
! InstallGuard — Warnings
  2666 packages — 2606 allow · 60 warn · 0 block
```

Zero blocks. The 60 warns are the Expo SDK 54→55 dist-tag holds, which are now informational (visible in `installguard.lock` for the audit trail, never failing CI).

## Lessons for your own monorepo

1. **Don't disable signals — demote them.** The default severity table (see [Severity model](/concepts/severity/)) was rebuilt around the principle "block on evidence of compromise, warn on uncertainty". If a class of finding is too noisy for your repo, prefer `severity: warn` over removing it entirely — you keep the audit trail.
2. **Lifecycle scripts are the one class that needs a real review.** Every entry in your `scripts.allow` should have a comment explaining what the script actually does. Re-review on major version bumps; that's where new install-time behaviour sneaks in.
3. **Workspace members shouldn't appear at all.** If they do, your workspace shape isn't being detected — file an issue with a redacted lockfile snippet.
4. **`signal-unavailable` warnings are normal in CI** — public registries have transient failures. Only promote to `block` if you have a strict fail-closed posture.
