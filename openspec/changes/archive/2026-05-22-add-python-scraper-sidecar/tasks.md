## 1. Align With Earlier Changes

- [x] 1.1 Review completed bootstrap and workspace layout artifacts.
- [x] 1.2 Confirm the sidecar workspace location and Python tooling conventions.
- [x] 1.3 Confirm whether any vendor patch is required before editing vendored files.

## 2. Define Service Boundary

- [x] 2.1 Add the minimal Python service structure in the sidecar workspace area.
- [x] 2.2 Define typed request and response DTOs for the initial local contract.
- [x] 2.3 Add adapter boundaries for allowed upstream scraper imports.

## 3. Add Sidecar Behavior

- [x] 3.1 Implement local service startup and lifecycle management.
- [x] 3.2 Implement health and capability reporting.
- [x] 3.3 Implement search and enrichment behavior through adapters.
- [x] 3.4 Map upstream results and failures into stable sidecar responses.

## 4. Verify Sidecar

- [x] 4.1 Add tests for health, capability reporting, DTO mapping, and failure mapping.
- [x] 4.2 Verify the sidecar does not implement scheduling, persistence, notification policy, or CLI workflows.
- [x] 4.3 Run `openspec status --change add-python-scraper-sidecar`.
