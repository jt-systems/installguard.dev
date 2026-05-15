---
title: scan
description: Scan a lockfile and render verdicts to the terminal.
---

```sh
installguard scan [--policy installguard.yaml] [--format pretty|human|json]
```

Auto-detects supported lockfiles in the current directory:
`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `uv.lock`,
`poetry.lock`, and hash-pinned `requirements.txt`. Reads
`installguard.yaml` if present; uses defaults otherwise.

## Formats

- `pretty` (default) — grouped by severity, ANSI colour, terminal-friendly. Honours `NO_COLOR`.
- `human` — line-per-decision, no grouping or colour. Suitable for log aggregation.
- `json` — structured output. The schema is stable across patch releases.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | All allow / warn |
| 1 | At least one block |
| 2 | Configuration error (bad policy, unparseable lockfile) |
| 3 | Provider failure (cache and registry both unavailable) |

## Examples

```sh
# Default scan
installguard scan

# Use an explicit policy file
installguard scan --policy ./.installguard/strict.yaml

# JSON output for piping into another tool
installguard scan --format json | jq '.summary'
```
