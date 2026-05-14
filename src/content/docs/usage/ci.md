---
title: ci
description: Run InstallGuard inside CI with structured output for runners.
---

```sh
installguard ci [--summary-file summary.json] [--max-warn N]
```

Same gating semantics as `scan`, with two CI-friendly extras:

- `--summary-file` — stable JSON summary suitable for piping to `installguard report` (which renders the canonical sticky-comment Markdown).
- `--max-warn` — fail (exit 1) when warns exceed this number. Block decisions always fail regardless. Set to `0` for strict warn-as-error semantics.
- `--github` — emit GitHub Actions workflow commands (`::warning::` / `::error::`). Auto-enabled when `GITHUB_ACTIONS=true` is set.

All flags are optional; provide whichever your pipeline consumes.

## Cache in CI

The signal cache is a single directory (`~/.cache/installguard` by default; override with `--cache-dir`). Mount it as a CI cache for ~10× speedup on warm runs.

See [Recipes › GitHub Actions](/recipes/github-actions/) for a complete example.
