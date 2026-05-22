#!/usr/bin/env bash
set -euo pipefail

remote="${UPSTREAM_REMOTE:-upstream}"
branch="${UPSTREAM_BRANCH:-}"
prefix="${UPSTREAM_PREFIX:-vendor/used-market-notifier}"

if ! git remote get-url "$remote" >/dev/null 2>&1; then
  printf 'Remote %s is not configured.\n' "$remote" >&2
  exit 1
fi

git fetch "$remote"
git remote set-head "$remote" -a >/dev/null 2>&1 || true

if [ -z "$branch" ]; then
  branch="$(git symbolic-ref --quiet --short "refs/remotes/$remote/HEAD" 2>/dev/null || true)"
  branch="${branch#${remote}/}"
fi

if [ -z "$branch" ]; then
  printf 'Unable to determine the upstream branch. Set UPSTREAM_BRANCH and rerun.\n' >&2
  exit 1
fi

git subtree pull --prefix="$prefix" "$remote" "$branch" --squash
