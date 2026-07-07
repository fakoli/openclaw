# Fork maintenance

This fork should stay thin. Fork-only work belongs in plugins, configuration,
small documentation addenda, or external operator tooling whenever possible.
Do not push to `openclaw/openclaw`; treat it as a read-only upstream.

## Sync model

The `Fork upstream sync` workflow keeps `fakoli/openclaw` current with public
upstream. It creates or updates one reusable PR from `sync/upstream-main` into
`main`.

The workflow is human-gated:

- It never force-pushes `main`.
- It never auto-merges the sync PR.
- It leaves workflow, lockfile, generated-doc, and changed-file signals in the
  PR body for review.
- Conflict and token failures open or update issues instead of attempting a
  risky repair.

## Required secret

Add repository secret `FORK_SYNC_TOKEN` before relying on scheduled syncs. Use a
fine-grained personal access token scoped only to `fakoli/openclaw`.

Required permissions:

| Permission | Access | Why |
|---|---:|---|
| Contents | Read and write | Push the `sync/upstream-main` branch. |
| Pull requests | Read and write | Create or update the sync PR. |
| Workflows | Read and write | Allow upstream workflow-file changes to be pushed to the fork branch. |

Do not use a broad organization token. Rotate this token if it is exposed, and
remove it if the fork no longer needs automated sync PR creation.

## Cost controls

- The scheduled sync runs weekly. Use manual `workflow_dispatch` before large
  fork work or before rebasing active fork PRs.
- Merge the sync PR before feature PRs when possible.
- For sync PR review, prioritize changed-path scans, workflow sanity, generated
  docs checks, dependency/security guards, and lockfile review before broader
  suites.
- If CI queues become expensive, leave the sync PR open and merge during an
  intentional maintenance window instead of repeatedly refreshing it.

## Manual recovery

If the workflow reports a conflict, create a fork-only branch from `fork/main`,
merge `origin/main`, resolve conflicts, and open a PR to `fakoli/openclaw:main`.

If the workflow reports a missing token, add or repair `FORK_SYNC_TOKEN`, then
rerun `Fork upstream sync`.
