---
title: GitLab CI
description: Run InstallGuard on every merge request, post a sticky MR note, and surface findings in the Code Quality widget.
---

GitLab CI is a different beast to GitHub Actions — different YAML
syntax, different MR comment API, and a first-class **Code Quality
widget** that can render per-package findings inline on the MR diff.
We ship a maintained template at
[`ci/gitlab/installguard.gitlab-ci.yml`](https://github.com/jt-systems/installguard/blob/main/ci/gitlab/installguard.gitlab-ci.yml)
that wires all three together.

## Quick start (use the shipped template)

Add this to your project's `.gitlab-ci.yml`:

```yaml
include:
  - remote: 'https://raw.githubusercontent.com/jt-systems/installguard/main/ci/gitlab/installguard.gitlab-ci.yml'

installguard:
  extends: .installguard
  variables:
    INSTALLGUARD_REF: "main"        # pin to a tag for reproducibility
```

That's the whole integration. On every merge-request pipeline you get:

- **`installguard ci`** runs against the lockfile and produces
  `installguard-summary.json`.
- A **sticky MR note** with the rendered verdict — created on the first
  run, updated in place on every subsequent push (no comment spam).
- **Code Quality findings** surfaced inline on the MR diff via
  `installguard-codequality.json` (one entry per blocked or warned
  package).
- A non-zero exit code propagates to fail the pipeline if any package
  blocks.

Pin to a release tag once you're past evaluation:

```yaml
include:
  - remote: 'https://raw.githubusercontent.com/jt-systems/installguard/v0.3.4/ci/gitlab/installguard.gitlab-ci.yml'

installguard:
  extends: .installguard
  variables:
    INSTALLGUARD_REF: "v0.3.4"
```

## Configuration

All configuration is via job variables — no YAML overrides needed.

| Variable | Default | Purpose |
|---|---|---|
| `INSTALLGUARD_REF` | `main` | Tag, branch, or commit of InstallGuard to install. **Pin to a tag in production.** |
| `INSTALLGUARD_PATH` | `.` | Project root (where the lockfile lives). |
| `INSTALLGUARD_POLICY` | _(unset)_ | Path to a policy YAML. Defaults to `installguard.yaml` at `--path`. |
| `INSTALLGUARD_MAX_WARN` | _(unset)_ | Fail the job when warns exceed this number (`0` = strict). |
| `INSTALLGUARD_NO_CACHE` | `false` | Skip the on-disk signal cache. |
| `INSTALLGUARD_IGNORE_SCRIPTS` | `false` | Pass `--ignore-scripts` to the underlying scan. |
| `INSTALLGUARD_COMMENT_ON_MR` | `true` | Set to `false` to disable the sticky MR note (Code Quality still runs). |
| `INSTALLGUARD_GITLAB_TOKEN` | _(unset)_ | Project/Group access token with `api` scope. Only needed when `CI_JOB_TOKEN` can't post notes (private projects, forks, older GitLab). |

## Tokens for the MR note

The template uses `CI_JOB_TOKEN` by default, which works on recent
GitLab when the project enables **Settings → CI/CD → Token Permissions →
"CI/CD job token allowed to access this project"** (default for new
projects).

For private projects, forks, or self-hosted GitLab where the job token
is restricted, create a Project or Group access token with `api` scope
and expose it as a CI/CD variable:

1. **Settings → Access Tokens** → create a token, scope `api`, role
   **Reporter** (sufficient for posting notes).
2. **Settings → CI/CD → Variables** → add `INSTALLGUARD_GITLAB_TOKEN`,
   masked + protected.

The template auto-detects which token is set and uses the right header
(`PRIVATE-TOKEN` for PATs, `JOB-TOKEN` for `CI_JOB_TOKEN`).

## Code Quality widget

GitLab renders Code Quality reports as inline annotations on changed
files in the MR diff. The template synthesises a Code Quality JSON file
from the same summary the binary already emitted:

- `block` decisions surface as **Blocker** severity.
- `warn` decisions surface as **Minor** severity.
- Each finding includes the package name, version, and a one-line
  reason summary, plus a stable fingerprint so GitLab won't duplicate
  entries between pipeline runs.

The findings appear in the **Code Quality** tab of the MR and as inline
annotations against the lockfile.

## Pipelines that scan, not gate

`installguard ci` exits non-zero on any block, which fails the GitLab
job by default. To run InstallGuard in **warn-only** mode while a team
adopts it, override the policy to demote everything to warn:

```yaml
installguard:
  extends: .installguard
  variables:
    INSTALLGUARD_POLICY: .installguard/warn-only.yaml
    INSTALLGUARD_MAX_WARN: "999999"
  allow_failure: true
```

Or use the policy YAML's [severity map](/concepts/severity/) to demote
specific reason classes while keeping the rest blocking.

## Custom pipeline (no `extends`)

If you'd rather copy-and-edit instead of extending the shipped template,
the full job definition lives at
[`ci/gitlab/installguard.gitlab-ci.yml`](https://github.com/jt-systems/installguard/blob/main/ci/gitlab/installguard.gitlab-ci.yml).
The structure is:

1. **`before_script`** — install the InstallGuard binary (cached across
   pipelines via `$CARGO_HOME`). Replace this with a `curl` of the
   pre-built musl binary from the GitHub release for faster cold starts:
   ```sh
   curl -L https://github.com/jt-systems/installguard/releases/download/v0.3.4/installguard-x86_64-unknown-linux-musl \
     -o /usr/local/bin/installguard && chmod +x /usr/local/bin/installguard
   ```
2. **`script`** — `installguard ci --summary-file installguard-summary.json`,
   capturing the exit code so `after_script` can post the note before
   the job fails.
3. **`after_script`** — synthesises the Code Quality JSON and posts the
   sticky MR note via the GitLab API. Always runs, even on script
   failure.
4. **`artifacts.reports.codequality`** — wires the synthesised JSON
   into the MR Code Quality widget.

## Troubleshooting

**No MR note appears.** Check the `after_script` output in the job log
— it prints the API call result. Most common cause is `CI_JOB_TOKEN`
not being permitted to post notes; switch to a `INSTALLGUARD_GITLAB_TOKEN`
PAT.

**Code Quality widget is empty.** The widget only renders on MR
pipelines (it requires comparison against the target branch). On a
direct push to `main` you'll see findings in the job artifact but not
in any widget.

**Pipeline runs on every commit but the MR note doesn't update.** The
template's `rules:` only triggers on `merge_request_event` and on the
default branch. If you've customised the rules, ensure the MR-event
pipeline runs — that's the one that updates the note.
