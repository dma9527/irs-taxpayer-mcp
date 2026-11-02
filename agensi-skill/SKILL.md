---
name: irs-tax-calculator
description: Use when the user asks about US federal or state income tax for tax year 2024, 2025, or 2026: calculating tax owed, tax brackets, standard vs itemized deductions, tax credits (Child Tax Credit, EITC, AOTC, retirement saver's credit), capital gains tax, self-employment tax, quarterly estimated payments, W-4 withholding, 1099 income, Roth conversions and backdoor Roth, retirement withdrawal order, relocation tax comparisons across states, paycheck withholding checks, audit risk, or a full year-end tax plan or tax report. Trigger phrases include "how much tax will I owe", "calculate my taxes", "should I itemize or take the standard deduction", "quarterly estimated tax", "EITC", "child tax credit", "backdoor Roth", "moving to Texas taxes", "W-4", "1099 taxes", "audit risk", "tax bracket", "OBBB tax deduction".
summary: Calculates US federal and state income tax, deductions, credits (CTC, EITC, AOTC), capital gains, SE tax, quarterly payments, W-4 withholding, and full tax plans for TY2024-2026 through the open-source irs-taxpayer-mcp server. Local engine, no taxpayer data stored.
version: 1.2.0
tags: [tax, federal-tax, state-tax, tax-planning, irs, eitc, child-tax-credit, capital-gains, self-employment, mcp]
keywords: [tax calculator, income tax, tax brackets, standard deduction, itemized deductions, quarterly estimated tax, W-4 withholding, Roth conversion, 1099, OBBB]
use_cases: [Estimate federal income tax owed for a given income and filing status, Compare standard vs itemized deductions with the correct SALT cap, Calculate EITC and Child Tax Credit amounts, Plan quarterly estimated payments for freelancers, Check paycheck withholding and W-4 settings, Compare state income tax before relocating, Plan Roth conversions and retirement withdrawal order, Generate a full year-end tax plan with sources and assumptions]
docs_url: https://github.com/dma9527/irs-taxpayer-mcp
---

# IRS Tax Calculator

Teaches the agent when and how to call the `irs-taxpayer-mcp` MCP server: a deterministic, local-only tax
estimation engine covering federal and state individual income tax for TY2024 through TY2026. The engine makes
no network calls and stores no taxpayer data; see Privacy and boundaries below.

## Needs access to

This skill requires the `irs-taxpayer-mcp` MCP server. If it is not already connected, add it:

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

No API key, login, or account is required. The server runs entirely on the user's machine.

## Privacy and boundaries (tell the user this before calculating)

- The engine performs no runtime network requests and persists no taxpayer data between calls.
- Facts the user types into this conversation are still processed by the agent's own model provider. If the
  user needs fully local handling, point them to the direct CLI instead:
  `npm install --global irs-taxpayer-mcp`, then `irs-taxpayer-mcp intake --output taxpayer-facts.json` and
  `irs-taxpayer-mcp plan --facts taxpayer-facts.json`.
- It is an estimation and planning tool, not tax preparation or filing software. It does not generate, sign,
  or transmit a return.
- State numeric estimates only exist for an explicit tax-year profile. Unsupported state/year/filing-status
  combinations return an error instead of a rough guess ("fail closed"). Always check the tool's response for
  an error before presenting a number.
- Always include the tool's own disclaimer text in your answer to the user; do not strip it out.

## How to choose a tool

Start broad, then go deep. Pick ONE of these three entry points based on what the user actually asked:

1. **One-off calculation** ("how much federal tax on $150k MFJ?"): call the single matching tool directly
   from the category tables below.
2. **"Give me a full picture" / "estimate my refund" / "build me a tax plan"**: call `generate_tax_plan`
   first. It returns structured results, the assumptions it made, official IRS/SSA sources, a calculation
   trace, and the exact boundaries of what it did not model. Use its `assumptions` and `boundaries` fields to
   tell the user what to double-check.
3. **Something not covered below**: call `lookup_tax_rule` or read `reference/tool-catalog.md` for the full
   45-tool list with one-line descriptions, then pick the closest match.

Always pass the tax year explicitly (2024, 2025, or 2026) and the real filing status
(`single`, `married_filing_jointly`, `married_filing_separately`, or `head_of_household`). Ask the user if
either is ambiguous instead of guessing.

## Federal tax

| User is asking about | Call |
|---|---|
| Total federal tax owed, bracket breakdown, AMT, NIIT, SE tax, QBI, capital gains | `calculate_federal_tax` |
| What the brackets/standard deduction are for a year | `get_tax_brackets` |
| Which filing status is cheapest | `compare_filing_statuses` |
| 1040-ES quarterly payments | `estimate_quarterly_tax` |
| Federal + state combined, take-home pay | `calculate_total_tax` |
| W-4 withholding / how to fill out the form | `calculate_w4_withholding` |

## Deductions and credits

| User is asking about | Call |
|---|---|
| What deductions exist, limits, forms | `list_deductions` |
| Standard vs itemized, SALT cap | `standard_vs_itemized` |
| What credits exist | `list_tax_credits` |
| Quick eligibility screen for credits | `check_credit_eligibility` |
| Exact EITC amount | `calculate_eitc` |
| Marketplace (ACA) Premium Tax Credit and APTC repayment, TY2026 | `estimate_premium_tax_credit` |
| OBBB tips/overtime/senior/auto-loan deductions (TY2025+) | `calculate_obbb_deductions` |

## Retirement and investment strategy

| User is asking about | Call |
|---|---|
| IRA/Roth/401k/HSA/529 limits and tax treatment | `get_retirement_accounts` |
| Backdoor Roth, Mega Backdoor, conversion ladder, tax-loss harvesting (reference) | `get_retirement_strategy` |
| Optimizing which lots to sell, 0% bracket harvesting, wash sales | `optimize_capital_gains` |
| Order to withdraw from accounts in retirement, RMDs | `plan_retirement_withdrawals` |

## State tax

| User is asking about | Call |
|---|---|
| General info on a state's tax system | `get_state_tax_info` |
| An actual dollar estimate for one state | `estimate_state_tax` |
| Comparing 2+ states numerically | `compare_state_taxes` |
| Which states have no income tax | `list_no_income_tax_states` |
| Deciding whether to relocate | `analyze_relocation_taxes` |

Numeric support today: TY2024 AK, CA, FL, NV, SD, TN, TX, WY; TY2025 AK, FL, NH, NV, SD, TN, TX, WY; TY2026
the same no-tax states plus IL, MA, NC, and PA. For every other state and year, say so plainly instead of
estimating.

## Full reports, self-employment, and situational tools

| User is asking about | Call |
|---|---|
| A single estimation report (income, deductions, federal, FICA, state, take-home) | `generate_full_tax_report` |
| Multiple 1099s (NEC/INT/DIV/B/MISC) | `process_1099_income` |
| Personalized filing deadlines | `get_personalized_tax_calendar` |
| Checking if paycheck withholding is on track | `analyze_paycheck` |
| MFJ vs MFS | `compare_mfj_vs_mfs` |
| "What if I change X" modeling | `simulate_tax_scenario` |
| IRS audit risk flags | `assess_audit_risk` |
| Document checklist for filing | `get_tax_document_checklist` |
| Multi-year (3-5yr) bracket planning | `plan_multi_year_taxes` |
| Freelancer/1099 self-employment tax, SEP/Solo 401k | `estimate_self_employment_tax` |
| Mortgage interest / property tax benefit | `analyze_mortgage_tax_benefit` |
| AOTC vs Lifetime Learning Credit, 529, student loans | `analyze_education_tax_benefits` |
| Comparing TY2024 vs TY2025 vs TY2026 for the same income | `compare_tax_years` |
| Diffing what changed between two tax years | `what_changed_between_tax_years` |
| Year-end optimization tips (401k, HSA, bunching, harvesting) | `get_tax_planning_tips` |

## Reference and meta

| User is asking about | Call |
|---|---|
| Deadlines for a tax year | `get_tax_deadlines` |
| How to check an IRS refund | `check_refund_status` |
| What a specific IRS form is / who needs it | `get_irs_form_info` |
| Overall tool/data freshness | `run_tax_health_check` |
| A tax term or rule they don't understand | `lookup_tax_rule` |
| Step-by-step form filing guide | `get_form_filing_guide` |
| Reporting a wrong calculation | `submit_feedback` (never invent a GitHub link yourself) |

## After calling a tool

- Surface the tool's disclaimer and any `⚠` warnings verbatim; don't summarize them away.
- If the tool returned an error (unsupported state, missing required fact), say exactly what is unsupported
  and what input would unblock it. Never substitute a rough manual estimate for a failed-closed tool call.
- For anything the user will actually file, remind them this is an estimate for planning purposes and point
  them to a qualified tax professional or official IRS guidance.
