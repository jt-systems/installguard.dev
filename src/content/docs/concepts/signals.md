---
title: Signals
description: The trust facts InstallGuard collects about every package.
---

A **signal** is a single fact about a `(name, version)` pair, produced by a `SignalProvider`. The policy engine maps signals to a decision. This page enumerates the signals InstallGuard ships with today.

| Signal | What it means | Source |
|---|---|---|
| `published_at` | When this version was first published | npm registry |
| `lifecycle_scripts` | `preinstall` / `install` / `postinstall` / `preuninstall` / `postuninstall` declared | npm registry |
| `suspicious_script` | Lifecycle script body matched a high-risk pattern | static analysis of script source |
| `version_surface_change` | New `bin` entries or lifecycle scripts vs. previous release | npm registry diff |
| `dist_tag_anomaly` | `latest` points at a strictly older major than the highest published | npm registry |
| `publisher_change` | Different `_npmUser` than the previous version | npm registry |
| `deprecated_version` | Maintainer marked this version deprecated | npm registry |
| `name_squat` | Distance-1 typo or homoglyph match against the popular-package list | local heuristic |
| `maintainer_new_account` | The publishing npm account is younger than the configured threshold | npm registry |
| `advisory_known` | Advisory matches this exact name@version | OSV |
| `provenance_claimed` | npm provenance bundle present and digest matches the tarball | npm registry |
| `project_metadata` | Licences and archived flag from a third-party catalogue | deps.dev |
| `scorecard_score` | OpenSSF Scorecard aggregate score for the upstream repo | scorecard.dev |
| `unavailable` | A provider could not produce signals for this package | provider |

Signals are *facts*, not *judgements*. Whether a signal becomes a `Reason` (and at what severity) is determined by [the policy](/concepts/policy/).
