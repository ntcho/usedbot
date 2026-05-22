## 1. Assess Existing Implementation

- [ ] 1.1 Review completed sidecar, TypeScript core, and CLI behavior.
- [ ] 1.2 Identify concrete local data, sidecar, and CLI failure modes to harden.
- [ ] 1.3 Confirm hardening scope does not introduce new product surfaces.

## 2. Add Recovery And Diagnostics

- [ ] 2.1 Add recovery or repair behavior for supported local data issues.
- [ ] 2.2 Add sidecar and scraper diagnostics that surface actionable failures.
- [ ] 2.3 Add maintenance workflows required by the implemented storage model.

## 3. Document Operations

- [ ] 3.1 Document normal run and debug workflows.
- [ ] 3.2 Document local data recovery and maintenance workflows.
- [ ] 3.3 Update upstream sync or patch documentation if implementation revealed new constraints.

## 4. Verify Hardening

- [ ] 4.1 Add tests for recovery and maintenance behavior.
- [ ] 4.2 Add tests or smoke checks for service health diagnostics.
- [ ] 4.3 Verify no v2 frontend, hosted service, or extra notification scope was added.
- [ ] 4.4 Run `openspec status --change harden-v1-local-toolchain`.
