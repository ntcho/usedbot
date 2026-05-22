## 1. Refresh Canonical Repo Docs

- [x] 1.1 Rewrite `README.md` around prerequisites, install, first-run, and verification workflows for the current local v1 repository.
- [x] 1.2 Create `docs/ARCHITECTURE.md` with both a concise system overview and a detailed boundary/runtime-flow walkthrough.
- [x] 1.3 Migrate any durable content still worth keeping from `migration.md` into living docs and remove `migration.md`.

## 2. Align Supporting Documentation

- [x] 2.1 Update `docs/local-toolchain.md` so it complements the new README instead of duplicating or contradicting it.
- [x] 2.2 Refresh workspace README files under `apps/`, `packages/`, and `services/` so implemented components no longer use placeholder or "later change" language.
- [x] 2.3 Add or update cross-links between the root README, architecture doc, local toolchain doc, and vendor maintenance docs.

## 3. Refresh Living OpenSpec Files

- [x] 3.1 Update the living spec files required by this change, including the bootstrap and workspace-layout specs, to match the current repository rather than archived phase wording.
- [x] 3.2 Replace placeholder Purpose text in current OpenSpec specs where it still appears and make the summaries reflect implemented capabilities.

## 4. Verify Documentation Truth

- [x] 4.1 Check that every documented command, path, and prerequisite in the refreshed docs exists in the current repository or workspace metadata.
- [x] 4.2 Run `openspec status --change refresh-project-docs-and-specs` and confirm the change is ready for implementation.
