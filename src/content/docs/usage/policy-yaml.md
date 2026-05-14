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

## `scripts`

```yaml
scripts:
  policy: deny-by-default   # or allow-by-default
  allow:                    # extends the built-in default allowlist
    - my-private-tool
```

## `severity`

```yaml
severity:
  release-age-below-threshold: warn
  dist-tag-anomaly: block
  name-squat: block
```

Reason codes are kebab-case. The full set is enumerated in [Reference › Reason codes](/reference/reason-codes/).
