# Local Tax Planner 1.0 Contract

`generate_tax_plan` is the flagship workflow for deterministic tax estimation and planning. It combines supported federal calculations, employee FICA, optional exact-year state estimates, payments, assumptions, source provenance, and a calculation trace in one read-only MCP call.

## Trust contract

- Calculations run in the local MCP process.
- The tool makes no network requests.
- The tool does not persist inputs or outputs.
- The tool emits no telemetry or analytics.
- The LLM selects and supplies facts but never performs or mutates tax calculations.
- Unsupported tax years, state profiles, and required worksheet facts return typed errors.

## Input groups

| Group | Purpose |
| --- | --- |
| `income` | W-2, self-employment, investment, Social Security, retirement, and other annual income facts. |
| `deductions` | Above-the-line adjustments and an already-limited eligible itemized total. |
| `family` | Separate CTC, ODC, and EITC dependent counts plus required Schedule 8812 facts. |
| `education` | AOTC and Lifetime Learning Credit planning facts. |
| `business` | QBI, SSTB, W-2 wage, and qualified-property limitation facts. |
| `payments` | Federal withholding, state withholding, and estimated payments. |
| `stateCode` | Optional exact-year supported state estimate. |

Qualified dividends must be included in ordinary dividends. Gross and taxable retirement distributions must both be supplied. QBI planning requires SSTB status, W-2 wages, and qualified-property basis, including verified zero values.

## Structured output

The `plan` object includes:

- `contractVersion`: Stable planner contract version `1.0`.
- `privacy`: Machine-readable local execution guarantees.
- `facts`: Separate supplied cash income, normalized tax gross income, earned income, and EITC investment income.
- `results`: AGI, taxable income, federal components, refundable credits, FICA, state estimate, total tax, balances, and quarterly planning amount.
- `assumptions`: Facts the caller must have already verified.
- `warnings`: Calculation limitations that apply to this result.
- `unsupportedBoundaries`: Cases the planner intentionally does not handle.
- `sources`: Annual IRS and supported state provenance.
- `calculationTrace`: Ordered deterministic intermediate amounts.

Human-readable text is returned alongside the structured object for clients that do not consume structured content.

## Unsupported boundaries

The planner does not:

- Prepare, sign, or transmit a tax return.
- Determine facts that were not explicitly supplied by the caller.
- Model every Form 1040 line, election, worksheet, schedule, or carryforward.
- Model local, part-year, nonresident, community-property, or multi-state allocation rules.
- Reuse state profiles across tax years.
- Store taxpayer scenarios unless a future explicit opt-in local storage contract is added.

See `docs/FEEDBACK_AND_FILING_GATE.md` for the evidence required before investment in filing-grade behavior.
