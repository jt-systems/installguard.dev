---
title: Ecosystems
description: How InstallGuard supports npm-family and PyPI projects, what's gated where, and what's deferred.
---

InstallGuard is one tool that gates dependencies for two ecosystem
families today: the **npm family** (npm, pnpm, yarn) and **PyPI**
(uv, pip-compile). Both go through the same policy engine and
produce the same shape of decisions, lockfile, SBOM, and
attestation. This page is the source of truth for what's gated
where.

## Supported lockfiles

| Lockfile | Adapter | Since | Notes |
|---|---|---|---|
| `package-lock.json` | npm | 0.1.0 | npm v6+ format. |
| `pnpm-lock.yaml` | pnpm | 0.1.0 | Lockfile v6 + v9. |
| `yarn.lock` | yarn | 0.1.0 | Berry v1; classic v0 read-only. |
| `uv.lock` | pypi | 0.2.0 | TOML schema v1, the canonical [uv](https://docs.astral.sh/uv/) lockfile. |
| `requirements.txt` | pypi | 0.2.0 | **Only when generated with hashes** (`uv pip compile --generate-hashes` or `pip-compile --generate-hashes`). Hash-less files are rejected — a wishlist is not a lockfile. |

When more than one lockfile is present in the project root, the
priority order is `pnpm-lock.yaml` → `yarn.lock` →
`package-lock.json` → `uv.lock` → `requirements.txt`. npm-family
lockfiles win in polyglot repos so a JS project that happens to
contain a `requirements.txt` for tooling keeps its existing
behaviour.

## Signal coverage

A signal is a fact about a `(name, version)` pair. The policy
engine maps signals to decisions identically across ecosystems —
what differs is which providers can produce which signals.

| Signal | npm family | PyPI |
|---|---|---|
| `published_at` | ✅ npm registry | ✅ PyPI JSON API |
| `advisory_known` | ✅ OSV (npm) | ✅ OSV (PyPI: GHSA + PyPA) |
| `deprecated_version` | ✅ npm registry | ✅ PyPI ([PEP 592](https://peps.python.org/pep-0592/) yanked) |
| `project_metadata` (licences) | ✅ deps.dev | ✅ deps.dev |
| `lifecycle_scripts` | ✅ npm registry | ⏳ deferred (sdist scan) |
| `suspicious_script` | ✅ static analysis | ⏳ deferred (sdist scan) |
| `version_surface_change` | ✅ npm registry | ⏳ deferred |
| `dist_tag_anomaly` | ✅ npm registry | n/a (PyPI has no dist-tags) |
| `publisher_change` | ✅ npm registry (`_npmUser`) | ⏳ deferred (no per-version publisher in PyPI JSON) |
| `maintainer_new_account` | ✅ npm registry | ⏳ deferred (same reason) |
| `name_squat` | ✅ local heuristic | ✅ local heuristic |
| `provenance_claimed` | ✅ npm registry | n/a (no equivalent today) |
| `scorecard_score` | ✅ Scorecard | ✅ Scorecard (via `info.project_urls` → GitHub) |

A `⏳ deferred` cell means the signal is silent for that
ecosystem — its absence does **not** count against the package.
Trust scoring and policy thresholds apply only to signals that
were actually observed.

## Policy authoring

The [ecosystem-prefix grammar](/usage/policy-yaml/#ecosystem-prefix-grammar)
applies to every list-of-package field in policy
(`defaults.nameSquatAllow`, `scripts.allow`):

* Bare entries (`requests`, `gaxios`) match a package of that
  name in **any** registry family.
* Prefixed entries (`npm:lodash`, `pypi:requests`,
  `npm:@scope/name`) scope the allow to a single family.

A policy written for an npm-only project keeps working unchanged
when PyPI deps land — bare entries still match. Use prefixes when
you want to be explicit, especially when the same package name
exists in both ecosystems.

## What lives at `pypi:` today

* The PyPI adapter resolves `uv.lock` and hashed `requirements.txt`
  into the same `ResolvedDependency` shape as npm-family deps.
* Names are normalised per [PEP 503](https://peps.python.org/pep-0503/#normalized-names)
  (`Re_quests` → `requests`) before matchers and cache keys see
  them.
* OSV advisories with the `"PyPI"` ecosystem label gate Python
  deps with the same severity bucketing as their npm equivalents.
* deps.dev licence metadata flows through `project_metadata`.
* Yanked releases surface as `deprecated_version` with the
  maintainer's `yanked_reason`.

## What's coming next

Tracked in
[ROADMAP M8](https://github.com/jt-systems/installguard/blob/main/ROADMAP.md#milestone-8--beyond-npm):

* Maintainer / publisher signals for PyPI — likely via
  [PEP 740](https://peps.python.org/pep-0740/) attestation
  metadata as it rolls out across the index.
* sdist `setup.py` static analysis.
* `poetry.lock` adapter.
* crates.io, Go modules, RubyGems, Maven Central, NuGet, Hex.

Each new adapter follows the same shape: a `LockfileAdapter`
implementation + at least one `SignalProvider` + ecosystem-tuned
defaults + integration tests. The policy engine and decision
model don't move.
