---
title: cache
description: Inspect or manage the on-disk signal cache.
---

```sh
installguard cache <path|info|clear> [--cache-dir <dir>]
```

`cache` exposes the on-disk signal cache that `scan`, `ci`, `lock`, and friends
share between runs. Since 0.1.17 the cache **auto-invalidates on tool-version
change** — you do not need to manually clear it after upgrading. The
subcommands exist for inspection and the rare case where you want to force a
clean state without waiting for the next read.

The cache lives under the platform user-cache directory by default:

| OS | Default path |
|---|---|
| macOS | `~/Library/Caches/installguard` |
| Linux | `~/.cache/installguard` |
| Windows | `%LOCALAPPDATA%\installguard\Cache` |

Override with `--cache-dir` (parity with `scan`).

## Subcommands

### `cache path`

Prints the resolved cache directory and exits. Useful for shell composition:

```sh
du -sh "$(installguard cache path)"
```

### `cache info`

Per-status breakdown plus the running tool version:

```text
cache directory: /Users/jt/Library/Caches/installguard
tool version:    0.1.19
entries total:   1247
  fresh:         1247
  stale (ver):   0
  stale (sch):   0
  unreadable:    0
```

If any entries are flagged stale, the command prints a hint about reclaiming
disk space immediately via `cache clear`.

| Status | Meaning |
|---|---|
| `fresh` | Schema and tool-version match; entry is honoured on read. |
| `stale (ver)` | Entry was written by a different `CARGO_PKG_VERSION`. Dropped on next read. |
| `stale (sch)` | Entry was written under a different `SCHEMA_VERSION`. Dropped on next read. |
| `unreadable` | Bytes failed to deserialise (corruption, partial write). Dropped on next read. |

### `cache clear`

Drops every entry. The next `scan` re-fetches signals from the network. Prefer
this over `rm -rf` — it goes through the cache crate's API and is correct on
every platform.

```sh
installguard cache clear
# 1247 entries cleared
```

## When to use it

- **`info`** before opening a "stale signal" issue, to confirm what you're
  seeing.
- **`clear`** when you want to force a network round-trip on the next run
  (e.g., to verify a freshly-published advisory landed).
- **`path`** to point another tool at the cache directory — backups, disk
  reclamation, etc.

## Related

- [Troubleshooting › "I upgraded InstallGuard and a package's signals look stale"](/usage/troubleshooting/#i-upgraded-installguard-and-a-packages-signals-look-stale)
- [Changelog 0.1.17](/reference/changelog/#0117--2026-05-15) — auto-invalidation rollout.
