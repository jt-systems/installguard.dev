---
title: Severity model
description: Why InstallGuard blocks some signals and only warns on others — and how to override either way.
---

InstallGuard's verdict for a package is the **maximum severity** of every reason that fired against it. A single `block` reason is enough to fail the install; if every reason is `warn`, the install proceeds with the warning recorded in `installguard.lock`.

Each reason ships with a **default severity** chosen on a single principle:

> Block when the signal is structurally **evidence of compromise**.
> Warn when the signal is **uncertainty, hygiene, or operator‑intent territory**.

## Default `block` reasons

These are the signals where the structural fingerprint is hard to explain away:

| Reason code | Why it blocks |
|---|---|
| `disallowed-lifecycle-script` | Code that runs at install time without your approval. |
| `suspicious-script` | Lifecycle script body matches a known-malicious pattern (curl-pipe-shell, base64 exec, etc.). |
| `name-squat` | Distance‑1 from a high-traffic name, or homoglyph. The `nameSquatAllow` list narrows this. |
| `publisher-change` | New maintainer account on an established package — the typical hijack signature. |
| `maintainer-new-account` | Publisher account is younger than your threshold. |
| `version-surface-change` | New `bin` entries or new install scripts vs. the previous release. |
| `advisory-known` | OSV / GHSA match at or above your `maxAdvisorySeverity`. |
| `provenance-missing` | You require provenance and this version doesn't have it. |
| `release-age-below-threshold` | Version is younger than your cooling-off window. |
| `deprecated-version` | Maintainer explicitly marked this version deprecated. |
| `license-disallowed`, `license-missing`, `archived-upstream` | Hygiene gates you opted into. |
| `trust-score-below-threshold`, `scorecard-below-threshold` | Composite gates you configured. |
| `exotic-source` | Dependency resolved from git / tarball / file (not the registry). |

## Default `warn` reasons

These signals are real and worth surfacing, but they fire often enough on legitimate packages that blocking by default would generate more noise than safety:

| Reason code | Why it only warns |
|---|---|
| `lifecycle-script-ignored` | Recorded as advisory only when scripts ran with `--ignore-scripts`. Nothing actually executed. |
| `dist-tag-anomaly` | A backwards-moving `latest` is most often LTS-line maintenance (Storybook 8.x as `latest` while 9.x rides `next`; Expo holding `latest=55` while 56.x stabilises). The cross-major case is the one signal worth your attention; promote with `severity:` if you treat every backwards tag as suspect. |
| `signal-unavailable` | A provider failing to answer — npm 404, OSV 503, packument decode error, transient network — is **absence of evidence, not evidence of attack**. Promote to `block` for fail-closed CI semantics. |

## Promoting or demoting

Override any default in `installguard.yaml` via the `severity:` map:

```yaml
policyVersion: 1
severity:
  # Treat backwards-moving latest as a hard block
  dist-tag-anomaly: block
  # Fail closed if any provider can't answer
  signal-unavailable: block
  # Tolerate brand-new maintainer accounts on direct deps you trust
  maintainer-new-account: warn
```

Reason codes are kebab-case and stable across patch releases. The full list is in [Reference › Reason codes](/reference/reason-codes/).

## How verdicts compose

```
For each package P:
  reasons = [r for r in all_signals(P) if r.fires(policy)]
  severities = [policy.severity_for(r) for r in reasons]
  decision = max(severities, default=allow)   # allow < warn < block
```

This is intentionally simple. There is no scoring, no weighting, no "if two warns then block" — every block is justifiable by pointing at one specific reason.
