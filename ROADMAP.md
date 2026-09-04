# irs-taxpayer-mcp Roadmap

_Last updated: 2026-09-04._

## Current Baseline

Version 0.6.0 is a deterministic TY2024 through TY2026 estimation and planning engine with 43 MCP tools. It is not tax preparation or filing software.

### P0 accuracy and transport work completed

- Corrected TY2024 and TY2025 EITC parameters using IRS Revenue Procedures 2023-34 and 2024-40.
- Corrected unused standard-deduction allocation for capital gains, the QBI taxable-income limit, and nonrefundable CTC ordering.
- Added qualified-dividend treatment and preserved refundable EITC in full-report refund estimates.
- Corrected Social Security wage-base selection by tax year.
- Added TY2026 brackets, deductions, capital-gains thresholds, CTC, EITC, AMT, SALT, and Social Security data from official IRS and SSA sources.
- Modeled AMT 28% thresholds separately for MFS and other filing statuses.
- Improved MFJ versus MFS dependent allocation and mandatory itemization behavior.
- Corrected OBBB tips, overtime, senior, and auto-loan phase-outs using the applicable IRC sections.
- Removed unsafe graduated-state top-rate fallback calculations. Unsupported state paths now fail closed.
- Replaced the ambiguous state income input with an explicit pre-deduction contract and a deprecated compatibility alias.
- Added exact-year state calculation profiles and required every numeric state call to select a supported tax year.
- Added California TY2024 married brackets. Other graduated married paths remain unsupported unless explicit brackets are present.
- Replaced shared legacy SSE with stateless Streamable HTTP while retaining stdio.
- Restricted HTTP to loopback hosts, added exact Origin allowlists, and enabled SDK Host validation.
- Pinned direct runtime and development dependencies to exact versions.
- Expanded the suite to 252 tests, including IRS numeric regressions and real Streamable HTTP MCP initialization.

## Supported Today

### Federal estimates

- Seven ordinary income-tax brackets across four federal filing statuses.
- Preferential long-term capital-gain rates and qualified-dividend handling in supported tools.
- Self-employment tax, NIIT, Additional Medicare Tax, simplified AMT, and simplified QBI.
- CTC, EITC, standard versus itemized deductions, quarterly estimates, and W-4 planning.
- TY2025 OBBB deductions with modeled eligibility and phase-outs.

### State estimates

- Reference metadata for all 50 states and DC.
- Exact-year no-broad-income-tax profiles for applicable TY2024 through TY2026 paths.
- Audited California TY2024 single and married brackets from official FTB schedules.
- Unsupported state-year and filing-status combinations return an error.

### Explicit boundary

The project does not currently generate, sign, or transmit a tax return. It does not determine filing eligibility, implement every Form 1040 line or schedule, validate every dependency rule, or transmit MeF data.

## Phase 1: Federal Return Domain Model

- [ ] Introduce a versioned federal return domain model with explicit Form 1040 line mappings.
- [ ] Separate source documents, tax elections, derived values, worksheets, and final form outputs.
- [ ] Add taxpayer, spouse, dependent, residency, age, and filing-status eligibility validation.
- [ ] Model refundable and nonrefundable credits independently, including ACTC ordering and limits.
- [x] Implement planning-grade short-term and long-term capital-loss netting, annual limits, and carryovers.
- [ ] Implement qualified-dividend and capital-gain tax worksheets as first-class deterministic calculators.
- [x] Implement planning-grade QBI thresholds, SSTB phase-outs, wage limits, and qualified-property limits.
- [ ] Implement AMT preferential capital-gain treatment and Form 6251 worksheet ordering.
- [ ] Reject every unsupported federal election or schedule with a typed error.

## Phase 2: Forms and Schedules

- [ ] Produce deterministic internal representations for Form 1040 and required schedules.
- [ ] Add Schedule 1, Schedule 2, Schedule 3, Schedule A, Schedule B, Schedule C, Schedule D, Schedule E, Schedule SE, and Form 8949 support.
- [ ] Add education, retirement, HSA, foreign-tax, energy, adoption, and dependent-care forms as separate modules.
- [ ] Add source-document reconciliation for W-2 and supported 1099 forms.
- [ ] Add carryforward persistence as an explicit opt-in local data model.
- [ ] Add line-level citations and calculation traces for every generated value.

## Phase 3: State Coverage

- [ ] Add official filing-status-specific brackets for every graduated-tax jurisdiction.
- [ ] Add separate HoH, MFS, and qualifying-surviving-spouse paths where applicable.
- [ ] Add part-year resident and nonresident allocation models.
- [ ] Add local income taxes only where official jurisdiction data and allocation rules are modeled.
- [x] Version numeric state calculation profiles by tax year and source publication.
- [ ] Keep unsupported paths fail closed throughout expansion.

## Phase 4: Filing-Grade Verification

- [ ] Build IRS publication and worksheet fixtures for every supported path.
- [ ] Add golden returns that reconcile every form line and worksheet intermediate.
- [ ] Add differential checks against independent tax engines using non-sensitive synthetic cases.
- [ ] Add invariant, boundary, and rounding tests for all thresholds and phase-outs.
- [ ] Publish a support matrix that identifies each implemented form, schedule, election, and known exclusion.
- [ ] Require source citations and reviewer approval for every annual tax-data update.
- [ ] Add reproducible release attestations for code, data, tests, and package contents.

## Phase 5: Optional Filing and MeF

This phase begins only after the filing-grade verification gates are met.

- [ ] Evaluate IRS MeF Assurance Testing System requirements and enrollment timelines.
- [ ] Choose between direct authorized-transmitter operation and integration with an authorized provider.
- [ ] Add IRS schema generation and validation without allowing an LLM to calculate or mutate tax values.
- [ ] Add encryption, authentication, consent, retention, audit logging, incident response, and privacy controls for PII.
- [ ] Complete legal, security, operational, and taxpayer-support readiness reviews before accepting filing data.

## Engineering Quality Gates

- [x] TypeScript strict mode.
- [x] Exact direct dependency versions.
- [x] Stdio MCP smoke coverage.
- [x] Stateless Streamable HTTP with loopback and Origin protections.
- [x] IRS numeric regression tests for high-impact P0 defects.
- [ ] Zero known production dependency vulnerabilities at release time.
- [ ] Published support matrix generated from code-owned capability metadata.
- [ ] Independent calculation review for each newly supported tax form.

## Known Limitations

- TY2024 through TY2026 federal data are modeled from annual IRS and SSA sources.
- QBI and AMT are planning approximations for unsupported high-complexity paths.
- Most graduated states lack explicit married brackets, and state HoH and MFS brackets are not modeled.
- Local, part-year, nonresident, community-property, and multi-state allocation rules are incomplete.
- Credit screening data is broader than the set of credits calculated end to end.
- Retirement, relocation, audit-risk, and multi-year tools are planning aids, not return calculations.
- Refund estimates include only supplied payments and explicitly modeled refundable credits.

## Release History

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1.0 | 2026-02-17 | Initial 17 tools and TY2024/TY2025 federal estimates. |
| 0.2.0 | 2026-02-17 | NIIT, Additional Medicare Tax, QBI, CI, and npm release. |
| 0.3.0 | 2026-02-20 | AMT, EITC, OBBB data, and legacy SSE. |
| 0.5.0 | 2026-02-21 | Reports, planning tools, OBBB tools, and expanded integration tests. |
| 0.5.2 | 2026-02-23 | W-2 and self-employment wage-base coordination fix. |
| 0.6.0 | 2026-09-04 | P0 calculation corrections, fail-closed state estimates, dependency updates, and Streamable HTTP. |
