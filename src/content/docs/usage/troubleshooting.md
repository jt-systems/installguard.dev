---
title: Troubleshooting & FAQ
description: Common findings and what to do about them.
---

## Why is `gaxios` flagged as a typosquat?

Because `gaxios` is exactly Levenshtein-1 from `axios` (28M downloads/week). The detector can't tell from the name alone that `gaxios` is Google's official HTTP client. Add it to your allowlist:

```yaml
defaults:
  nameSquatAllow:
    - gaxios
```

The allowlist is exact-match only — `gaxios2` would still fire. This is intentional: the whole point of the detector is to catch typo‑shaped names of legitimate packages.

Other commonly-allowlisted distance-1 names: `ulid`/`uuid`, `nuxt`/`next`, `preact`/`react`, `redis`, `vitest`, `fastly`. Most of these are already shipped in the built-in allowlist; only add `nameSquatAllow` entries for names InstallGuard hasn't seen before.

## Why does "latest moved backwards" only warn?

Because in real-world scans it's almost always **maintainer policy, not an attack**:

- Storybook keeps `latest=8.6.x` while `9.x` rides the `next` tag.
- Expo SDK 54 holds `latest` on 55 while 56 stabilises.
- React Router 6 LTS continues on `latest` while 7.x is the future.

These are intentional LTS-line decisions. The signal is still emitted (recorded in `installguard.lock`, contributing to the trust score) but the default verdict is `warn`. If you want every backwards `latest` to fail CI, promote it:

```yaml
severity:
  dist-tag-anomaly: block
```

## Why does `signal-unavailable` only warn?

Because **absence of evidence is not evidence of attack**. The signal fires when:

- The npm registry returned 404 (private package, never published, transient).
- A provider (OSV, deps.dev, Scorecard) returned 5xx or timed out.
- The packument decoded incorrectly (broken upstream metadata).
- Your network is flaky or behind a strict egress policy.

None of these tell you the package is compromised. They tell you the run was incomplete. For strict fail-closed semantics:

```yaml
severity:
  signal-unavailable: block
```

## My workspace package is being flagged

In v0.1.8+ this should not happen — see [Workspaces](/concepts/workspaces/). If it does, your workspace shape isn't being detected. File an issue with the relevant lockfile snippet (the entry under `packages:` or `importers:` that's tripping the detector).

## A `core-js` / `dtrace-provider` / native-binding package is blocked

These are genuine `install` / `postinstall` declarations. InstallGuard's job is to surface them so you decide. The default `scripts.allow` already covers the most common ones (`bcrypt`, `cypress`, `electron`, `esbuild`, `fsevents`, `msw`, `node-gyp`, `node-pre-gyp`, `playwright`, `puppeteer`, `sharp`). Anything else that's legitimate gets added explicitly:

```yaml
scripts:
  allow:
    - core-js               # postinstall prints a sponsor banner
    - protobufjs            # postinstall compiles the minimal runtime
    - unrs-resolver         # install builds the napi-rs native addon
```

Add a comment explaining what the script actually does — it's the load-bearing piece of audit context for the next reviewer.

## A version with a leading `v` produces `signal-unavailable`

Fixed in v0.1.9. If you're seeing it on 0.1.9+, please file an issue with the lockfile entry — the normalization only triggers on `v` followed by an ASCII digit, so a non-semver version like `vNext` would still miss.

## I'm seeing "policy file not found; using defaults"

That's an info-level warning, not an error. If you don't have an `installguard.yaml` at the path you ran from, the built-in defaults are used — which is a sensible policy on its own. Create a file (even an empty one with just `policyVersion: 1`) to silence the warning.

## My CI exit code is 1 but the report shows zero blocks

Check the warn count. If you've set `installguard ci --max-warn N` and the run produced more than `N` warnings, the job fails. Set `--max-warn 0` for strict warn-as-error semantics; omit it to fail only on blocks. Otherwise, see [Reference › Exit codes](/reference/exit-codes/) for the canonical mapping.

## I upgraded InstallGuard and a package's signals look stale

Since 0.1.17 this should be self-healing — every cache entry is stamped with the producing tool version, and any mismatch on read drops and refetches. If you're on 0.1.17+ and still suspect stale data, the [`cache`](/usage/cache/) subcommand has the controls:

```bash
installguard cache info     # per-status breakdown
installguard cache clear    # nuclear option; next scan refetches everything
installguard cache path     # if you really want to rm -rf yourself
```

On 0.1.16 and earlier you do need to clear the cache directory by hand after some upgrades; the `cache` subcommand was added in 0.1.17 specifically to retire that workflow.

## Where do I report a real attack?

If you believe a finding is a genuine supply-chain attack and not a false positive, **report it to [npm's security team](https://github.com/advisories/new)** before doing anything else. InstallGuard is a gate; npm's takedown pipeline is what gets the package out of the registry.
