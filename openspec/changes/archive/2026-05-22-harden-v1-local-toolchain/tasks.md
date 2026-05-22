## 1. Assess Existing Implementation

- [x] 1.1 Review completed sidecar, TypeScript core, and CLI behavior.
- [x] 1.2 Identify concrete local data, sidecar, and CLI failure modes to harden.
- [x] 1.3 Confirm hardening scope does not introduce new product surfaces.

## 2. Add Recovery And Diagnostics

- [x] 2.1 Add recovery or repair behavior for supported local data issues.
- [x] 2.2 Add sidecar and scraper diagnostics that surface actionable failures.
- [x] 2.3 Add maintenance workflows required by the implemented storage model.

## 3. Document Operations

- [x] 3.1 Document normal run and debug workflows.
- [x] 3.2 Document local data recovery and maintenance workflows.
- [x] 3.3 Update upstream sync or patch documentation if implementation revealed new constraints.

## 4. Verify Hardening

- [x] 4.1 Add tests for recovery and maintenance behavior.
- [x] 4.2 Add tests or smoke checks for service health diagnostics.
- [x] 4.3 Verify no v2 frontend, hosted service, or extra notification scope was added.
- [x] 4.4 Run `openspec status --change harden-v1-local-toolchain`.
