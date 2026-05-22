## Why

After the sidecar, TypeScript core, and CLI exist, v1 needs hardening so the local toolchain is reliable enough for day-to-day use. This phase focuses on recovery, diagnostics, health checks, and operational documentation rather than new product scope.

## What Changes

- Add recovery and validation behavior around local plain text data.
- Add operational health checks for sidecar and core workflows.
- Add compaction, maintenance, or repair workflows where needed.
- Add documentation for running, debugging, and recovering the local toolchain.
- Strengthen tests around failure paths and local workflow durability.

## Capabilities

### New Capabilities

- `v1-local-toolchain-hardening`: Defines reliability, diagnostics, recovery, and documentation expectations for the local v1 toolchain.

### Modified Capabilities

- None.

## Impact

- Adds hardening behavior and tests across existing v1 workspaces.
- May add documentation and maintenance commands.
- Does not add new major product features or v2 frontend scope.
