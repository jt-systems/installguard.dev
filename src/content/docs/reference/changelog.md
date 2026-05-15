---
title: Changelog
description: What shipped in each InstallGuard release.
---

The canonical changelog lives in the repo at [`CHANGELOG.md`](https://github.com/jt-systems/installguard/blob/main/CHANGELOG.md). This page mirrors the user-facing highlights.

## 0.1.17 — 2026-05-15

**Cache invalidation, finally automatic.** Every on-disk cache entry now stamps the producing tool's version on write; on read, a mismatch drops the entry just like a schema mismatch. Closes the historical foot-gun where signal-shape changes that shipped between explicit schema bumps left users hand-running `rm -rf ~/Library/Caches/installguard` after every upgrade. Legacy entries written by 0.1.16 and earlier auto-flush on first read under 0.1.17 — you get a clean slate on the upgrade.

New [`installguard cache`](/usage/troubleshooting/#i-upgraded-installguard-and-a-packages-signals-look-stale) subcommand for inspection and manual control:

* `installguard cache path` — prints the resolved cache directory.
* `installguard cache info` — per-status breakdown (fresh / stale by version / stale by schema / unreadable) plus the running tool version.
* `installguard cache clear` — drops every entry; the next `scan` refetches signals from the network.

All three honour `--cache-dir` for parity with `scan`.

## 0.1.16 — 2026-05-15

Type-system placeholders for the upcoming PyPI adapter ([ROADMAP M8](https://github.com/jt-systems/installguard/blob/main/ROADMAP.md)). The core crate now ships an `Ecosystem::Pypi` variant and a `Source::Pypi { url }` variant; neither is emitted by any adapter today. They exist so downstream `match` arms over `Ecosystem` and `Source` are forced to handle PyPI *before* the adapter starts producing them — trading a small amount of "hot lava" today for a much smoother adapter rollout when M8 lands.

`Source::Pypi` is treated as non-exotic alongside `Source::Registry` and `Source::Workspace` (PyPI is a first-party registry source). A PyPI-ecosystem `ResolvedDependency` produces the cache key `pypi/<name>@<version>`, matching the [ecosystem-prefix grammar](/usage/policy-yaml/#ecosystem-prefix-grammar) shipped in 0.1.15.

No user-facing CLI behaviour changes.

## 0.1.15 — 2026-05-15

Policy allowlists now accept an optional [ecosystem-prefix grammar](/usage/policy-yaml/#ecosystem-prefix-grammar). Bare entries (`gaxios`, `my-pkg`) keep working unchanged and match a package of that name in any registry family — every existing 0.1.x policy is unaffected. New prefixed entries scope the allow to one family: `npm:lodash` matches only npm-family packages (npm/pnpm/yarn), and `pypi:requests` parses today as forward-compat for the upcoming PyPI adapter ([ROADMAP M8](https://github.com/jt-systems/installguard/blob/main/ROADMAP.md)). The grammar applies to `defaults.nameSquatAllow` and `scripts.allow`; scoped npm names (`@scope/name`, `npm:@scope/name`) work in both forms.

Unknown family prefixes (`pypy:lodash`, `gem:rails`) fail policy load loudly rather than silently allowing nothing.

Internally, the dependency cache key now derives from the package's *registry family* rather than a hardcoded `"npm"` literal — paving the way for `pypi/<name>@<version>` keys without further core changes when the PyPI adapter lands.

## 0.1.14 — 2026-05-15

New [`installguard simulate`](/usage/simulate/) subcommand. Runs the same evaluation pipeline as [`scan`](/usage/scan/) once against the project's *current* policy, then re-evaluates every dependency against a *candidate* policy YAML using the **same signals** (no second network round-trip), and prints the per-package decision diff: which packages would be newly blocked, newly warned, newly allowed, or have their reasons change while staying in the same decision class. Pretty output groups by class with a `+`/`-` reason-code delta per package; `--format json` emits a stable machine-readable shape (`schemaVersion: 1`) with per-change before/after `details` and `reasonCodes`. Always exits `0` — simulate is advisory; gating belongs in `scan` or `ci`. Completes the [`explain`](/usage/explain/) (why was this blocked?) / [`doctor`](/usage/doctor/) (what should I add?) / `simulate` (what would happen if I added this?) triad — the propose → preview → merge loop for policy changes without spinning up a scratch repo or a network re-fetch.

`--frozen` is rejected with a clear error: the lock stores decisions, not raw signals, so a candidate policy cannot be re-evaluated against it.

## 0.1.13 — 2026-05-15

New [`installguard explain`](/usage/explain/) subcommand. Runs the same evaluation pipeline as `scan` / `doctor`, but for one `name@version` coordinate already present in the lockfile, prints the full per-package audit trail: every signal observed (rendered as compact JSON, one per line, so every variant round-trips losslessly), every reason produced (with stable kebab-case code, human summary, and remediation hint), and the trust-score breakdown with each weighted contribution and rationale. Pretty output is the default; `--format json` emits a stable machine-readable shape (`schemaVersion: 1`) suitable for piping into tooling. Always exits `0` — explain is informational; gating belongs in `scan` or `ci`. Pairs naturally with [`doctor`](/usage/doctor/) (0.1.12), which tells you *what* to allow.

`dist-tag-anomaly` heuristic tightened with three new suppressions, all driven by false positives observed on real production lockfiles. **Sentinel filter**: versions with `major >= 999` are dropped from the `highest_published` candidate set — `react-native` publishes `1000.0.0` precisely to break `npm install react-native@latest`, and treating it as the highest produced a guaranteed false positive for every RN lockfile. **User-bypass at-or-past max**: if the resolved dep version is itself `>= highest_published`, the operator has pinned past `latest` deliberately (e.g. `accepts@2.0.0` while `latest=1.3.8` during a cautious 2.x rollout). **User-bypass below latest major**: if the resolved dep version is on a major *older* than `latest`, the operator has explicitly stepped off the `latest` train (e.g. `@expo/cli@54.0.24` while Expo SDK 55 is `latest` and SDK 56 is published). The structural cross-major case within the user's major remains the high-precision pattern still surfaced.

Default `scripts.allow` gains `core-js` and `protobufjs`. Both are the postinstall-runs-helper-script pattern (same shape as `esbuild`, `playwright`, `supabase`) and satisfy the existing inclusion criteria — tens of millions of weekly downloads each, single well-understood install purpose, no historical takeover advisory tied to the install script. User-supplied `scripts.allow` continues to extend (not replace) the built-in default.

## 0.1.12 — 2026-05-14

New [`installguard doctor`](/usage/doctor/) subcommand. Runs the same evaluation pipeline as `scan`, but instead of printing a verdict it groups the actionable findings by class and emits a ready-to-paste `installguard.yaml` block that resolves the false positives we have a known fix for: lifecycle-script blocks become a `scripts.allow` list (commented with the scripts seen so reviewers can vet before allowing), name-squat blocks become a `defaults.nameSquatAllow` list (commented with the package each one resembles), and `dist-tag-anomaly` / `signal-unavailable` blocks become explicit `severity: warn` overrides (their default since 0.1.6 / 0.1.7 — surfacing this means the operator had locally promoted them). Doctor is advisory only — it always exits `0`; use `scan` or `ci` to gate. Closes the "blocked → triage → write config" loop into a single command for first-time adopters.

## 0.1.11 — 2026-05-14

Default `scripts.allow` gains `supabase`. The npm-distributed Supabase CLI is the postinstall-downloads-platform-binary pattern (same shape as `esbuild`, `playwright`, `@biomejs/biome`): the script genuinely needs to run for the package to function, and it satisfies the existing inclusion criteria — well over 1M weekly downloads, single well-understood install purpose (fetch the platform-appropriate CLI binary from GitHub Releases and install it into `node_modules/.bin`), no historical takeover advisory tied to the install script. User-supplied `scripts.allow` continues to extend (not replace) the built-in default.

## 0.1.10 — 2026-05-14

`defaults.nameSquatAllow` allowlist for the name-squat detector. Levenshtein-1 catches typosquats but also produces false positives for legitimate packages whose names happen to sit near a popular one — most visibly `gaxios` (Google's HTTP client) being flagged against `axios`. Operators can now suppress specific names without disabling the detector globally.

```yaml
defaults:
  nameSquatAllow: [gaxios]
```

Allowlist is exact-match only — typo-of-an-allowlisted-name still fires.

## 0.1.9 — 2026-05-14

Registry lookup tolerates `v`-prefixed lockfile versions. Some lockfiles record `version: 'v1.35.1'` when npm/yarn resolved against a GitHub release tag; the registry stores bare semver, so the literal lookup missed every time and surfaced as `signal-unavailable`. The provider now retries with the leading `v` stripped (only when followed by an ASCII digit, so `velocity` is unaffected). Lockfile-fidelity is preserved in audit output; only the lookup is normalized.

## 0.1.8 — 2026-05-14

Workspace-aware policy. npm v3+ lockfiles record workspace members at their on-disk path with no `resolved` URL — these were being treated as private registry packages and producing one `signal-unavailable` per member. The npm adapter now classifies them as `Source::Workspace`, the CLI skips signal gathering, and `Policy::evaluate` short-circuits to `Allow`. See [Concepts › Workspaces](/concepts/workspaces/).

## 0.1.7 — 2026-05-14

`signal-unavailable` default severity demoted from `block` to `warn`. A provider failing to answer is not evidence of compromise. Operators who want strict-fail-closed semantics can promote with `severity.signal-unavailable: block`.

## 0.1.6 — 2026-05-14

`dist-tag-anomaly` default severity demoted from `block` to `warn`. A backwards-moving `latest` is structurally unusual but most often indicates a maintainer running an LTS line as `latest` while a newer major exists on a separate tag.

## 0.1.5 — 2026-05-14

Bugfix: the per-reason `↳` remediation hint promised in 0.1.4 was wired into `Reason::remediation()` but never rendered. Restored, so each finding now actually prints its hint immediately under the bullet.

## 0.1.4 — 2026-05-14

Scan UX: actionable next-steps. Each finding carries a one-line remediation hint specific to its signal class, and pretty output ends with a generic "Next steps" footer pointing at investigation, allowlisting, freezing, and reporting paths.

## 0.1.3 — 2026-05-14

Scan UX: live progress indicator. A small Braille spinner ticks on stderr at 10 Hz with a `done/total` counter during the signal-gather phase. Suppressed when stderr isn't a TTY and when `NO_COLOR` is set.

## 0.1.2 — 2026-05-14

Cuts ~21 false-positive blocks from the same real-world 1,276-package scan that 0.1.1 drove down from ~120 to ~21. Default `scripts.allow` now includes a curated set of well-known native-binary / asset-bootstrap packages: `bcrypt`, `cypress`, `electron`, `esbuild`, `fsevents`, `msw`, `node-gyp`, `node-pre-gyp`, `playwright`, `puppeteer`, `sharp`. `DistTagAnomaly` no longer fires for same-major patch / minor drift. On-disk cache schema bumped so v0.1.1 fixes take effect on machines with populated caches.

## 0.1.1 — 2026-05-14

First maintenance release. Reduces noise from real-world scans, fixes a packument decode regression that affected the React 19 family, and ships the new `installguard report` subcommand.

## 0.1.0 — 2026-05-13

First tagged alpha. Covers milestones M0 through M4 from the [roadmap](https://github.com/jt-systems/installguard/blob/main/ROADMAP.md) — lockfile parsing, signal providers, policy DSL, evidence outputs (CycloneDX SBOM, in-toto attestations, OpenVEX), publisher/provenance signals, OSV/deps.dev/Scorecard providers, and the public `SignalProvider` trait.
