---
title: report
description: Render a CI summary as a sticky pull-request comment.
---

```sh
installguard report --from summary.json [--max-rows 50] [--commit SHA] [--exit-code N]
```

Reads a `installguard ci --summary-file` JSON document and renders it as a Markdown body suitable for posting as a GitHub PR / GitLab MR sticky comment.

The output:

- Includes the `<!-- installguard-summary -->` HTML marker so sticky-comment tools (e.g. [marocchino/sticky-pull-request-comment](https://github.com/marocchino/sticky-pull-request-comment)) update in place rather than spamming.
- Escapes pipe characters in reason cells so Markdown tables render correctly even with weird package names.
- Truncates with `--max-rows`; the first N most-severe rows are kept.
- Optionally surfaces commit SHA and exit code in the footer.

## Typical pipeline

```sh
set +e
installguard ci --summary-file summary.json
exit_code=$?
set -e

installguard report --from summary.json --commit "$GITHUB_SHA" --exit-code "$exit_code" \
  > comment.md
# then post comment.md via your CI's comment-update mechanism
exit "$exit_code"
```

Capture the exit code before you run anything else, especially in
`set -e` shells. The [GitHub Actions recipe](/recipes/github-actions/)
shows the same pattern in workflow form.
