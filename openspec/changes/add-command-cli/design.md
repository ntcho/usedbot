## Context

The CLI is the initial v1 user interface. It should expose the TypeScript core and manage local sidecar convenience, but it should not absorb core product rules or introduce frontend scope.

## Goals / Non-Goals

**Goals:**

- Provide command-only access to v1 monitoring and configuration behavior.
- Automatically start or connect to the local sidecar when commands require scraping.
- Support headed scraper mode for debugging.
- Support terminal output and webhook configuration paths.

**Non-Goals:**

- Do not build a TUI in this change.
- Do not build a web frontend.
- Do not duplicate core business logic in CLI command handlers.
- Do not make users manually manage the sidecar for normal command flows.

## Decisions

### Command-Only First

The CLI should provide explicit commands first. Interactive TUI behavior can be proposed later once core behavior stabilizes.

Alternative considered: build TUI immediately. That would increase scope before the command workflows are proven.

### CLI Manages Sidecar Convenience

Commands that need scraping should ensure the local sidecar is available and start it when appropriate. The exact process supervision details should follow the sidecar and core implementation decisions.

Alternative considered: require users to start the sidecar manually. That keeps the CLI simpler but hurts the local tool experience.

## Risks / Trade-offs

- Sidecar startup can hide failures -> Surface health and startup errors clearly in command output.
- Command surface can grow too quickly -> Keep initial commands tied to core capabilities already implemented.
- Debug headed mode can affect automation -> Make headed behavior explicit rather than default.

## Open Questions

Exact command names, flags, and output formatting should be finalized when this change is applied.
