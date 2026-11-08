# Changelog

All notable changes to irs-taxpayer-mcp.

## [Unreleased]

## [1.2.6] - 2026-11-08

### Fixed

- State tax for head of household and married filing separately filers used the single schedule for every state. TY2026 profiles now apply each state's own rules from official sources: CA Schedule Z, MA ($6,800 HoH exemption), NC ($19,125 HoH), NJ (Table B for HoH), MS (head of family $8,000 exemption and $3,400 deduction), RI ($16,800 HoH), NE (HoH schedule and $12,950), MN (HoH and MFS schedules, $23,000 HoH deduction, $110,325 MFS limit), KS ($6,180 HoH, $4,120 MFS), and ND (HoH and MFS schedules). For example a Minnesota HoH with $100,000 AGI now owes $4,641 instead of $5,277. A TY2026 state profile without verified HoH or MFS rules returns an error instead of falling back to single.
- Tools now pass the real federal filing status to the state calculator, and `estimate_state_tax` and `compare_state_taxes` accept `married_filing_jointly`, `married_filing_separately`, and `head_of_household` (`married` still means joint).

## [1.2.5] - 2026-11-06

### Added

- TY2026 numeric profiles for MS (4% above the first $10,000, exemptions and standard deduction from the Mississippi DOR), RI (Division of Taxation ADV 2025-22 schedule, $11,200 / $22,400 standard deduction, $5,250 exemption), and NE (Nebraska DOR Rate Chronologies Rev. 2-2026 brackets, 4.55% top rate, $8,850 / $17,700 standard deduction, $176 personal exemption credit).
- TY2026 numeric profiles for MN (DOR 2026 brackets, $15,300 / $30,600 standard deduction; AGI above $220,650 returns an error because the indexed standard deduction reduction is not modeled) and KS (2026 K-40ES schedules and standard deduction, $9,160 / $18,320 exemption under K.S.A. 79-32,121).
- TY2026 numeric profile for ND (2026 Form ND-1ES schedules: 0%, 1.95%, 2.50%) applied to federal taxable income. Tools that compute federal tax now pass federal taxable income to the state calculator, and `estimate_state_tax` and `compare_state_taxes` accept `federalTaxableIncome`; North Dakota without it returns an error.
- State profiles can carry a nonrefundable personal credit (Nebraska) and a maximum modeled income. Rhode Island income above $261,000 returns an error because the standard deduction and exemption phase-out is not modeled.
- Added a static landing page at https://dma9527.github.io/irs-taxpayer-mcp/ deployed by GitHub Pages from the `site/` directory only. It loads no scripts, fonts, trackers, or third-party resources, and tests keep its example numbers equal to the engine's output.
- Added a share preview image for the landing page.

### Changed

- Rewrote the Chinese, Spanish, and Japanese READMEs to match the English structure: year-end framing, a 30-second local quick start with a verified example, a decision table, and an accurate privacy boundary. Added TY2026 details and scope limits.
- Added a website link to the README language navigation.

## [1.2.4] - 2026-11-03

### Fixed

- Additional Medicare Tax used gross self-employment profit instead of SE net earnings (92.35%, Form 8959 line 8). It was overstated for anyone with SE income above the threshold; for example single with $190,000 wages and $30,000 SE profit now owes $159.35, not $180. Found by the new golden worksheet cases.

### Added

- 50 TY2026 golden worksheet cases (`scripts/golden/`, `src/golden/`) worked from the QDCG worksheet, Form 6251, Schedule 8812, Form 2441, Schedule SE, Forms 8959 and 8960, and Schedule 1-A by an independent standard-library script. They run in CI and match within $1.
- TY2026 numeric profiles for GA (4.99%, $15,000 / $30,000 standard deduction per Georgia DOR), OH ($332 plus 2.75% above $26,050 under ORC 5747.02 with income-tiered exemptions), VA (58.1-320 schedule, $8,750 / $17,500 standard deduction, $930 exemption), and NJ (2026 Table A and Table B, $1,000 exemption).
- `estimate_premium_tax_credit` handles monthly allocation for part-year or changing coverage (Form 8962 lines 12 to 23), the below-100% exception when the Marketplace estimated at least 100% and APTC was paid, and MFS Exception 2. MFS without the exception now returns full APTC repayment instead of an error.

## [1.2.3] - 2026-11-03

### Fixed

- `optimize_capital_gains` claimed that harvested losses always saved tax on gains. Losses now net against gains taxed above 0% first, and the tool warns when the rest would only offset 0% gains in the same year.
- `optimize_capital_gains` used the $3,000 capital loss limit for married filing separately. It now uses $1,500, shared with the federal calculator.

### Changed

- Release workflow now waits up to 10 minutes for npm to finish processing a published tarball before failing. The 1.1.0 release exceeded the previous 2-minute window.
- Updated stale 44-tool counts in the roadmap and promotion plan to 45.
- CI now pins `actions/checkout` and `actions/setup-node` to the same Node 24 commit SHAs as the release workflow and runs with read-only repository permissions.
- The monthly dashboard now uploads its snapshot with `actions/upload-artifact` v6.0.0, which runs on Node 24 instead of the deprecated Node 20 runtime.
- Rewrote the README first screen around year-end decisions, a 30-second local quick start, a verified example plan, and a decision table. The legal notice moved to the end.

## [1.2.2] - 2026-11-01

### Fixed

- `analyze_paycheck` ignored the Child Tax Credit and other credits when projecting annual tax, so parents were told they over-withheld. It now accepts qualifying children, other dependents, age 65 status, and annual Schedule 1-A tips and overtime.
- `simulate_tax_scenario` could not take TY2026 facts and did not add back SALT for AMT. Both scenarios now share itemized SALT, charitable, senior, Schedule 1-A, and dependent care facts, and the comparison shows AMT when it applies.

### Added

- TY2026 Kentucky profile: 3.5% (KRS 141.020) and the $3,360 standard deduction (KRS 141.081), one deduction per joint return.
- Ten more Tax-Calculator differential scenarios (MFS SALT cap, EITC with 2 and 3 children, NIIT, the 2026 charitable floor and 2/37 limit, dependent care, high LTCG, seniors). 53 of 53 match within $1.

## [1.2.1] - 2026-11-01

### Fixed

- `generate_full_tax_report`, `run_tax_health_check`, and `analyze_mortgage_tax_benefit` did not add back capped SALT for AMT (Form 6251 line 2a). AMT was understated for itemizers; for example TY2026 HoH with $240,000 wages, $300,000 LTCG, and $60,000 SALT now shows $1,945 AMT, matching PSL Tax-Calculator.
- `generate_full_tax_report` did not apply the TY2026 0.5% of AGI charitable floor and could not take TY2026 facts. It now accepts non-itemizer cash gifts, age 65 status, Schedule 1-A amounts, dependent care, and material participation, and shows the related deductions and credits.
- `generate_full_tax_report` QBI note used TY2024 thresholds for every year.
- `run_tax_health_check` and `get_tax_document_checklist` still suggested EV and new solar credits that OBBB ended for TY2026.

### Added

- `generate_tax_plan` and the local intake accept `deductions.itemizedStateAndLocalTaxes`, the capped SALT inside the itemized total, for the AMT add-back. Values above the itemized total are rejected.
- `estimate_premium_tax_credit` supports the 2025 HHS Alaska and Hawaii poverty lines (90 FR 5917).
- TY2026 numeric profiles for MI (4.25% per the Treasury notice of April 15, 2026; $5,900 exemption) and IN (2.95%; $1,000 exemption). City and county income taxes are not included.
- `run_tax_health_check` reports AMT when it applies.
- Two SALT add-back scenarios in the Tax-Calculator differential test (43 of 43 match).

## [1.2.0] - 2026-11-01

### Fixed

- AMT exemption phase-out now uses 50 cents per dollar from TY2026 (OBBB), instead of 25 cents for every year.
- AMT income now adds back the standard deduction for non-itemizers (Form 6251 line 2a). AMT was understated for every standard-deduction filer.
- EITC phase-in credit is now capped by the AGI phase-out (IRC 32(a)(2)); it was overstated when AGI exceeded earned income.
- TY2026 planning tools used TY2025 401(k), HSA, SEP, and Solo 401(k) limits. All limits now come from one year-keyed table.
- Self-employed SEP limit now uses 20% of net earnings after the half SE tax deduction, not 25% of net profit (Pub. 560).
- The tax-gain harvesting tip now uses the 0% capital-gain threshold for the selected year and filing status.
- AMT capital-gain bands now stack on regular ordinary taxable income and cap at the flat 26%/28% tax (Form 6251 Part III lines 20, 27, 40). AMT was overstated for large preferential income.
- `get_tax_deadlines` failed by default because TY2026 had no deadline data.
- `check_credit_eligibility` used TY2024 CTC and EITC limits for every year and still offered EV and home energy credits that OBBB ended for TY2026.
- `calculate_w4_withholding` Step 3 used $2,000 per child for every year; the 2026 Form W-4 uses $2,200.
- Student loan interest phase-outs used TY2024 ranges for every year. They are now year-keyed: TY2026 $85,000 to $100,000 ($175,000 to $205,000 MFJ) per Rev. Proc. 2025-32 sec. 3.29. `analyze_education_tax_benefits` accepts `taxYear`.
- Saver's Credit screening used TY2024 AGI limits for every year. TY2026 limits are $40,250, $60,375 HoH, and $80,500 MFJ (Notice 2025-67).
- Reference text now covers TY2026 values for the gift exclusion and lifetime exemption, the qualifying relative income test ($5,300), the SALT cap, MFS IRA and 0% bracket comparisons, and the W-4 child amount.
- README state support list omitted California for TY2026; translated READMEs still listed 44 tools.

### Security

- Upgraded `@modelcontextprotocol/sdk` to 1.32.2 and `zod` to 4.6.7, and refreshed transitive packages. `npm audit` reported 9 production advisories, including a critical one in `proxy-addr`. It now reports 0.
- Upgraded `vitest` to 4.1.12 for two moderate `@vitest/mocker` advisories (development only).
- Under zod 4, published tool input schemas drop `additionalProperties: false` on non-strict objects and add safe-integer bounds to integer fields. Tool behavior is unchanged.

### Added

- TY2026 non-itemizer cash charitable deduction ($1,000 single, $2,000 MFJ), 0.5% of AGI itemized charitable floor, and the IRC 68 2/37 itemized deduction limit.
- Child and Dependent Care Credit (Form 2441) calculation with the TY2026 50% schedule and second phase-down.
- TY2026 retirement and HSA contribution limits (Notice 2025-67, Rev. Proc. 2025-19).
- TY2026 numeric state profiles for MA (5% plus 4% surtax), IL, PA, and NC.
- Schedule 1-A deductions (tips, overtime, vehicle loan interest, senior) inside the federal calculation, with the senior deduction added back for AMT.
- TY2026 $400 minimum QBI deduction for materially participating taxpayers (IRC 199A(i)).
- TY2026 filing deadlines.
- TY2026 California profile from the FTB October 2026 schedules, including the 1% Mental Health Services Tax.
- `estimate_premium_tax_credit` (tool 45): TY2026 Premium Tax Credit from Rev. Proc. 2025-25, 2025 HHS poverty guidelines, the 400% limit, and full repayment of excess advance payments.
- Year-keyed law change registry (`src/data/law-changes.ts`). `what_changed_between_tax_years` now lists TY2025 and TY2026 rule changes in separate sections with citations, primary-source links, and whether each change is calculated, reference only, or not modeled.
- New inputs on `calculate_federal_tax`, `standard_vs_itemized`, `generate_tax_plan`, and the local intake.
- Optional differential test against PSL Tax-Calculator 6.8.5 (`scripts/differential/`). 41 synthetic TY2024 to TY2026 scenarios match within $1. It does not run in CI.

## [1.1.0] - 2026-09-18

### Added

- Added strict versioned `TaxpayerFacts` schemas that reject identity and unknown fields at every object level.
- Added direct local `intake`, `template`, `validate`, and `plan` commands that bypass MCP and model invocation.
- Added local JSON import with a 1 MiB limit, symbolic-link rejection, private `0600` POSIX output, overwrite protection, and value-redacted validation errors.

### Changed

- Extracted the deterministic tax-plan service from the MCP tool so direct CLI and MCP adapters share one calculation path.
- Scoped privacy metadata with `modelInvoked: false` for direct CLI and `true` for MCP calls.
- Corrected public privacy documentation to distinguish local engine guarantees from MCP client and model-provider behavior.

### Security

- Direct local commands make no tax-data network requests, start no MCP connection, invoke no model, and emit no telemetry.
- Local facts files do not accept names, SSNs, addresses, employer IDs, or account numbers.

### Tests

- Expanded the suite to 315 tests across 15 test files with schema, import, permissions, redaction, retirement-zero, symlink, questionnaire, and real binary regressions.

## [1.0.2] - 2026-09-07

### Added

- Added a monthly and manually runnable Planner Feedback dashboard that updates a GitHub Issue from reviewed labels, public npm downloads, aggregate resource variables, quality timing, privacy incidents, and the filing-engine gate.
- Added monthly aggregate JSON artifacts and idempotent per-month snapshot comments without reading or reproducing issue bodies.

### Fixed

- Corrected stale full-report wording that claimed AMT did not preserve preferential rates for qualified dividends and net capital gains.
- Centralized the AMT planning note so direct calculations and full reports cannot drift independently.

### Tests

- Expanded the suite to 297 tests across 13 test files with privacy, aggregation, workflow contracts, qualified-dividend AMT equivalence, AMT preferential-income caps, and independent TY2026 calculation regressions.

## [1.0.1] - 2026-09-04

### Fixed

- Updated release automation to parse both npm 11 array and npm 12 keyed-object `npm pack --json` output.

### Tests

- Expanded the post-tag suite to 288 tests across 12 test files with npm 11 and npm 12 pack metadata fixtures.

## [1.0.0] - 2026-09-04

### Added

- Added `generate_tax_plan`, a deterministic local workflow with domain structured results, privacy guarantees, assumptions, official source provenance, a calculation trace, and explicit unsupported boundaries.
- Added separate CTC and EITC child facts, EITC investment-income handling, required retirement and QBI planning facts, and fail-closed exact-year state planning.
- Added a privacy-safe Planner Feedback issue form and an executable filing-engine investment gate requiring paid demand, discovery interviews, a tax-domain partner, engineering capacity, and an annual maintenance owner.
- Added a tag-driven OIDC release workflow for npm, GitHub Releases, and the MCP Registry, including exact-tarball smoke and post-publish verification.
- Added release metadata consistency tests and maintainer release documentation.

### Changed

- Expanded the server to 44 tools and made the runtime version a shared source for server and feedback metadata.
- Updated English, Chinese, Spanish, and Japanese documentation for TY2024 through TY2026 planning scope.

### Security

- The flagship planner performs no network requests, persistence, or telemetry and rejects unsupported tax years, state profiles, and required worksheet facts.
- Release publishing uses short-lived OIDC credentials and pinned, checksum-verified release dependencies instead of long-lived publish tokens.

### Tests

- Expanded the suite to 286 tests across 12 test files, including real MCP planner contracts, privacy assertions, capital-loss normalization and carryover limits, EITC boundaries, required-fact rejection, release gates, and filing-engine gate decisions.

## [0.6.0] - 2026-09-04

### Added

- Added structured tool output contracts, typed error metadata, a 43-tool schema snapshot, and 10 stable agent evaluations.

### Changed

- Migrated all 43 tools from deprecated `server.tool` registration to SDK `registerTool` through a shared read-only contract wrapper.
- Every tool now advertises read-only, non-destructive, idempotent, closed-world annotations and returns both text content and structured content.
- Updated `@modelcontextprotocol/sdk` to 1.30.0.
- Kept `--sse` only as a deprecated alias for `--http`; removed the old `/sse` and `/messages` routes.
- Corrected CLI, health, and documentation tool counts to 43.
- Clarified that the project is an estimation and planning engine, not tax filing software.
- Documented supported state-calculation paths and fail-closed behavior.
- Set Node.js 20 as the minimum supported runtime and updated CI to Node 20, 22, and 24.

### Fixed

- Corrected the TY2025 SALT enhanced-cap phase-down to 30% of excess MAGI, including MFS thresholds and floors.
- Updated high-level reports and relocation analysis to use calculated AGI for SALT phase-downs, and AGI for the medical-expense floor.
- Added short-term and long-term capital-loss netting, the $3,000 annual deduction ($1,500 MFS), and character-preserving carryforward outputs.
- Kept qualified dividends outside capital-loss netting while preserving preferential-rate treatment.
- Added annual Section 199A thresholds, W-2 wage and qualified-property limits, expanded TY2026 phase-in ranges, and SSTB phase-outs with missing-fact rejection.
- Applied AMT preferential rates to qualified dividends and net capital gains while preserving the QBI deduction in AMTI.
- Added Publication 915 taxable Social Security benefit calculations, MFS living-arrangement handling, taxable 1099-R distributions, and user-supplied early-distribution penalty bases.
- Added Form 8863 AOTC and Lifetime Learning Credit calculations, MAGI phase-outs, refundable AOTC eligibility, MFS rejection, and credit ordering before CTC/ACTC limits.
- Corrected Section 199A ordering so the overall taxable-income limit applies after wage, property, and SSTB phase-in reductions.
- Added an explicit full net-investment-income input so NIIT includes taxable interest, dividends, gains, rents, royalties, and passive income without double-counting gains.
- Added Schedule 8812 planning support for qualifying-child CTC, nonrefundable ODC, refundable ACTC, the three-child payroll-tax method, and Form 2555 exclusion with explicit limitations.
- Corrected the ACTC cap to use combined unused CTC and ODC liability, while keeping ODC nonrefundable.
- Replaced the ambiguous internal state taxable-income contract with explicit pre-deduction income, while retaining a deprecated compatibility alias for MCP clients.
- Added TY2026 ordinary and capital-gains brackets, deductions, CTC, EITC, AMT, SALT, and Social Security wage-base data from official IRS and SSA sources.
- Modeled the AMT 28% rate threshold separately for MFS and other filing statuses.
- Versioned numeric state calculation profiles by tax year and source, requiring direct and high-level callers to select an exact supported state-year path.
- Updated California TY2024 single and married brackets to the official FTB schedules and removed unverified state profiles from numeric calculations.
- Removed silent annual-data reuse from multi-year and relocation projections; unsupported future years now return an error.
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

### Tests

- Added federal, Schedule A, full-report, TY2026 annual-data, EITC, and MCP regressions for the planning-grade corrections.
- Expanded the suite to 273 tests across 10 test files.
- Added IRS numeric regressions for EITC, capital gains, QBI, CTC ordering, refundable credits, OBBB deductions, and state brackets.
- Added HTTP security, health, initialization, and real `tools/list` coverage.

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
