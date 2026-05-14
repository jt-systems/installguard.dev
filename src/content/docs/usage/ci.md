---
title: ci
description: Run InstallGuard inside CI with structured output for runners.
---

```sh
installguard ci [--summary-file summary.json] [--junit-file junit.xml]
```

Same gating semantics as `scan`, with two additional outputs designed for CI consumption:

- `--summary-file` — JSON summary suitable for piping to `installguard report` (which renders the canonical sticky-comment Markdown).
- `--junit-file` — JUnit XML, consumed by GitHub Actions / GitLab / CircleCI / Jenkins test-result UIs.

Both flags are optional; provide whichever your pipeline consumes.

## Cache in CI

The signal cache is a single directory (`~/.cache/installguard` by default; override with `--cache-dir`). Mount it as a CI cache for ~10× speedup on warm runs.

See [Recipes › GitHub Actions](/recipes/github-actions/) for a complete example.
