# irs-taxpayer-mcp

MCP server for individual US taxpayers — federal/state tax calculations, 20+ credits & deductions, retirement strategies, and IRS information.

## Privacy & Security

**Hybrid architecture**:

- 🔒 **Local**: All tax calculations run on your machine. Your income, deductions, and financial data **never leave your computer**
- 🌐 **Remote**: Only public IRS data (forms, deadlines) is fetched from official IRS endpoints. No authentication or PII involved

## Tools (17 total)

### Tax Calculations (local)

- `calculate_federal_tax` — Full federal tax with bracket breakdown, effective/marginal rates, SE tax, capital gains, CTC
- `get_tax_brackets` — Brackets and standard deduction by filing status
- `compare_filing_statuses` — Compare tax across all filing statuses
- `estimate_quarterly_tax` — Estimated quarterly payments (1040-ES)

### Deduction Analysis (local)

- `list_deductions` — Browse deductions with eligibility and limits
- `standard_vs_itemized` — Compare standard vs itemized for your situation

### Tax Credits (local)

- `list_tax_credits` — 20+ federal credits: CTC, EITC, AOTC, EV, solar, saver's credit, and more
- `check_credit_eligibility` — Screening tool based on your situation

### Retirement & Strategy (local)

- `get_retirement_accounts` — IRA, Roth, 401k, SEP, Solo 401k, HSA, 529 details and limits
- `get_retirement_strategy` — Backdoor Roth, Mega Backdoor Roth, Roth Conversion Ladder, Tax Loss/Gain Harvesting

### State Taxes (local)

- `get_state_tax_info` — Rates and brackets for all 50 states + DC
- `estimate_state_tax` — Estimate state tax liability
- `compare_state_taxes` — Compare states side-by-side (great for relocation)
- `list_no_income_tax_states` — States with no income tax

### IRS Information (public data)

- `get_tax_deadlines` — Key IRS dates and deadlines
- `check_refund_status` — How to check refund status (guidance only)
- `get_irs_form_info` — Info about common IRS forms

## Setup

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

## Supported Tax Years

TY2024, TY2025

## Disclaimer

⚠️ This tool provides estimates for **educational and informational purposes only**. It does not constitute tax, legal, or financial advice. Always consult a qualified tax professional.

## License

MIT
