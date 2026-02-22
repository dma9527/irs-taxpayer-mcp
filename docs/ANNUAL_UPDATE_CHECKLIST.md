# Annual Tax Data Update Checklist

When the IRS publishes new Revenue Procedures (typically October/November for the next tax year), follow this checklist to update all data.

## Timeline

| When                | What                                                 |
| ------------------- | ---------------------------------------------------- |
| Oct/Nov             | IRS publishes Rev. Proc. with inflation adjustments  |
| Nov                 | SSA announces Social Security wage base              |
| Nov                 | IRS publishes Notice with retirement plan limits     |
| Jan                 | Update data, run tests, publish new version          |
| Jul (if applicable) | Check for mid-year legislation (e.g., OBBB Act 2025) |

## Step 1: Federal Tax Brackets (`src/data/tax-brackets.ts`)

Source: IRS Revenue Procedure (e.g., Rev. Proc. 2024-40 for TY2025)

- [ ] Add new `TaxYearData` entry for the new year
- [ ] Update `brackets` for all 4 filing statuses (7 brackets each)
- [ ] Update `standardDeduction` for all 4 statuses
- [ ] Update `additionalDeduction.age65OrBlind` for all 4 statuses
- [ ] Update `capitalGainsBrackets` for all 4 statuses
- [ ] Update `socialSecurity.wageBase` (from SSA announcement)
- [ ] Update `medicare.additionalTaxThreshold` (if changed)
- [ ] Update `childTaxCredit.amount` and `phaseoutStart`
- [ ] Update `amt.exemption`, `amt.phaseoutStart`, `amt.rate28Threshold`
- [ ] Update `saltCap` (check for legislative changes)
- [ ] Update `obbbDeductions` (check expiration dates — tips/overtime/senior expire 2028)
- [ ] Update `estimatedTaxSafeHarborPercent` (if changed)

## Step 2: EITC Data (`src/calculators/eitc-calculator.ts`)

Source: Rev. Proc. §3.07-3.12

- [ ] Add new `EITC_YYYY` parameters for 0/1/2/3 children
- [ ] Update `creditRate`, `earnedIncomeThreshold`, `maxCredit`
- [ ] Update `phaseoutRate`, `phaseoutStart`, `phaseoutStartMFJ`
- [ ] Update `INVESTMENT_INCOME_LIMIT`

## Step 3: Credits (`src/data/credits.ts`)

- [ ] Update CTC max amount description
- [ ] Update EITC max amounts description
- [ ] Update adoption credit limit and phaseout
- [ ] Update AOTC/LLC phaseout ranges (if changed)
- [ ] Update saver's credit income limits
- [ ] Update EV credit income limits (if changed)
- [ ] Check for new or expired credits

## Step 4: Deductions (`src/data/deductions.ts`)

- [ ] Update HSA limits in above-the-line deductions
- [ ] Update educator expense limit (if changed)
- [ ] Update SALT cap description (check legislation)
- [ ] Check for new deductions or expired provisions

## Step 5: Retirement Accounts (`src/data/retirement-strategies.ts`)

Source: IRS Notice (e.g., Notice 2024-80)

- [ ] Update 401k/403b employee deferral limit
- [ ] Update 401k catch-up amounts (50+ and 60-63)
- [ ] Update IRA contribution limit
- [ ] Update SEP IRA limit
- [ ] Update HSA limits (individual and family)
- [ ] Update 529 gift tax exclusion amount

## Step 6: Deadlines (`src/data/deadlines.ts`)

Source: IRS Publication 509

- [ ] Add deadline entries for the new tax year
- [ ] Verify dates (watch for weekends/holidays shifting deadlines)

## Step 7: State Taxes (`src/data/state-taxes.ts`)

- [ ] Check for state rate changes (Tax Foundation annual report)
- [ ] Update states transitioning tax types (e.g., Georgia flat tax)
- [ ] Update local tax rates for major cities
- [ ] Verify no-income-tax state list

## Step 8: Validation

- [ ] Run `npm test` — all tests must pass
- [ ] Update `data-validation.test.ts` with new year's expected values
- [ ] Run `npm run build` — no TypeScript errors
- [ ] Manually test key tools with new year data
- [ ] Update CHANGELOG.md

## Step 9: Publish

- [ ] Bump version in `package.json`
- [ ] `npm publish`
- [ ] `git tag vX.Y.Z && git push --tags`
- [ ] Update README if tool count or features changed

## Data Sources Quick Reference

| Data              | Source         | URL                             |
| ----------------- | -------------- | ------------------------------- |
| Tax brackets      | IRS Rev. Proc. | irs.gov/irb                     |
| SS wage base      | SSA            | ssa.gov/oact/cola               |
| Retirement limits | IRS Notice     | irs.gov/newsroom                |
| State taxes       | Tax Foundation | taxfoundation.org               |
| EITC tables       | IRS Rev. Proc. | irs.gov/credits-deductions/eitc |
| HSA limits        | IRS Rev. Proc. | irs.gov/publications/p969       |
