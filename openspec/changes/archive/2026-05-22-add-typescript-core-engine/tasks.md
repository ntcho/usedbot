## 1. Align With Earlier Changes

- [x] 1.1 Review completed bootstrap, workspace layout, and sidecar artifacts.
- [x] 1.2 Confirm TypeScript package boundaries and runtime conventions.
- [x] 1.3 Confirm the available sidecar contract before implementing the scraper client.

## 2. Build TypeScript Boundaries

- [x] 2.1 Add shared domain types needed by the core and scraper client.
- [x] 2.2 Add the scraper-client boundary for local sidecar communication.
- [x] 2.3 Add core entry points that expose monitor and state behavior without CLI parsing.

## 3. Build Core Behavior

- [x] 3.1 Implement monitor orchestration through the scraper-client boundary.
- [x] 3.2 Implement listing identity, dedupe, and update behavior.
- [x] 3.3 Implement repo-local plain text persistence under the single-writer model.
- [x] 3.4 Implement notification eligibility decisions for terminal and webhook channels.

## 4. Verify Core

- [x] 4.1 Add tests for scraper-client contract handling.
- [x] 4.2 Add tests for listing identity, dedupe, updates, and history behavior.
- [x] 4.3 Add tests for storage recovery at the behavior level.
- [x] 4.4 Run `openspec status --change add-typescript-core-engine`.
