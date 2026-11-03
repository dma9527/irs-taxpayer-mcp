# Full tool catalog (45 tools)

Consult this when the decision tables in `SKILL.md` do not have an exact match. Every tool name below is the
literal MCP tool name to call.

## Federal tax calculations
- `calculate_federal_tax`: full federal tax with bracket breakdown, AMT, NIIT, Additional Medicare Tax, QBI, SE tax, capital gains, CTC.
- `get_tax_brackets`: brackets and standard deduction by filing status and year.
- `compare_filing_statuses`: side-by-side comparison of all 4 filing statuses.
- `estimate_quarterly_tax`: 1040-ES estimated payments with safe harbor guidance.
- `calculate_total_tax`: combined federal + state tax, take-home pay, monthly income.
- `calculate_w4_withholding`: per-paycheck withholding estimate with W-4 form recommendations.

## Deductions
- `list_deductions`: browse deductions with eligibility rules, limits, forms.
- `standard_vs_itemized`: standard vs itemized with year-specific SALT cap.

## Tax credits
- `list_tax_credits`: 20+ federal credits.
- `check_credit_eligibility`: quick screening.
- `calculate_eitc`: precise EITC with phase-in/plateau/phase-out for 0-3 children.
- `estimate_premium_tax_credit`: TY2026 Premium Tax Credit (Form 8962) from Form 1095-A annual or monthly amounts, 400% limit, full APTC repayment, below-100% and MFS Exception 2 rules.

## Retirement and strategy
- `get_retirement_accounts`: IRA, Roth, 401k, SEP, Solo 401k, HSA, 529 limits and treatment.
- `get_retirement_strategy`: Backdoor Roth, Mega Backdoor, Roth Conversion Ladder, Tax Loss/Gain Harvesting.

## Planning and scenarios
- `generate_tax_plan`: privacy-first local plan with structured results, assumptions, sources, trace, boundaries. Flagship tool for "build me a plan" requests.
- `get_tax_planning_tips`: 401k maxing, HSA, Roth conversion, tax-loss harvesting, charitable bunching.
- `compare_tax_years`: TY2024 vs TY2025 vs TY2026 for the same income.
- `estimate_self_employment_tax`: Schedule C profit, SE tax, QBI, quarterly payments, SEP/Solo 401k limits.
- `analyze_mortgage_tax_benefit`: mortgage interest + property tax deduction, year-specific SALT cap.
- `analyze_education_tax_benefits`: AOTC vs Lifetime Learning Credit, student loan deduction, 529 guidance.

## State taxes
- `get_state_tax_info`: reference data for all 50 states + DC.
- `estimate_state_tax`: numeric estimate for supported state/year/status paths only; fails closed otherwise.
- `compare_state_taxes`: compares states only when every requested path is supported.
- `list_no_income_tax_states`: the 9 states with no broad individual income tax.

## IRS information
- `get_tax_deadlines`: key dates by tax year.
- `check_refund_status`: guidance only, no account access.
- `get_irs_form_info`: info on 14 common IRS forms.

## OBBB Act (2025+)
- `calculate_obbb_deductions`: tips, overtime, senior bonus, auto loan interest deductions.
- `what_changed_between_tax_years`: diff of brackets, deductions, credits, SALT, OBBB provisions between two years.

## Full reports and analysis
- `generate_full_tax_report`: estimation report: income, deductions, federal, FICA, state, take-home, refund inputs.
- `process_1099_income`: multiple 1099 forms (NEC, INT, DIV, B, MISC) with tax impact by category.
- `get_personalized_tax_calendar`: deadlines based on situation (self-employed, extension, investments).
- `analyze_paycheck`: verify withholding accuracy, project annual tax, suggest W-4 adjustments.
- `compare_mfj_vs_mfs`: MFJ vs MFS with tax diff and all MFS restriction warnings.
- `simulate_tax_scenario`: what-if modeling: income change, relocation, Roth conversion, 401k, filing status.
- `assess_audit_risk`: IRS audit risk scoring with red flags and mitigation tips.
- `get_tax_document_checklist`: personalized filing document checklist.
- `optimize_capital_gains`: 0% bracket harvesting, tax-loss harvesting, wash sale warnings.
- `plan_retirement_withdrawals`: optimal withdrawal order, RMD calculation, Roth conversion.
- `plan_multi_year_taxes`: 3-5 year tax projection with bracket management and age milestones.
- `analyze_relocation_taxes`: in-depth state relocation analysis, multi-year savings, SALT impact.

## Guidance and feedback
- `run_tax_health_check`: tool coverage and freshness of built-in tax-year data.
- `lookup_tax_rule`: search the built-in tax knowledge base.
- `get_form_filing_guide`: step-by-step guidance for supported IRS forms.
- `submit_feedback`: generates a prefilled GitHub issue link; never fabricate this link, always call the tool.
