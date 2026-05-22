# Upstream Sync Workflow

## Default Branch Check

Inspect the upstream default branch before assuming `main`.

```bash
git remote show upstream
```

If the remote has not been added yet, inspect the upstream HEAD ref first and use that branch for the subtree commands.

## Initial Vendoring

Add the upstream remote if needed, fetch it, then vendor the upstream project with a squashed subtree import.

```bash
git remote add upstream https://github.com/twbeatles/used-market-notifier
git fetch upstream
git subtree add --prefix=vendor/used-market-notifier upstream <branch> --squash
```

Replace `<branch>` with the upstream default branch you verified.

## Future Updates

Use the sync script for normal updates.

```bash
./scripts/sync-upstream.sh
```

The script fetches `upstream` and runs a subtree pull for `vendor/used-market-notifier/` using the configured upstream branch.

If you need to override the detected branch, pass `UPSTREAM_BRANCH`.

```bash
UPSTREAM_BRANCH=main ./scripts/sync-upstream.sh
```

The underlying subtree update command is:

```bash
git subtree pull --prefix=vendor/used-market-notifier upstream main --squash
```

Use the actual upstream default branch if it is not `main`.
