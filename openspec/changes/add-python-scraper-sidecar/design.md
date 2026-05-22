## Context

The upstream project contains useful Playwright scraper logic but also includes a full desktop engine, database, GUI, and notification stack. The sidecar should expose only scraping-related behavior and leave product decisions to TypeScript.

## Goals / Non-Goals

**Goals:**

- Create a local-only Python service for scraping and enrichment.
- Keep upstream imports confined to a thin adapter boundary.
- Produce stable DTOs and structured failure outcomes.
- Support a contract that can be consumed by a later TypeScript client.

**Non-Goals:**

- Do not implement scheduling, dedupe, persistence, notification policy, or CLI workflows in Python.
- Do not expose upstream Python dataclasses as the long-term public contract.
- Do not patch vendored upstream files unless a documented patch is unavoidable.

## Decisions

### Keep The Sidecar Thin

The sidecar should translate between upstream scrapers and a stable local API. It should not become a second application engine.

Alternative considered: reuse more of the upstream runtime. That would pull in the desktop app's engine and database decisions, which conflicts with the v1 architecture.

### Use Contract-Driven DTOs

The service should define typed request and response DTOs and expose a machine-readable contract. Litestar's typed routes and OpenAPI support are the expected path, but exact generation and client tooling can be finalized during implementation.

Alternative considered: hand-maintained TypeScript and Python shapes only. That is faster but increases contract drift risk.

### Treat Failures As Structured Outcomes

Scraper failures should be categorized for the TypeScript engine instead of being returned only as text or raw exceptions.

Alternative considered: generic HTTP errors. Those are simpler but make retry, diagnostics, and user messaging less reliable.

## Risks / Trade-offs

- Upstream imports may assume their original repository layout -> Keep adapter code isolated and document any required vendor patch.
- API contract may evolve while the TypeScript client is built -> Keep the initial contract small and versionable.
- Browser lifecycle can leak resources -> Add lifecycle tests and shutdown behavior before relying on long-running use.

## Open Questions

Exact route names, DTO fields, and OpenAPI-to-TypeScript generation workflow should be finalized when this change is applied.
