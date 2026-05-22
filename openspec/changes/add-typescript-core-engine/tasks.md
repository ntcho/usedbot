## 1. Align With Earlier Changes

- [ ] 1.1 Review completed bootstrap, workspace layout, and sidecar artifacts.
- [ ] 1.2 Confirm TypeScript package boundaries and runtime conventions.
- [ ] 1.3 Confirm the available sidecar contract before implementing the scraper client.

## 2. Build TypeScript Boundaries

- [ ] 2.1 Add shared domain types needed by the core and scraper client.
- [ ] 2.2 Add the scraper-client boundary for local sidecar communication.
- [ ] 2.3 Add core entry points that expose monitor and state behavior without CLI parsing.

## 3. Build Core Behavior

- [ ] 3.1 Implement monitor orchestration through the scraper-client boundary.
- [ ] 3.2 Implement listing identity, dedupe, and update behavior.
- [ ] 3.3 Implement repo-local plain text persistence under the single-writer model.
- [ ] 3.4 Implement notification eligibility decisions for terminal and webhook channels.

## 4. Verify Core

- [ ] 4.1 Add tests for scraper-client contract handling.
- [ ] 4.2 Add tests for listing identity, dedupe, updates, and history behavior.
- [ ] 4.3 Add tests for storage recovery at the behavior level.
- [ ] 4.4 Run `openspec status --change add-typescript-core-engine`.
