# Changelog

All notable changes to irs-taxpayer-mcp.

## [Unreleased]

### Fixed

- Corrected the TY2025 SALT enhanced-cap phase-down to 30% of excess MAGI, including MFS thresholds and floors.
- Updated high-level reports and relocation analysis to use calculated AGI for SALT phase-downs, and AGI for the medical-expense floor.
- Added short-term and long-term capital-loss netting, the $3,000 annual deduction ($1,500 MFS), and character-preserving carryforward outputs.
- Kept qualified dividends outside capital-loss netting while preserving preferential-rate treatment.
- Added annual Section 199A thresholds, W-2 wage and qualified-property limits, expanded TY2026 phase-in ranges, and SSTB phase-outs with missing-fact rejection.
- Added an explicit full net-investment-income input so NIIT includes taxable interest, dividends, gains, rents, royalties, and passive income without double-counting gains.
- Added Schedule 8812 planning support for qualifying-child CTC, nonrefundable ODC, refundable ACTC, the three-child payroll-tax method, and Form 2555 exclusion with explicit limitations.
- Corrected the ACTC cap to use combined unused CTC and ODC liability, while keeping ODC nonrefundable.
- Replaced the ambiguous internal state taxable-income contract with explicit pre-deduction income, while retaining a deprecated compatibility alias for MCP clients.
- Added TY2026 ordinary and capital-gains brackets, deductions, CTC, EITC, AMT, SALT, and Social Security wage-base data from official IRS and SSA sources.
- Modeled the AMT 28% rate threshold separately for MFS and other filing statuses.
- Versioned numeric state calculation profiles by tax year and source, requiring direct and high-level callers to select an exact supported state-year path.
- Updated California TY2024 single and married brackets to the official FTB schedules and removed unverified state profiles from numeric calculations.
- Removed silent annual-data reuse from multi-year and relocation projections; unsupported future years now return an error.

### Tests

- Added federal, Schedule A, full-report, TY2026 annual-data, EITC, and MCP regressions for the planning-grade corrections.
- Expanded the suite to 252 tests across 9 test files.

## [0.6.0] - 2026-09-04

### Fixed

- Corrected TY2024 and TY2025 EITC parameters using IRS Revenue Procedures 2023-34 and 2024-40.
- Applied unused deductions before taxing long-term capital gains.
- Excluded net capital gain from the QBI overall taxable-income limit.
- Prevented nonrefundable CTC from offsetting self-employment tax, NIIT, or Additional Medicare Tax.
- Treated qualified dividends as preferential-rate income in the full tax report.
- Preserved refundable EITC and signed federal tax values in refund estimates.
- Selected Social Security wage bases and FICA rates from the requested tax year.
- Improved MFJ versus MFS dependent allocation and mandatory itemization behavior.
- Corrected OBBB tips, overtime, senior, and auto-loan phase-outs.
- Removed graduated-state top-rate fallback calculations, added California TY2024 married brackets, and applied its $1M mental-health surcharge threshold.
- Returned typed MCP errors from high-level reports and planning tools when state bracket data is unavailable.
- Limited MFJ versus MFS dependent-allocation search to 20 dependents to prevent unbounded synchronous work.

### Security

- Replaced shared legacy SSE state with a stateless Streamable HTTP server at `POST /mcp`.
- Restricted HTTP binding to loopback hosts and enabled SDK Host validation.
- Added exact browser Origin allowlists and rejected malformed Origin configuration.
- Pinned MCP SDK, Zod, TypeScript, Vitest, tsx, and type packages to exact versions.

### Changed

- Updated `@modelcontextprotocol/sdk` to 1.30.0.
- Kept `--sse` only as a deprecated alias for `--http`; removed the old `/sse` and `/messages` routes.
- Corrected CLI, health, and documentation tool counts to 43.
- Clarified that the project is an estimation and planning engine, not tax filing software.
- Documented supported state-calculation paths and fail-closed behavior.
- Set Node.js 20 as the minimum supported runtime and updated CI to Node 20, 22, and 24.

### Tests

- Added IRS numeric regressions for EITC, capital gains, QBI, CTC ordering, refundable credits, OBBB deductions, and state brackets.
- Added HTTP security, health, initialization, and real `tools/list` coverage.
- Expanded the suite to 197 tests across 9 test files.

## [0.5.2] - 2026-02-23

### Fixed

- SE tax now correctly coordinates with W-2 income for SS wage base (was overcharging filers with both W-2 and SE income)
- Tool count inconsistencies in stdio/SSE logs and usage guide

### Added

- IRS Tax Table verification tests (exact dollar amounts for TY2024/TY2025)
- QBI and AMT simplification warnings in tool output
- CONTRIBUTING.md with development setup and PR guidelines
- "Found a Bug?" section in README with issue/discussion links

## [0.5.0] - 2026-02-21

### Added

- `get_tax_document_checklist`: personalized filing document checklist based on income sources and life events
- `optimize_capital_gains`: investment lot analysis with 0% bracket harvesting, tax-loss harvesting, wash sale warnings
- `plan_retirement_withdrawals`: optimal withdrawal order (Traditional/Roth/Taxable), RMD calculation, Roth conversion opportunity
- `plan_multi_year_taxes`: 3-5 year tax projection with bracket management, Roth conversion strategy, age milestones
- `analyze_relocation_taxes`: in-depth state relocation analysis with multi-year savings projection and SALT impact
- `simulate_tax_scenario`: what-if modeling for income changes, relocation, Roth conversion, 401k, filing status
- `assess_audit_risk`: IRS audit risk scoring (0-100) with 15+ red flag checks and mitigation tips
- `compare_mfj_vs_mfs`: MFJ vs MFS comparison with all MFS restriction warnings
- `calculate_obbb_deductions`: OBBB Act new deductions calculator (tips, overtime, senior bonus, auto loan)
- `what_changed_between_tax_years`: full year-over-year diff (brackets, deductions, credits, SALT, OBBB)
- `generate_full_tax_report`: full report covering income, deductions, federal tax, FICA, state tax, take-home pay, and refund inputs
- `process_1099_income`: process multiple 1099 forms (NEC, INT, DIV, B, MISC) with tax impact by category
- `get_personalized_tax_calendar`: personalized deadlines based on situation (self-employed, extension, investments)
- `analyze_paycheck`: verify paycheck withholding accuracy, project annual tax, suggest W-4 adjustments
- Verified local tax data for NYC, Philadelphia, Detroit, Maryland counties, Ohio cities, Indiana counties
- Usage guide (`docs/USAGE_GUIDE.md`) with 7 common workflows
- Integration tests for all 39 tools (136 total tests)

### Changed

- TY2025 data updated for One Big Beautiful Bill Act (OBBB, signed July 4, 2025):
  - Standard deduction: $15,750 single / $31,500 MFJ / $23,625 HoH
  - CTC: $2,200 per child (was $2,000)
  - SALT cap: $40,000 for AGI ≤ $500K ($20,000 MFS)
  - New OBBB deductions data: senior $6K, tips $25K, overtime $12.5K, auto loan $10K
- SALT cap now parameterized by tax year via `getSaltCap()` function
- Credit descriptions (CTC, EITC, adoption) now show year-specific values
- 401k catch-up rules updated for SECURE 2.0 (ages 60-63)
- State tax tool now displays local tax rate tables when available

## [0.4.0] - 2026-02-21

### Added

- Same as 0.5.0 initial batch (tools 28-34)

## [0.3.1] - 2026-02-20

### Added

- AMT (Alternative Minimum Tax) calculation with ISO spread and SALT add-back
- `calculate_eitc`: precise EITC calculation with phase-in/plateau/phase-out
- SSE transport support (`--sse` flag with `/health` endpoint)
- IRS Revenue Procedure citations on all data files
- 26 automated data validation tests
- Dockerfile for containerized deployment
- Integration docs for Claude Desktop, Kiro, Cursor (`docs/INTEGRATION.md`)

### Changed

- TY2025 standard deduction updated to OBBB values
- CTC updated to $2,200 for TY2025
- SALT cap parameterized ($40K for TY2025)

## [0.3.0] - 2026-02-17

### Added

- SSE transport, IRS source references, data validation tests
- Published to npm as v0.3.0

## [0.2.0] - 2026-02-17

### Added

- NIIT (3.8% Net Investment Income Tax)
- Additional Medicare Tax (0.9%)
- QBI deduction (Section 199A)
- Short-term capital gains support
- `calculate_total_tax`: combined federal + state tax
- `calculate_w4_withholding`: W-4 form recommendations
- `get_tax_planning_tips`: year-end optimization
- `compare_tax_years`: TY2024 vs TY2025 comparison
- `estimate_self_employment_tax`: full SE breakdown
- `analyze_mortgage_tax_benefit`: mortgage deduction analysis
- `analyze_education_tax_benefits`: AOTC vs LLC comparison
- Expanded state tax brackets (CT, DE, HI, MN, MO, NJ, OR)
- 55 unit tests (vitest)
- GitHub Actions CI (Node 18/20/22)
- Multi-language README (zh, es, ja)
- MIT LICENSE file
- npm published

## [0.1.0] - 2026-02-17

### Added

- Initial release: 17 MCP tools
- Federal tax calculation with bracket breakdown
- Long-term capital gains tax
- Self-employment tax
- Child Tax Credit with phase-out
- Standard vs itemized deduction comparison
- Quarterly estimated tax
- Filing status comparison
- 20+ federal tax credits database
- 8 itemized + 5 above-the-line deductions
- 14 IRS form descriptions
- 7 retirement accounts (IRA, Roth, 401k, SEP, Solo 401k, HSA, 529)
- 5 retirement strategies (Backdoor Roth, Mega Backdoor, etc.)
- State tax data for all 50 states + DC
- IRS deadlines for TY2024 and TY2025
- TY2024 and TY2025 tax bracket data
