## ADDED Requirements

### Requirement: Upstream remote is configured
The repository SHALL use an `upstream` Git remote pointing to the original upstream project.

#### Scenario: Upstream remote exists
- **WHEN** the bootstrap change is implemented
- **THEN** `git remote get-url upstream` returns `https://github.com/twbeatles/used-market-notifier`

### Requirement: Upstream project is vendored as a subtree
The repository SHALL vendor the upstream project under `vendor/used-market-notifier/` using `git subtree` instead of using a submodule or copying files into the active root.

#### Scenario: Vendor mirror exists
- **WHEN** the bootstrap change is implemented
- **THEN** `vendor/used-market-notifier/` exists and contains the upstream project snapshot

#### Scenario: Upstream scraper source is available in vendor mirror
- **WHEN** a developer inspects `vendor/used-market-notifier/`
- **THEN** scraper source files such as `scrapers/playwright_base.py`, `scrapers/playwright_danggeun.py`, `scrapers/playwright_bunjang.py`, `scrapers/playwright_joonggonara.py`, and `scrapers/marketplace_parsers.py` are present inside the vendor mirror

### Requirement: Vendor mirror remains isolated from active v1 code
The repository SHALL keep new v1 product code outside `vendor/used-market-notifier/`.

#### Scenario: No new v1 product files are written inside vendor
- **WHEN** the bootstrap change is implemented
- **THEN** files created for v1 workspace setup, documentation, scripts, packages, services, or apps are outside `vendor/used-market-notifier/`

### Requirement: Upstream sync workflow is documented and scripted
The repository SHALL document and script the workflow for pulling future upstream changes into the vendor subtree.

#### Scenario: Sync documentation explains subtree workflow
- **WHEN** a developer reads `docs/upstream-sync.md`
- **THEN** it explains initial vendoring and future `git subtree pull --prefix=vendor/used-market-notifier upstream main --squash` updates, including a note to inspect the upstream default branch before assuming `main`

#### Scenario: Sync script supports future pulls
- **WHEN** a developer reads `scripts/sync-upstream.sh`
- **THEN** it fetches the `upstream` remote and runs a subtree pull for `vendor/used-market-notifier/` using the configured upstream branch

### Requirement: Vendor patches are documented
The repository SHALL allow unavoidable vendor patches only when they are recorded in patch documentation.

#### Scenario: Patch policy is visible
- **WHEN** a developer reads `docs/upstream-patches.md`
- **THEN** it states that vendor patches must be minimal, justified, and documented with reason, affected files, and upstream sync impact
