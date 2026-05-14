---
title: Reason codes
description: Stable identifiers for every reason InstallGuard can produce.
---

Every block / warn carries a kebab-case reason code. These codes are stable across patch releases; new variants only ever appear additively.

| Code | Meaning |
|---|---|
| `release-age-below-threshold` | Version published more recently than `defaults.minimumReleaseAge`. |
| `disallowed-lifecycle-script` | Package declares an install-time lifecycle script not in the allowlist. |
| `lifecycle-script-ignored` | Lifecycle script suppressed (`--ignore-scripts`); recorded as advisory only. |
| `suspicious-script` | Lifecycle script body matched a high-risk pattern. |
| `version-surface-change` | New `bin` entries or scripts vs. previous release. |
| `dist-tag-anomaly` | `latest` points to a strictly older major than the highest published. |
| `name-squat` | Package name is distance-1 from a popular package or uses homoglyphs. |
| `publisher-change` | Different npm account from the previous version. |
| `deprecated-version` | Maintainer marked this version deprecated. |
| `published-at-unknown` | Provider could not determine publish time. |
| `maintainer-new-account` | Publishing account younger than threshold. |
| `advisory-known` | OSV / GHSA advisory matches this `name@version`. |
| `provenance-missing` | Required provenance not present. |
| `trust-score-below-threshold` | Composite trust score below `minTrustScore`. |
| `license-disallowed` | SPDX licence not in `licenseAllowlist`. |
| `license-missing` | No licence recorded. |
| `archived-upstream` | Upstream repository is archived. |
| `scorecard-below-threshold` | OpenSSF Scorecard score below `minScorecardScore`. |
| `exotic-source` | Dependency resolved from git / tarball / file (not the registry). |
| `signal-unavailable` | A signal provider could not answer (404, 5xx, decode error, timeout). Default severity `warn` — see [Severity model](/concepts/severity/). |

Use these in the [`severity:` map](/usage/policy-yaml/#severity) to demote or promote individual reasons. The default verdict for each reason is documented in [Concepts › Severity model](/concepts/severity/).
