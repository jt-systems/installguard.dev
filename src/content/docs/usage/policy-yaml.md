---
title: Policy YAML reference
description: Full reference for installguard.yaml.
---

The canonical reference is the JSON schema generated from the Rust source:
[`policy.schema.json`](https://github.com/jt-systems/installguard/blob/main/policy.schema.json).

Point your editor at it for auto-completion and inline validation.

## Top-level keys

| Key | Type | Notes |
|---|---|---|
| `policyVersion` | int | Currently `1`. Required. |
| `defaults` | object | Applies to every dependency. |
| `direct` | object | Overrides for direct dependencies only. |
| `scripts` | object | Lifecycle script policy. |
| `severity` | map<reason-code, allow\|warn\|block> | Demote / promote individual reasons. |

## `defaults` / `direct` shared keys

| Key | Type | Default | Meaning |
|---|---|---|---|
| `minimumReleaseAge` | minutes | `0` | Block versions newer than this. 1440 = 24h is a common starting point. |
| `flagDeprecated` | bool | `true` | Block deprecated versions. |
| `detectVersionSurfaceChange` | bool | `false` | Flag new `bin`/script entries vs. prior release. |
| `minMaintainerAccountAgeDays` | int | `0` | Block versions published by accounts younger than this. |
| `requireProvenance` | bool | `false` | Block packages without npm provenance. |
| `minTrustScore` | 0–100 | `0` | Block packages with composite trust below threshold. |
| `maxAdvisorySeverity` | low\|medium\|high\|critical | `critical` | Block on advisories at or above this severity. |
| `requireLicense` | bool | `false` | Block when no SPDX expression is recorded. |
| `licenseAllowlist` | string[] | `[]` | When non-empty, only these SPDX expressions are allowed. |
| `blockArchived` | bool | `false` | Block packages whose upstream repo is archived. |
| `minScorecardScore` | 0–10 | `0` | Block packages with OpenSSF Scorecard below threshold. |
| `nameSquatAllow` | string[] | `[]` | Exact-match allowlist for the name-squat detector. Names listed here will not produce a `name-squat` reason even when they are Levenshtein-1 from a popular package. Added in 0.1.10. |

## `scripts`

Lifecycle scripts that run at install time (`preinstall`, `install`, `postinstall`) are denied by default. The built-in allowlist already covers well-known native-binary packages: `bcrypt`, `cypress`, `electron`, `esbuild`, `fsevents`, `msw`, `node-gyp`, `node-pre-gyp`, `playwright`, `puppeteer`, `sharp`, `supabase`. The user-supplied `scripts.allow` **extends** (not replaces) the built-in default.

```yaml
scripts:
  policy: deny-by-default   # or allow-by-default
  allow:
    # Each entry below was reviewed against its current install script.
    # Re-review on major version bump.
    - core-js               # postinstall prints a sponsor / opt-out banner
    - "@firebase/util"      # postinstall warns about analytics opt-out
    - dtrace-provider       # install builds the C addon
    - protobufjs            # postinstall compiles the minimal runtime
    - unrs-resolver         # install builds the napi-rs native addon
    - my-private-tool       # internal — postinstall syncs an asset bundle
```

## `severity`

Demote or promote individual reasons. See [Concepts › Severity model](/concepts/severity/) for the default verdict table and the principle behind it.

```yaml
severity:
  # Tighten:
  dist-tag-anomaly: block        # default warn
  signal-unavailable: block      # default warn — fail-closed CI
  # Loosen:
  release-age-below-threshold: warn
  maintainer-new-account: warn
```

Reason codes are kebab-case. The full set is enumerated in [Reference › Reason codes](/reference/reason-codes/).

## Worked example: a real monorepo

The minimum policy that takes a 2,666-package Expo + Cloudflare Workers monorepo from 77 blocks to 0:

```yaml
policyVersion: 1

defaults:
  nameSquatAllow:
    - gaxios                # Google's HTTP client (Levenshtein-1 from axios)

scripts:
  allow:
    - core-js
    - "@firebase/util"
    - dtrace-provider
    - protobufjs
    - unrs-resolver
```

Full walk-through: [Recipes › Expo + monorepo case study](/recipes/expo-monorepo/).
