# Core Workspace

This workspace contains the v1 TypeScript core engine.

The core owns:

- repo-local plain text state under `data/core/`
- monitor cycle orchestration through the scraper client boundary
- notification eligibility decisions for terminal and webhook channels
- local state inspection and repair used by `pnpm usedbot doctor` and `pnpm usedbot data repair`
