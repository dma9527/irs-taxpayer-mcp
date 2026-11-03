# Agensi submission form - copy/paste reference

Fill this in at agensi.io/dashboard/submit. Fields match the "Submit on the website" doc.

## Name (≤60 chars)
IRS Tax Calculator (Federal & State, TY2024-2026)

## Summary (≤300 chars)
Calculates US federal and state income tax, deductions, credits (CTC, EITC, AOTC), capital gains, SE tax,
quarterly payments, W-4 withholding, and full tax plans for TY2024-2026. Local, deterministic, no network
calls, no taxpayer data stored.

## Description (Markdown)

Teaches your agent when and how to call the open-source `irs-taxpayer-mcp` MCP server for US individual tax
questions.

**What it does**
- Full federal tax calculation: 7 brackets, 4 filing statuses, AMT, NIIT, Additional Medicare Tax, QBI, SE tax,
  capital gains, Child Tax Credit.
- 20+ federal credits including EITC with exact phase-in/plateau/phase-out math.
- Deduction comparisons (standard vs itemized) with the correct year-specific SALT cap.
- OBBB Act (2025) deductions: tips, overtime, senior bonus, auto loan interest.
- State tax reference for all 50 states + DC, with numeric estimates for supported state/year/filing-status
  paths. Unsupported combinations return an explicit error instead of a rough guess.
- Retirement planning: account limits, Backdoor Roth, withdrawal ordering, RMDs, capital-gains harvesting.
- Full reports: 1099 processing, paycheck withholding checks, audit-risk scoring, document checklists,
  multi-year projections, relocation analysis, MFJ vs MFS comparison.
- A flagship `generate_tax_plan` tool that returns structured results, stated assumptions, official IRS/SSA
  source citations, a calculation trace, and the exact boundaries of what it did not model.

**Where it stops**
- Planning and estimation only. Not tax preparation or filing software. Does not generate, sign, or transmit
  a return.
- Numeric state estimates only exist for explicitly supported tax-year profiles; everything else fails closed.
- Covers TY2024 through TY2026 only.

**Privacy**
The underlying engine runs entirely on the user's machine, makes no runtime network calls, and stores no
taxpayer data. [Repo and privacy architecture](https://github.com/dma9527/irs-taxpayer-mcp#-privacy-architecture).

## See it in action

**Request**: "I'm married filing jointly with 2 kids, we made $150,000 in 2025. What's our federal tax?"

**Result** (real output from `calculate_federal_tax`):

```
## Federal Tax Calculation — TY2025
**Filing Status**: married filing jointly
| Item | Amount |
|------|--------|
| Gross Income | $150,000 |
| Adjusted Gross Income | $150,000 |
| Deduction (standard) | -$31,500 |
| Taxable Income | $118,500 |
### Tax Bracket Breakdown
| Rate | Taxable Amount | Tax |
|------|---------------|-----|
| 10% | $23,850 | $2,385 |
| 12% | $73,100 | $8,772 |
| 22% | $21,550 | $4,741 |
| Component | Amount |
|-----------|--------|
| Ordinary Income Tax | $15,898 |
| Child Tax Credit | -$4,400 |
| **Total Federal Tax After Refundable Credits** | **$11,498** |
**Effective Tax Rate**: 7.67%
**Marginal Tax Rate**: 22%
**Estimated Quarterly Payment**: $2,875
> ⚠ ACTC was not calculated because qualifyingChildrenForCtc was not provided.
> ⚠ This is an estimate for educational purposes only. It does not constitute tax advice.
```


## Compatibility note
Requires Node.js 20+ to run `npx -y irs-taxpayer-mcp`. Works with any MCP-capable agent.

## Pricing
Start **free**. The underlying MCP server is MIT-licensed and already free on npm; charging for a thin
SKILL.md wrapper over a free tool is not a good value trade for buyers. Free listing builds reviews and
GitHub/npm traffic. Revisit a subscription price only if you add exclusive content Agensi buyers can't get
from the README (e.g. curated prompts, worked examples, a companion dashboard).

## Categories (pick up to 3; first one sets the category page)
1. Finance & Accounting (`finance-accounting`), primary.
2. Productivity (`productivity`)
3. Research & Analysis (`research-analysis`)

## Tags / use cases (free text)
tax calculator, federal tax, state tax, tax planning, EITC, child tax credit, capital gains tax,
self-employment tax, W-4, 1099, Roth conversion, OBBB, tax brackets, quarterly estimated tax, retirement
withdrawal planning

## Limitations and FAQ

**Limitations**
- Covers TY2024-2026 only.
- Numeric state tax estimates are limited to: TY2024 AK, CA, FL, NV, SD, TN, TX, WY; TY2025 AK, FL, NH, NV,
  SD, TN, TX, WY; TY2026 the same no-tax states plus CA, GA, IL, IN, KY, MA, MI, NC, NJ, OH, PA, VA. Every other state/year returns an error by
  design rather than a rough guess.
- Not tax preparation or e-filing software. No Form 1040 generation or MeF transmission.

**FAQ**

Q: Does this store or send my income information anywhere?
A: No. The MCP server makes no runtime network calls and persists no taxpayer data between calls.

Q: Can I use this to actually file my taxes?
A: No. It produces estimates for planning purposes. Consult a qualified tax professional or official IRS
guidance for filing.

Q: Why did it return an error for my state?
A: Only specific state/year/filing-status combinations have audited numeric brackets. Unsupported
combinations fail closed instead of guessing, to avoid giving you a wrong number with false confidence.

## Docs link
https://github.com/dma9527/irs-taxpayer-mcp
