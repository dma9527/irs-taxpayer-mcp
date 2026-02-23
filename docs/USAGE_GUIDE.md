# Usage Guide — irs-taxpayer-mcp

A practical guide to getting the most out of the 39 tax tools.

## Quick Reference: Which Tool to Use

| I want to...                              | Use this tool                    |
| ----------------------------------------- | -------------------------------- |
| Calculate my federal tax                  | `calculate_federal_tax`          |
| See my total tax (federal + state + FICA) | `generate_full_tax_report`       |
| Compare states for relocation             | `compare_state_taxes`            |
| Check if I should itemize                 | `standard_vs_itemized`           |
| See what credits I qualify for            | `check_credit_eligibility`       |
| Calculate my EITC                         | `calculate_eitc`                 |
| Plan year-end tax moves                   | `get_tax_planning_tips`          |
| Compare MFJ vs MFS                        | `compare_mfj_vs_mfs`             |
| Process my 1099 forms                     | `process_1099_income`            |
| Check my paycheck withholding             | `analyze_paycheck`               |
| Model a what-if scenario                  | `simulate_tax_scenario`          |
| See what changed in 2025                  | `what_changed_between_tax_years` |
| Calculate OBBB new deductions             | `calculate_obbb_deductions`      |
| Check my audit risk                       | `assess_audit_risk`              |
| Get my tax deadlines                      | `get_personalized_tax_calendar`  |
| Understand a Roth strategy                | `get_retirement_strategy`        |

## Common Workflows

### Workflow 1: "How much tax do I owe?"

Start with the full report for a complete picture:

> "Generate a full tax report: $120K W-2 income, married filing jointly, 2 kids, California, $18K mortgage interest, $10K state taxes paid"

This gives you federal tax, FICA, state tax, take-home pay, and refund/owed amount in one shot.

### Workflow 2: "Should I move to a no-tax state?"

Use the scenario simulator:

> "Simulate relocating from California to Texas with $200K income"

Or compare multiple states:

> "Compare state taxes for CA, TX, WA, NV, and FL at $200K income"

### Workflow 3: "I'm a freelancer, what do I owe?"

Use the self-employment tool:

> "Estimate self-employment tax: $150K gross revenue, $40K expenses, single"

Then check your quarterly payments:

> "Estimate quarterly tax: $110K income, single, self-employed"

### Workflow 4: "What changed in 2025?"

> "What changed between tax years 2024 and 2025?"

This shows every difference: brackets, standard deduction, CTC, SALT cap, and all OBBB new provisions.

### Workflow 5: "Should I do a Roth conversion?"

> "Simulate a $50K Roth conversion: current income $80K, single"

Shows the tax cost, effective conversion rate, and break-even analysis.

### Workflow 6: "Am I withholding enough?"

> "Analyze my paycheck: biweekly, $4,000 gross, $520 federal withheld, $248 SS, $58 Medicare, single"

Tells you if you're over/under-withholding and by how much.

### Workflow 7: "Year-end tax planning"

> "Give me tax planning tips: $150K income, single, have 401k and HSA, contributed $15K to 401k so far"

Gets personalized suggestions for maximizing deductions before year-end.

## Tool Categories

### Core Calculations (6 tools)

These do the math. They take income and deduction inputs and return precise tax calculations.

- `calculate_federal_tax` — The foundation. All other tools build on this.
- `get_tax_brackets` — Look up brackets for any year/status
- `compare_filing_statuses` — Which status saves the most?
- `estimate_quarterly_tax` — For self-employed and gig workers
- `calculate_total_tax` — Federal + state in one call
- `calculate_w4_withholding` — W-4 form guidance

### Analysis & Planning (7 tools)

These help you make decisions.

- `get_tax_planning_tips` — Year-end optimization
- `compare_tax_years` — How do 2024 and 2025 differ?
- `estimate_self_employment_tax` — Full SE breakdown
- `analyze_mortgage_tax_benefit` — Should I itemize with my mortgage?
- `analyze_education_tax_benefits` — AOTC vs LLC
- `compare_mfj_vs_mfs` — Joint vs separate filing
- `simulate_tax_scenario` — What-if modeling

### Full Reports (4 tools)

These give you the big picture.

- `generate_full_tax_report` — Everything in one report
- `process_1099_income` — Handle multiple 1099s
- `get_personalized_tax_calendar` — Your deadlines
- `analyze_paycheck` — Verify your pay stub

### Credits & Deductions (5 tools)

These help you find money.

- `list_tax_credits` — Browse 20+ credits
- `check_credit_eligibility` — Quick screening
- `calculate_eitc` — Precise EITC amount
- `list_deductions` — All deductions with rules
- `standard_vs_itemized` — Which is better for you?

### Retirement (2 tools)

Long-term planning.

- `get_retirement_accounts` — IRA, 401k, HSA, 529 details
- `get_retirement_strategy` — Backdoor Roth, tax-loss harvesting

### State Taxes (4 tools)

State-level analysis.

- `get_state_tax_info` — Any state's rates and brackets
- `estimate_state_tax` — State tax estimate
- `compare_state_taxes` — Multi-state comparison
- `list_no_income_tax_states` — The 9 tax-free states

### IRS Info (3 tools)

Public IRS data.

- `get_tax_deadlines` — Filing deadlines
- `check_refund_status` — How to check your refund
- `get_irs_form_info` — Form descriptions

### OBBB & Risk (3 tools)

New law and compliance.

- `calculate_obbb_deductions` — Tips, overtime, senior, auto loan
- `what_changed_between_tax_years` — Full year-over-year diff
- `assess_audit_risk` — Red flag identification

## Tips

- Always specify `taxYear` — TY2024 and TY2025 have different rules (OBBB Act)
- For the most accurate results, provide as many inputs as possible
- Use `generate_full_tax_report` when you want everything at once
- Use `simulate_tax_scenario` when you want to compare two situations
- All calculations are estimates — consult a tax professional for filing
