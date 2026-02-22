# Changelog

All notable changes to irs-taxpayer-mcp.

## [0.5.0] - 2026-02-21

### Added

- `get_tax_document_checklist` — personalized filing document checklist based on income sources and life events
- `optimize_capital_gains` — investment lot analysis with 0% bracket harvesting, tax-loss harvesting, wash sale warnings
- `plan_retirement_withdrawals` — optimal withdrawal order (Traditional/Roth/Taxable), RMD calculation, Roth conversion opportunity
- `plan_multi_year_taxes` — 3-5 year tax projection with bracket management, Roth conversion strategy, age milestones
- `analyze_relocation_taxes` — in-depth state relocation analysis with multi-year savings projection and SALT impact
- `simulate_tax_scenario` — what-if modeling for income changes, relocation, Roth conversion, 401k, filing status
- `assess_audit_risk` — IRS audit risk scoring (0-100) with 15+ red flag checks and mitigation tips
- `compare_mfj_vs_mfs` — MFJ vs MFS comparison with all MFS restriction warnings
- `calculate_obbb_deductions` — OBBB Act new deductions calculator (tips, overtime, senior bonus, auto loan)
- `what_changed_between_tax_years` — full year-over-year diff (brackets, deductions, credits, SALT, OBBB)
- `generate_full_tax_report` — TurboTax-style full report: income → deductions → federal → FICA → state → take-home → refund
- `process_1099_income` — process multiple 1099 forms (NEC, INT, DIV, B, MISC) with tax impact by category
- `get_personalized_tax_calendar` — personalized deadlines based on situation (self-employed, extension, investments)
- `analyze_paycheck` — verify paycheck withholding accuracy, project annual tax, suggest W-4 adjustments
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
- `calculate_eitc` — precise EITC calculation with phase-in/plateau/phase-out
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
- `calculate_total_tax` — combined federal + state tax
- `calculate_w4_withholding` — W-4 form recommendations
- `get_tax_planning_tips` — year-end optimization
- `compare_tax_years` — TY2024 vs TY2025 comparison
- `estimate_self_employment_tax` — full SE breakdown
- `analyze_mortgage_tax_benefit` — mortgage deduction analysis
- `analyze_education_tax_benefits` — AOTC vs LLC comparison
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
