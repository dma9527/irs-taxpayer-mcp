<div align="center">

# 🏛️ irs-taxpayer-mcp

**The most thorough open-source tax assistant for US individual taxpayers — powered by Model Context Protocol.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/irs-taxpayer-mcp.svg)](https://www.npmjs.com/package/irs-taxpayer-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)

[English](README.md) | [中文](docs/README_zh.md) | [Español](docs/README_es.md) | [日本語](docs/README_ja.md)

</div>

---

> ⚠️ **Disclaimer**: This tool provides estimates for educational and informational purposes only. It does not constitute tax, legal, or financial advice. Always consult a qualified tax professional.

## Why This MCP?

Tax season is stressful. You're juggling W-2s, 1099s, deductions, credits, and trying to figure out if you should itemize or take the standard deduction. You Google "SALT deduction limit 2025" and get 10 conflicting articles.

This MCP server puts a tax-aware assistant right inside your AI chat. Ask it anything about your tax situation in plain language, and get precise, up-to-date answers — with all calculations running locally on your machine. No data leaves your computer. No IRS login needed. No SSN required.

It knows about the One Big Beautiful Bill Act (2025), the latest bracket adjustments, SALT cap changes, and every major credit and deduction. It's like having a knowledgeable friend who happens to be a tax nerd.

## 🔒 Privacy Architecture

| Layer                | Design                                              |
| -------------------- | --------------------------------------------------- |
| All tax calculations | 100% local execution — zero network calls           |
| User data storage    | Stateless — nothing saved between calls             |
| Authentication       | Zero credentials — no SSN, no IRS login             |
| Remote data          | Only public IRS info (form descriptions, deadlines) |
| Telemetry            | None — no analytics, no tracking, no logging        |
| Source code          | Fully open-source (MIT) — audit every calculation   |

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

**Cursor** — same format in Cursor's MCP settings.

### Step 2: Restart your AI assistant

After saving the config, restart the app. The MCP server will auto-download and connect.

### Step 3: Start asking tax questions

That's it. Just chat naturally:

- _"Calculate my federal tax: $150k income, married filing jointly, 2 kids"_
- _"Compare California vs Texas vs Washington for $200k income"_
- _"I'm a freelancer making $80k — what are my quarterly estimated taxes?"_
- _"What tax credits am I eligible for? AGI $60k, single, one child"_
- _"Should I itemize or take the standard deduction? I pay $15k in mortgage interest and $12k in state taxes"_
- _"Explain the Backdoor Roth IRA strategy"_
- _"How much is the EITC for a family of 4 earning $35k?"_
- _"I exercised ISOs this year — will I owe AMT?"_
- _"Help me plan my year-end tax moves. I have a 401k and HSA."_

### Alternative: Docker

```bash
docker build -t irs-taxpayer-mcp .
docker run -i irs-taxpayer-mcp
```

### Alternative: SSE Transport

```bash
npx irs-taxpayer-mcp --sse --port 3000
# Health check: http://localhost:3000/health
# SSE endpoint: http://localhost:3000/sse
```

</div>

## 🛠️ Tools (25)

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
| `get_retirement_accounts` | IRA, Roth, 401k, SEP, Solo 401k, HSA, 529 — limits, tax treatment, tips        |
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
| `get_state_tax_info`        | Rates, brackets, and details for all 50 states + DC                   |
| `estimate_state_tax`        | Estimate state tax liability with state-specific deductions           |
| `compare_state_taxes`       | Compare multiple states side-by-side (great for relocation decisions) |
| `list_no_income_tax_states` | All 9 states with no income tax                                       |

### IRS Information

| Tool                  | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `get_tax_deadlines`   | Key IRS dates and deadlines by tax year                            |
| `check_refund_status` | How to check your refund (guidance only — no IRS account access)   |
| `get_irs_form_info`   | Info about 14 common IRS forms (1040, W-2, 1099s, Schedules, etc.) |

## 📊 Tax Year Coverage

### TY2024 (filing now)

All data from IRS Revenue Procedure 2023-34. Standard deduction $14,600 (single) / $29,200 (MFJ). CTC $2,000. SALT cap $10,000.

### TY2025 (updated for One Big Beautiful Bill Act)

Reflects OBBB signed July 4, 2025:

- Standard deduction: $15,750 (single) / $31,500 (MFJ) / $23,625 (HoH)
- Child Tax Credit: $2,200 per child (up from $2,000)
- SALT cap: $40,000 for AGI ≤ $500K (was $10,000)
- New deductions: tips ($25K), overtime ($12.5K), senior bonus ($6K age 65+), auto loan interest ($10K)
- 401k catch-up: $11,250 for ages 60-63 (SECURE 2.0)

## 🧮 Calculation Engine

| Feature                                      | Status |
| -------------------------------------------- | ------ |
| Federal income tax (7 brackets × 4 statuses) | ✅     |
| Long-term capital gains (0%/15%/20%)         | ✅     |
| Self-employment tax (SS + Medicare)          | ✅     |
| Net Investment Income Tax (3.8% NIIT)        | ✅     |
| Additional Medicare Tax (0.9%)               | ✅     |
| Alternative Minimum Tax (AMT)                | ✅     |
| QBI Deduction (Section 199A)                 | ✅     |
| Child Tax Credit with phase-out              | ✅     |
| EITC precise calculation                     | ✅     |
| Standard vs itemized deduction               | ✅     |
| Year-specific SALT cap (OBBB)                | ✅     |
| State taxes (50 states + DC)                 | ✅     |
| 20+ federal tax credits                      | ✅     |
| Retirement accounts & strategies             | ✅     |
| W-4 withholding calculator                   | ✅     |

All data points cite IRS Revenue Procedures, IRC sections, and relevant legislation (TCJA, SECURE 2.0, OBBB).

## 🏗️ Build from Source

```bash
git clone https://github.com/dma9527/irs-taxpayer-mcp.git
cd irs-taxpayer-mcp
npm install
npm run build
npm start          # stdio mode
npm run dev        # development mode (tsx)
```

## 🤝 Contributing

Contributions welcome. Please ensure:

- All tests pass (`npm test`)
- Build succeeds (`npm run build`)
- No `any` types in TypeScript
- Data changes include IRS source citations

## 📄 License

[MIT](LICENSE)
