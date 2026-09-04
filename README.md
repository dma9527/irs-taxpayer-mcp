<div align="center">

# 🏛️ irs-taxpayer-mcp

**An open-source tax estimation and planning assistant for US individual taxpayers using Model Context Protocol.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/irs-taxpayer-mcp.svg)](https://www.npmjs.com/package/irs-taxpayer-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)

[English](README.md) | [中文](docs/README_zh.md) | [Español](docs/README_es.md) | [日本語](docs/README_ja.md)

</div>

---

> ⚠️ **Disclaimer**: This tool provides estimates for educational and informational purposes only. It does not constitute tax, legal, or financial advice. Always consult a qualified tax professional.

> **Legal Notice**: This software is provided "as is" without warranty of any kind. The authors and contributors are not tax professionals, CPAs, enrolled agents, or attorneys. No attorney-client, CPA-client, or fiduciary relationship is created by using this software. Tax laws change frequently and vary by jurisdiction. The calculations may contain errors, omissions, or may not reflect the most recent legislative changes. You are solely responsible for your tax filing decisions. The authors disclaim all liability for any damages arising from the use of this software. See [DISCLAIMER.md](DISCLAIMER.md) for full legal notice.

## Why This MCP?

Tax season is stressful. You're juggling W-2s, 1099s, deductions, credits, and trying to figure out if you should itemize or take the standard deduction. You Google "SALT deduction limit 2025" and get 10 conflicting articles.

This MCP server puts a tax-aware assistant inside your AI chat. Ask about a supported tax scenario in plain language and get deterministic estimates from versioned TY2024 through TY2026 data. Calculations run locally on your machine. No IRS login or SSN is required.

It includes OBBB provisions modeled for TY2025, federal brackets, selected credits and deductions, and explicitly supported state-tax paths. Unsupported state calculations fail closed instead of applying a rough top-rate estimate.

## 🔒 Privacy Architecture

| Layer                | Design                                              |
| -------------------- | --------------------------------------------------- |
| All tax calculations | 100% local execution: zero network calls           |
| User data storage    | Stateless: nothing saved between calls             |
| Authentication       | Zero credentials: no SSN, no IRS login             |
| Remote data          | Only public IRS info (form descriptions, deadlines) |
| Telemetry            | None: no analytics, no tracking, no logging        |
| Source code          | Fully open-source (MIT): audit every calculation   |

## ⚡ Getting Started

### Step 1: Add to your AI assistant

Add this to your MCP client configuration:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "irs-taxpayer": {
      "command": "npx",
      "args": ["-y", "irs-taxpayer-mcp"]
    }
  }
}
```

**Kiro** (`.kiro/settings/mcp.json`):

```json
{
  "mcpServers": {
    "irs-taxpayer": {
      "command": "npx",
      "args": ["-y", "irs-taxpayer-mcp"]
    }
  }
}
```

**Cursor**: same format in Cursor's MCP settings.

### Step 2: Restart your AI assistant

After saving the config, restart the app. The MCP server will auto-download and connect.

### Step 3: Start asking tax questions

That's it. Just chat naturally:

- _"Calculate my federal tax: $150k income, married filing jointly, 2 kids"_
- _"Compare California vs Texas vs Washington for $200k income"_
- _"I'm a freelancer making $80k: what are my quarterly estimated taxes?"_
- _"What tax credits am I eligible for? AGI $60k, single, one child"_
- _"Should I itemize or take the standard deduction? I pay $15k in mortgage interest and $12k in state taxes"_
- _"Explain the Backdoor Roth IRA strategy"_
- _"How much is the EITC for a family of 4 earning $35k?"_
- _"I exercised ISOs this year: will I owe AMT?"_
- _"Help me plan my year-end tax moves. I have a 401k and HSA."_

### Alternative: Docker

```bash
docker build -t irs-taxpayer-mcp .
docker run -i irs-taxpayer-mcp
```

### Alternative: Streamable HTTP Transport

```bash
npx irs-taxpayer-mcp --http --port 3000
# MCP endpoint: http://127.0.0.1:3000/mcp
# Health check: http://127.0.0.1:3000/health
```

HTTP mode is stateless and binds only to a loopback host by default. Browser requests must use an exact allowed Origin. Add a trusted browser Origin with a repeatable flag:

```bash
npx irs-taxpayer-mcp --http \
  --allowed-origin https://trusted-client.example
```

The legacy `--sse` flag remains a deprecated alias for `--http`. The old `/sse` and `/messages` endpoints are not exposed.

</div>

## 🛠️ Tools (43)

### Federal Tax Calculations

| Tool                       | What it does                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `calculate_federal_tax`    | Full federal tax with bracket breakdown, AMT, NIIT (3.8%), Additional Medicare Tax (0.9%), QBI deduction, SE tax, capital gains, CTC |
| `get_tax_brackets`         | Tax brackets and standard deduction by filing status and year                                                                        |
| `compare_filing_statuses`  | Side-by-side comparison of all 4 filing statuses for the same income                                                                 |
| `estimate_quarterly_tax`   | Estimated quarterly payments (1040-ES) with safe harbor guidance                                                                     |
| `calculate_total_tax`      | Combined federal + state tax in one call, with take-home pay and monthly income                                                      |
| `calculate_w4_withholding` | Per-paycheck withholding estimate with step-by-step W-4 form recommendations                                                         |

### Deduction Analysis

| Tool                   | What it does                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `list_deductions`      | Browse all deductions with eligibility rules, limits, and forms                             |
| `standard_vs_itemized` | Compare standard vs itemized with year-specific SALT cap ($10K for TY2024, $40K for TY2025) |

### Tax Credits

| Tool                       | What it does                                                              |
| -------------------------- | ------------------------------------------------------------------------- |
| `list_tax_credits`         | 20+ federal credits: CTC, EITC, AOTC, EV, solar, saver's credit, and more |
| `check_credit_eligibility` | Quick screening based on your income, family, and situation               |
| `calculate_eitc`           | Precise EITC calculation with phase-in/plateau/phase-out for 0-3 children |

### Retirement & Strategy

| Tool                      | What it does                                                                   |
| ------------------------- | ------------------------------------------------------------------------------ |
| `get_retirement_accounts` | IRA, Roth, 401k, SEP, Solo 401k, HSA, 529: limits, tax treatment, tips        |
| `get_retirement_strategy` | Backdoor Roth, Mega Backdoor, Roth Conversion Ladder, Tax Loss/Gain Harvesting |

### Tax Planning & Scenarios

| Tool                             | What it does                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `get_tax_planning_tips`          | Personalized year-end optimization: 401k maxing, HSA, Roth conversion, tax-loss harvesting, charitable bunching |
| `compare_tax_years`              | Compare TY2024 vs TY2025 to see how bracket changes and OBBB affect your tax                                    |
| `estimate_self_employment_tax`   | Full SE tax breakdown: Schedule C profit, SE tax, QBI deduction, quarterly payments, SEP/Solo 401k limits       |
| `analyze_mortgage_tax_benefit`   | Mortgage interest + property tax deduction analysis with year-specific SALT cap                                 |
| `analyze_education_tax_benefits` | AOTC vs Lifetime Learning Credit comparison, student loan deduction, 529 plan guidance                          |

### State Taxes

| Tool                        | What it does                                                          |
| --------------------------- | --------------------------------------------------------------------- |
| `get_state_tax_info`        | Reference data and notes for all 50 states + DC                      |
| `estimate_state_tax`        | Estimate supported state paths; unsupported bracket data fails closed |
| `compare_state_taxes`       | Compare states only when every requested calculation is supported     |
| `list_no_income_tax_states` | All 9 states with no broad individual income tax                      |

### IRS Information

| Tool                  | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `get_tax_deadlines`   | Key IRS dates and deadlines by tax year                            |
| `check_refund_status` | How to check your refund (guidance only: no IRS account access)   |
| `get_irs_form_info`   | Info about 14 common IRS forms (1040, W-2, 1099s, Schedules, etc.) |

### OBBB Act (2025) Tools

| Tool                             | What it does                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| `calculate_obbb_deductions`      | Calculate all 4 new OBBB deductions: tips, overtime, senior bonus, auto loan interest      |
| `what_changed_between_tax_years` | Diff any two supported years: brackets, deductions, credits, SALT, and OBBB provisions |

### Full Reports & Analysis

| Tool                            | What it does                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `generate_full_tax_report`      | Estimation report: income, deductions, federal, FICA, supported state tax, take-home, and refund inputs |
| `process_1099_income`           | Process multiple 1099 forms (NEC, INT, DIV, B, MISC) with tax impact by category              |
| `get_personalized_tax_calendar` | Personalized deadlines based on your situation (self-employed, extension, investments)        |
| `analyze_paycheck`              | Verify paycheck withholding accuracy, project annual tax, suggest W-4 adjustments             |
| `compare_mfj_vs_mfs`            | MFJ vs MFS comparison with tax diff and all MFS restriction warnings                          |
| `simulate_tax_scenario`         | What-if modeling: income changes, relocation, Roth conversion, 401k, filing status            |
| `assess_audit_risk`             | IRS audit risk scoring with red flag identification and mitigation tips                       |
| `get_tax_document_checklist`    | Personalized filing document checklist based on your income and life events                   |
| `optimize_capital_gains`        | Investment lot analysis: 0% bracket harvesting, tax-loss harvesting, wash sale warnings       |
| `plan_retirement_withdrawals`   | Optimal withdrawal order (Traditional/Roth/Taxable), RMD calculation, Roth conversion         |
| `plan_multi_year_taxes`         | 3-5 year tax projection with bracket management and age milestones                            |
| `analyze_relocation_taxes`      | In-depth state relocation analysis with multi-year savings and SALT impact                    |

### Guidance & Feedback

| Tool                    | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `run_tax_health_check`  | Report tool coverage and the freshness of built-in tax-year data   |
| `lookup_tax_rule`       | Search the built-in tax knowledge base                              |
| `get_form_filing_guide` | Provide step-by-step guidance for supported IRS forms               |
| `submit_feedback`       | Generate a prefilled GitHub issue link without transmitting tax data |

## 📊 Tax Year Coverage

### TY2024

Supported historical calculation year using IRS Revenue Procedure 2023-34. Standard deduction $14,600 (single) / $29,200 (MFJ). CTC $2,000. SALT cap $10,000.

### TY2025

Reflects OBBB signed July 4, 2025:

- Standard deduction: $15,750 (single) / $31,500 (MFJ) / $23,625 (HoH)
- Child Tax Credit: $2,200 per child (up from $2,000)
- SALT cap: $40,000 for AGI ≤ $500K (was $10,000)
- New deductions: tips ($25K), overtime ($12.5K), senior bonus ($6K age 65+), auto loan interest ($10K)
- 401k catch-up: $11,250 for ages 60-63 (SECURE 2.0)

### TY2026

Uses IRS Revenue Procedure 2025-32 and the SSA 2026 contribution and benefit base:

- Standard deduction: $16,100 (single) / $32,200 (MFJ) / $24,150 (HoH)
- Child Tax Credit: $2,200 per qualifying child, with up to $1,700 refundable
- SALT cap: $40,400 for MAGI up to $505,000; $20,200 and $252,500 for MFS
- Social Security wage base: $184,500
- Updated ordinary, capital-gains, EITC, and AMT thresholds

## Supported Scope and Boundaries

This project is a deterministic estimation and planning engine, not tax preparation or filing software.

- Federal estimates cover the modeled TY2024 through TY2026 inputs exposed by each tool. They do not implement every Form 1040 line, schedule, election, limitation, carryforward, or dependency rule.
- State reference information covers all 50 states and DC. Numeric estimates require an exact tax-year profile: TY2024 supports AK, CA, FL, NV, SD, TN, TX, and WY; TY2025 and TY2026 support AK, FL, NH, NV, SD, TN, TX, and WY. California TY2024 supports single and married brackets. Other state-year and filing-status paths return an error.
- State calculations do not yet model part-year or nonresident allocation, every local tax, or separate HoH and MFS brackets.
- QBI, AMT, audit-risk, retirement, relocation, and multi-year outputs are planning estimates with documented simplifications.
- Refund projections depend only on the inputs and refundable credits modeled by the selected tool. They are not an IRS refund determination.
- The server does not generate a tax return, sign a return, transmit MeF data, or provide filing eligibility validation.

See [ROADMAP.md](ROADMAP.md) for the remaining work toward a filing-grade federal return engine.

## 🧮 Calculation Engine

| Feature                                      | Status |
| -------------------------------------------- | ------ |
| Federal income tax (7 brackets × 4 statuses) | ✅     |
| Long-term capital gains (0%/15%/20%)         | ✅     |
| Self-employment tax (SS + Medicare)          | ✅     |
| Net Investment Income Tax (3.8% NIIT)        | ✅     |
| Additional Medicare Tax (0.9%)               | ✅     |
| Alternative Minimum Tax (AMT)                | Modeled with stated limitations |
| QBI Deduction (Section 199A)                 | Modeled with stated limitations |
| Child Tax Credit with phase-out              | ✅     |
| EITC TY2024/TY2025/TY2026 calculation               | ✅     |
| Standard vs itemized deduction               | ✅     |
| Year-specific SALT cap (OBBB)                | ✅     |
| State reference data (50 states + DC)        | ✅     |
| State numeric estimates                      | Supported paths only |
| 20+ federal credit reference and screening   | ✅     |
| Retirement account reference and planning    | Planning estimate |
| W-4 withholding calculator                   | Planning estimate |

Numeric regression tests cite IRS Revenue Procedures, IRC sections, and relevant legislation. Reference and planning tools may summarize rules that are not fully represented in the calculation engine.

## 🏗️ Build from Source

Requires Node.js 20 or later.

```bash
git clone https://github.com/dma9527/irs-taxpayer-mcp.git
cd irs-taxpayer-mcp
npm install
npm run build
npm start          # stdio mode
npm run dev        # development mode (tsx)
```

## 🐛 Found a Bug?

- **Calculation error or incorrect data?** [Open an issue](https://github.com/dma9527/irs-taxpayer-mcp/issues/new/choose): include the tool name, your inputs, and the expected result.
- **Questions or discussion?** [GitHub Discussions](https://github.com/dma9527/irs-taxpayer-mcp/discussions)
- **Want to contribute?** See [CONTRIBUTING.md](CONTRIBUTING.md)

## 🤝 Contributing

Contributions welcome. Please ensure:

- All tests pass (`npm test`)
- Build succeeds (`npm run build`)
- No `any` types in TypeScript
- Data changes include IRS source citations

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

## 📄 License

[MIT](LICENSE)
