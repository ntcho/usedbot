## ADDED Requirements

### Requirement: Core orchestrates monitoring
The TypeScript core SHALL own monitor cycle orchestration and SHALL request scraping through the local scraper-client boundary.

#### Scenario: Monitor cycle runs
- **WHEN** the core runs a monitor cycle for configured search criteria
- **THEN** it requests scraper data through the client boundary and processes returned results in TypeScript

### Requirement: Core owns listing identity and updates
The TypeScript core SHALL apply listing identity, dedupe, and update rules for scraped results.

#### Scenario: Existing listing is seen again
- **WHEN** a scraped result matches an existing listing identity
- **THEN** the core updates the existing listing state instead of creating an unrelated duplicate

### Requirement: Core persists visible local state
The TypeScript core SHALL persist v1 state in repo-local plain text storage using a single-writer model.

#### Scenario: State changes
- **WHEN** the core records a listing, history, setting, or notification decision
- **THEN** the change is recoverable from repo-local plain text data files

### Requirement: Core evaluates notification eligibility
The TypeScript core SHALL decide whether a listing event is eligible for terminal or webhook notification.

#### Scenario: Listing event is processed
- **WHEN** the core processes a listing event
- **THEN** it records whether terminal or webhook notification should be emitted according to v1 policy

### Requirement: Core avoids UI ownership
The TypeScript core SHALL expose behavior that a CLI can invoke without owning terminal command parsing or interactive UI behavior.

#### Scenario: CLI uses core
- **WHEN** a later CLI command invokes monitoring behavior
- **THEN** command parsing remains outside the core engine
