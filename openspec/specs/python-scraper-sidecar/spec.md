# python-scraper-sidecar Specification

## Purpose
TBD - created by archiving change add-python-scraper-sidecar. Update Purpose after archive.
## Requirements
### Requirement: Sidecar is local-only
The Python scraper sidecar SHALL be designed for local application use and SHALL NOT expose scraping behavior as a public network service.

#### Scenario: Service starts locally
- **WHEN** the sidecar is started by the local toolchain
- **THEN** it binds only to a local interface suitable for same-machine clients

### Requirement: Sidecar exposes scraper availability
The Python scraper sidecar SHALL provide a way for local clients to determine service health and supported scraping capabilities.

#### Scenario: Client checks availability
- **WHEN** a local client requests sidecar status
- **THEN** the sidecar reports whether it is alive and which scraper capabilities are available

### Requirement: Sidecar performs upstream-backed scraping
The Python scraper sidecar SHALL perform search and enrichment by using allowed upstream scraper behavior through an adapter boundary.

#### Scenario: Client requests scraping
- **WHEN** a local client submits a valid scraping request for a supported marketplace
- **THEN** the sidecar returns mapped listing DTOs or a structured failure outcome

### Requirement: Sidecar returns stable DTOs
The Python scraper sidecar SHALL map upstream scraper objects into stable API DTOs before returning data to clients.

#### Scenario: Upstream object is returned
- **WHEN** upstream scraper code produces a listing object
- **THEN** the sidecar response contains the mapped DTO shape rather than the upstream object itself

### Requirement: Sidecar avoids product logic
The Python scraper sidecar SHALL NOT own scheduling, dedupe, persistence, notification policy, or user workflow behavior.

#### Scenario: Scraping completes
- **WHEN** the sidecar returns scraping results
- **THEN** it does not persist listing state, decide notification eligibility, or schedule future searches

