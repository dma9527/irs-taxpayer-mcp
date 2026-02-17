<div align="center">

# 🏛️ irs-taxpayer-mcp

**MCP server for individual US taxpayers — federal/state tax calculations, credits, deductions, retirement strategies, and IRS information.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)

[English](README.md) | [中文](docs/README_zh.md) | [Español](docs/README_es.md) | [日本語](docs/README_ja.md)

</div>

---

> ⚠️ **Disclaimer**: This tool provides estimates for educational and informational purposes only. It does not constitute tax, legal, or financial advice. Always consult a qualified tax professional.

## 🔒 Privacy First

**Your financial data never leaves your machine.**

| Layer            | Design                                           |
| ---------------- | ------------------------------------------------ |
| Tax calculations | 100% local — no network calls                    |
| Data storage     | Stateless — nothing saved between calls          |
| Authentication   | Zero credentials required — no SSN, no IRS login |
| Remote data      | Only public IRS info (forms, deadlines)          |
| Telemetry        | None — no analytics, no tracking                 |

## 🛠️ Tools (17)

### Tax Calculations

| Tool                      | Description                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `calculate_federal_tax`   | Full federal tax with brackets, NIIT, Additional Medicare Tax, QBI deduction, SE tax, capital gains |
| `get_tax_brackets`        | Brackets and standard deduction by filing status                                                    |
| `compare_filing_statuses` | Compare tax across all filing statuses                                                              |
| `estimate_quarterly_tax`  | Estimated quarterly payments (1040-ES)                                                              |

### Deduction Analysis

| Tool                   | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `list_deductions`      | Browse deductions with eligibility and limits   |
| `standard_vs_itemized` | Compare standard vs itemized for your situation |

### Tax Credits

| Tool                       | Description                                                     |
| -------------------------- | --------------------------------------------------------------- |
| `list_tax_credits`         | 20+ federal credits: CTC, EITC, AOTC, EV, solar, saver's credit |
| `check_credit_eligibility` | Screening tool based on your situation                          |

### Retirement & Strategy

| Tool                      | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| `get_retirement_accounts` | IRA, Roth, 401k, SEP, Solo 401k, HSA, 529 details                   |
| `get_retirement_strategy` | Backdoor Roth, Mega Backdoor, Roth Ladder, Tax Loss/Gain Harvesting |

### State Taxes

| Tool                        | Description                               |
| --------------------------- | ----------------------------------------- |
| `get_state_tax_info`        | Rates and brackets for all 50 states + DC |
| `estimate_state_tax`        | Estimate state tax liability              |
| `compare_state_taxes`       | Compare states side-by-side               |
| `list_no_income_tax_states` | States with no income tax                 |

### IRS Information

| Tool                  | Description                                |
| --------------------- | ------------------------------------------ |
| `get_tax_deadlines`   | Key IRS dates and deadlines                |
| `check_refund_status` | How to check refund status (guidance only) |
| `get_irs_form_info`   | Info about common IRS forms                |

## ⚡ Quick Start

### Use with MCP Client

Add to your MCP client configuration (Claude Desktop, Kiro, Cursor, etc.):

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

### Build from Source

```bash
git clone https://github.com/dma9527/irs-taxpayer-mcp.git
cd irs-taxpayer-mcp
npm install
npm run build
npm start
```

## 💬 Example Prompts

Once connected, try asking your AI assistant:

- _"Calculate my federal tax: $150k income, married filing jointly, 2 kids"_
- _"Compare California vs Texas vs Washington for $200k income"_
- _"I'm a freelancer making $80k — what are my quarterly estimated taxes?"_
- _"What tax credits am I eligible for? AGI $60k, single, one child"_
- _"Explain the Backdoor Roth IRA strategy"_
- _"When is the tax filing deadline for 2024?"_

## 📊 Supported Tax Years

- **TY2024** — Current filing year
- **TY2025** — Forward-looking estimates

## 🧮 Calculation Coverage

| Feature                                      | Status     |
| -------------------------------------------- | ---------- |
| Federal income tax (7 brackets × 4 statuses) | ✅         |
| Long-term capital gains (0%/15%/20%)         | ✅         |
| Self-employment tax (SS + Medicare)          | ✅         |
| Net Investment Income Tax (3.8% NIIT)        | ✅         |
| Additional Medicare Tax (0.9%)               | ✅         |
| QBI Deduction (Section 199A)                 | ✅         |
| Child Tax Credit with phase-out              | ✅         |
| Standard vs itemized deduction               | ✅         |
| State taxes (50 states + DC)                 | ✅         |
| 20+ federal tax credits                      | ✅         |
| Retirement accounts & strategies             | ✅         |
| AMT (Alternative Minimum Tax)                | 🔲 Planned |

## 🧪 Testing

```bash
npm test          # run all tests
npm run test:watch  # watch mode
```

55 tests covering core calculation engine, data integrity, and edge cases.

## 🤝 Contributing

Contributions welcome. Please ensure:

- All tests pass (`npm test`)
- Build succeeds (`npm run build`)
- No `any` types in TypeScript

## 📄 License

[MIT](LICENSE)
