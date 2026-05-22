## 1. Bootstrap Root Workspace

- [ ] 1.1 Inspect the current worktree and existing remotes before changing files.
- [ ] 1.2 Create `migration.md` with the reviewed v1 migration plan and recorded decisions.
- [ ] 1.3 Create root `package.json` with private workspace metadata, pnpm package manager metadata, and Node 22 engine constraints.
- [ ] 1.4 Create `pnpm-workspace.yaml` including future `apps/*` and `packages/*` workspaces.
- [ ] 1.5 Create `.gitignore` entries for dependencies, build output, Python caches, virtual environments, local runtime `data/`, logs, and editor/system files.

## 2. Add Upstream Workflow Documentation

- [ ] 2.1 Create `docs/upstream-sync.md` documenting initial subtree vendoring and future subtree pull workflow.
- [ ] 2.2 Create `docs/upstream-patches.md` documenting the vendor patch policy and required patch metadata.
- [ ] 2.3 Create `scripts/sync-upstream.sh` to fetch upstream and run subtree pull for `vendor/used-market-notifier/`.
- [ ] 2.4 Mark `scripts/sync-upstream.sh` executable.

## 3. Vendor Upstream Project

- [ ] 3.1 Inspect the upstream repository default branch before assuming `main`.
- [ ] 3.2 Add the `upstream` remote as `https://github.com/twbeatles/used-market-notifier` if it does not already exist.
- [ ] 3.3 Fetch the `upstream` remote.
- [ ] 3.4 Add the upstream project under `vendor/used-market-notifier/` using `git subtree add --prefix=vendor/used-market-notifier upstream <branch> --squash`.

## 4. Verify Guardrails

- [ ] 4.1 Verify required root files exist: `migration.md`, `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `docs/upstream-sync.md`, `docs/upstream-patches.md`, and `scripts/sync-upstream.sh`.
- [ ] 4.2 Verify `vendor/used-market-notifier/` contains upstream scraper files and tests.
- [ ] 4.3 Verify forbidden legacy app files do not exist at the active root outside `vendor/used-market-notifier/`.
- [ ] 4.4 Verify v2 frontend files and directories, including `apps/web/` and SolidJS setup files, do not exist.
- [ ] 4.5 Run `openspec status --change bootstrap-v1-workspace` and confirm the change remains apply-ready.
