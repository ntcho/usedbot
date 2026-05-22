# Core Workspace

This workspace contains the v1 TypeScript core engine.

## Owns

- repo-local plain text state under `data/core/`
- monitor cycle orchestration through the scraper client boundary
- notification eligibility decisions for terminal and webhook channels
- local state inspection and repair used by `pnpm usedbot doctor` and `pnpm usedbot data repair`

## Does Not Own

- scrape transport or HTTP endpoint details
- CLI command parsing or terminal formatting
- upstream scraper imports and Playwright lifecycle

## Related Docs

- System boundaries: `docs/ARCHITECTURE.md`
- Daily workflows: `docs/local-toolchain.md`
- Shared contract types: `packages/shared/README.md`
