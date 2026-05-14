---
title: Exit codes
description: What InstallGuard's process exit codes mean.
---

| Code | Meaning |
|---|---|
| `0` | All decisions are `allow` or `warn`. |
| `1` | At least one decision is `block`. |
| `2` | Configuration error (unparseable policy or lockfile). |
| `3` | Provider failure (cache miss + network unavailable). |

`installguard scan` and `installguard ci` use the same scheme. `installguard report` exits 0 unless the input JSON is malformed.
