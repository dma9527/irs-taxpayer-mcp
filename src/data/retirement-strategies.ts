/**
 * Retirement account rules and strategies — IRA, 401k, Roth, Backdoor Roth, etc.
 */

export interface RetirementAccountRule {
  id: string;
  name: string;
  type: "traditional" | "roth" | "employer" | "other";
  contributionLimit2024: string;
  contributionLimit2025: string;
  catchUp: string;
  taxTreatment: string;
  incomeLimit?: string;
  rmdRequired: boolean;
  description: string;
  tips?: string;
}

export const RETIREMENT_ACCOUNTS: RetirementAccountRule[] = [
  {
    id: "traditional_ira",
    name: "Traditional IRA",
    type: "traditional",
    contributionLimit2024: "$7,000",
    contributionLimit2025: "$7,000",
    catchUp: "$1,000 additional if age 50+ ($8,000 total)",
    taxTreatment: "Contributions may be tax-deductible. Grows tax-deferred. Withdrawals taxed as ordinary income",
    incomeLimit: "Deduction phases out if covered by employer plan: Single $77,000-$87,000 / MFJ $123,000-$143,000 (TY2024)",
    rmdRequired: true,
    description: "Individual retirement account with potential tax-deductible contributions",
    tips: "If you're above the income limit for deduction but below Roth limit, consider non-deductible Traditional IRA as step 1 of Backdoor Roth",
  },
  {
    id: "roth_ira",
    name: "Roth IRA",
    type: "roth",
    contributionLimit2024: "$7,000",
    contributionLimit2025: "$7,000",
    catchUp: "$1,000 additional if age 50+ ($8,000 total)",
    taxTreatment: "Contributions are NOT deductible. Grows tax-free. Qualified withdrawals are tax-free",
    incomeLimit: "Single: $146,000-$161,000 MAGI. MFJ: $230,000-$240,000 (TY2024). Above this = no direct contribution",
    rmdRequired: false,
    description: "Tax-free growth and withdrawals in retirement. Best for those expecting higher future tax rates",
    tips: "No RMDs ever. Can withdraw contributions (not earnings) anytime without penalty. Best long-term wealth builder",
  },
  {
    id: "401k",
    name: "401(k) / 403(b)",
    type: "employer",
    contributionLimit2024: "$23,000 employee elective deferral",
    contributionLimit2025: "$23,500 employee elective deferral",
    catchUp: "$7,500 if age 50+ ($30,500 total TY2024). New: $11,250 for ages 60-63 starting TY2025",
    taxTreatment: "Traditional: pre-tax contributions, taxed on withdrawal. Roth 401k: after-tax, tax-free withdrawal",
    rmdRequired: true,
    description: "Employer-sponsored retirement plan. Often includes employer match",
    tips: "Always contribute at least enough to get full employer match — it's free money. Total limit (employee + employer) is $69,000 (TY2024) / $70,000 (TY2025)",
  },
  {
    id: "sep_ira",
    name: "SEP IRA",
    type: "traditional",
    contributionLimit2024: "25% of net self-employment income, up to $69,000",
    contributionLimit2025: "25% of net self-employment income, up to $70,000",
    catchUp: "No catch-up provision",
    taxTreatment: "Employer contributions are tax-deductible. Grows tax-deferred. Withdrawals taxed as ordinary income",
    rmdRequired: true,
    description: "Simplified Employee Pension for self-employed and small business owners",
    tips: "Great for high-income self-employed. Can contribute much more than Traditional IRA. Deadline is tax filing deadline (with extensions)",
  },
  {
    id: "solo_401k",
    name: "Solo 401(k)",
    type: "employer",
    contributionLimit2024: "$23,000 employee + 25% of compensation as employer, total up to $69,000",
    contributionLimit2025: "$23,500 employee + 25% of compensation as employer, total up to $70,000",
    catchUp: "$7,500 if age 50+ (TY2024)",
    taxTreatment: "Can have both Traditional and Roth components",
    rmdRequired: true,
    description: "401(k) for self-employed with no employees (except spouse)",
    tips: "Allows highest contribution for self-employed. Can do Roth contributions. Can take loans from the plan",
  },
  {
    id: "hsa",
    name: "Health Savings Account (HSA)",
    type: "other",
    contributionLimit2024: "$4,150 individual / $8,300 family",
    contributionLimit2025: "$4,300 individual / $8,550 family",
    catchUp: "$1,000 additional if age 55+",
    taxTreatment: "Triple tax advantage: deductible contributions, tax-free growth, tax-free withdrawals for medical expenses",
    rmdRequired: false,
    description: "Tax-advantaged account for medical expenses. Requires HDHP. After 65, can withdraw for any purpose (taxed as income, no penalty)",
    tips: "Best tax-advantaged account in the tax code. Consider paying medical expenses out-of-pocket and letting HSA grow. After 65 it works like a Traditional IRA for non-medical expenses",
  },
  {
    id: "529",
    name: "529 Education Savings Plan",
    type: "other",
    contributionLimit2024: "No federal limit (state limits vary, typically $300K-$500K lifetime). Gift tax exclusion: $18,000/year per beneficiary",
    contributionLimit2025: "$19,000/year gift tax exclusion per beneficiary",
    catchUp: "5-year gift tax averaging: contribute up to $90,000 ($95,000 TY2025) at once",
    taxTreatment: "No federal deduction (some states offer deduction). Tax-free growth. Tax-free withdrawals for qualified education expenses",
    rmdRequired: false,
    description: "Education savings with tax-free growth for qualified expenses including K-12 tuition ($10K/year) and college",
    tips: "Starting 2024: unused 529 funds can be rolled to beneficiary's Roth IRA (up to $35,000 lifetime, subject to annual Roth limits, account must be 15+ years old)",
  },
];

export interface RetirementStrategy {
  id: string;
  name: string;
  description: string;
  steps: string[];
  eligibility: string;
  taxBenefit: string;
  risks: string[];
  annualLimit: string;
}

export const RETIREMENT_STRATEGIES: RetirementStrategy[] = [
  {
    id: "backdoor_roth",
    name: "Backdoor Roth IRA",
    description: "Strategy for high earners to contribute to Roth IRA indirectly when over the income limit",
    steps: [
      "1. Contribute to a non-deductible Traditional IRA ($7,000 / $8,000 if 50+)",
      "2. Convert the Traditional IRA to Roth IRA (ideally within days)",
      "3. Report on Form 8606 — the conversion is mostly tax-free since contributions were non-deductible",
      "4. Pay tax only on any gains between contribution and conversion",
    ],
    eligibility: "Anyone with earned income, regardless of income level. Most useful when MAGI exceeds Roth IRA direct contribution limits",
    taxBenefit: "Gets money into Roth IRA for tax-free growth and withdrawals, bypassing income limits",
    risks: [
      "Pro-rata rule: If you have existing pre-tax IRA balances, the conversion is partially taxable",
      "Must aggregate ALL Traditional, SEP, and SIMPLE IRA balances for pro-rata calculation",
      "Solution: Roll pre-tax IRA money into employer 401(k) before converting",
      "Legislative risk: Congress has discussed eliminating this strategy",
    ],
    annualLimit: "$7,000 ($8,000 if 50+) per person per year",
  },
  {
    id: "mega_backdoor_roth",
    name: "Mega Backdoor Roth",
    description: "Strategy to contribute up to $69,000 total to Roth via after-tax 401(k) contributions",
    steps: [
      "1. Max out regular 401(k) contributions ($23,000 / $23,500)",
      "2. Make after-tax (non-Roth) contributions to 401(k) up to the total limit ($69,000 / $70,000 minus employee + employer contributions)",
      "3. Convert after-tax contributions to Roth 401(k) (in-plan conversion) or Roth IRA (in-service distribution)",
      "4. Ideally convert immediately to minimize taxable gains",
    ],
    eligibility: "Only if your 401(k) plan allows after-tax contributions AND in-plan Roth conversions or in-service distributions. Not all plans support this",
    taxBenefit: "Can get $40,000+ additional into Roth accounts per year beyond normal limits",
    risks: [
      "Not all employer plans allow this — check with your plan administrator",
      "Gains on after-tax contributions before conversion are taxable",
      "Complex reporting requirements",
    ],
    annualLimit: "Up to $69,000 total (TY2024) / $70,000 (TY2025) minus employee elective + employer match",
  },
  {
    id: "roth_conversion_ladder",
    name: "Roth Conversion Ladder",
    description: "Strategy for early retirees to access retirement funds before 59½ without penalty",
    steps: [
      "1. Convert a portion of Traditional IRA/401(k) to Roth IRA each year",
      "2. Pay ordinary income tax on the converted amount",
      "3. Wait 5 years — then the converted amount can be withdrawn tax-free and penalty-free",
      "4. Plan conversions to fill up lower tax brackets",
    ],
    eligibility: "Anyone with Traditional IRA/401(k) balances. Most useful for early retirees (before 59½)",
    taxBenefit: "Access retirement funds before 59½ without 10% early withdrawal penalty. Can optimize by converting in low-income years",
    risks: [
      "Each conversion has its own 5-year clock",
      "Need 5 years of living expenses from other sources while waiting",
      "Large conversions can push you into higher tax brackets",
      "May affect ACA premium tax credit eligibility",
    ],
    annualLimit: "No limit on conversion amount, but tax implications increase with larger conversions",
  },
  {
    id: "tax_gain_harvesting",
    name: "Tax Gain Harvesting",
    description: "Sell appreciated investments in years when you're in the 0% capital gains bracket",
    steps: [
      "1. Calculate your taxable income for the year",
      "2. Determine how much room you have in the 0% long-term capital gains bracket",
      "3. Sell appreciated investments to realize gains up to that threshold",
      "4. Immediately repurchase (no wash sale rule for gains)",
      "5. Your cost basis is now stepped up, reducing future tax",
    ],
    eligibility: "Taxpayers with taxable income below the 0% capital gains threshold (TY2024: $47,025 single / $94,050 MFJ)",
    taxBenefit: "Realize capital gains completely tax-free and reset cost basis higher",
    risks: [
      "Must carefully calculate to stay within 0% bracket",
      "State taxes may still apply on the gains",
      "Transaction costs",
    ],
    annualLimit: "Limited by the 0% capital gains bracket space available",
  },
  {
    id: "tax_loss_harvesting",
    name: "Tax Loss Harvesting",
    description: "Sell investments at a loss to offset capital gains and reduce taxable income",
    steps: [
      "1. Identify investments with unrealized losses",
      "2. Sell to realize the loss",
      "3. Use losses to offset capital gains (short-term first, then long-term)",
      "4. Deduct up to $3,000 of excess losses against ordinary income",
      "5. Carry forward remaining losses to future years",
      "6. Reinvest in a similar (but not substantially identical) investment",
    ],
    eligibility: "Any taxpayer with investment losses",
    taxBenefit: "Offset gains dollar-for-dollar, plus $3,000/year against ordinary income. Unlimited carryforward",
    risks: [
      "Wash sale rule: Cannot buy substantially identical security within 30 days before or after the sale",
      "Applies across all accounts (including spouse's)",
      "Reduces cost basis of replacement investment",
    ],
    annualLimit: "$3,000 deduction against ordinary income per year ($1,500 MFS). Unlimited offset against capital gains",
  },
];
