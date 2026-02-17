/**
 * Federal tax credits database — TY2024 and TY2025.
 * Covers major individual credits with phase-out rules.
 */

import type { FilingStatus } from "./tax-brackets.js";

export interface CreditRule {
  id: string;
  name: string;
  category: "family" | "education" | "energy" | "retirement" | "healthcare" | "income" | "other";
  refundable: "full" | "partial" | "no";
  description: string;
  maxAmount: string;
  eligibility: string;
  phaseout?: string;
  form: string;
  tips?: string;
}

export const TAX_CREDITS: CreditRule[] = [
  // === FAMILY ===
  {
    id: "child_tax_credit",
    name: "Child Tax Credit (CTC)",
    category: "family",
    refundable: "partial",
    description: "Credit for each qualifying child under 17",
    maxAmount: "$2,000 per qualifying child. Up to $1,700 refundable (Additional CTC) for TY2024",
    eligibility: "Child must be under 17, US citizen/resident, claimed as dependent, lived with you 6+ months, have SSN",
    phaseout: "Begins at $200,000 AGI ($400,000 MFJ). Reduced by $50 per $1,000 over threshold",
    form: "Form 1040, Schedule 8812",
    tips: "Even if you owe no tax, you may get up to $1,700 back per child via the Additional Child Tax Credit",
  },
  {
    id: "other_dependent_credit",
    name: "Credit for Other Dependents",
    category: "family",
    refundable: "no",
    description: "Credit for dependents who don't qualify for CTC (e.g., children 17+, elderly parents)",
    maxAmount: "$500 per qualifying dependent",
    eligibility: "Dependent must have ITIN or SSN, be claimed on your return",
    phaseout: "Same as CTC: $200,000 ($400,000 MFJ)",
    form: "Form 1040",
  },
  {
    id: "child_dependent_care",
    name: "Child and Dependent Care Credit",
    category: "family",
    refundable: "no",
    description: "Credit for childcare or dependent care expenses that allow you to work",
    maxAmount: "20-35% of up to $3,000 expenses (1 dependent) or $6,000 (2+). Max credit: $1,050 / $2,100",
    eligibility: "Must have earned income, child under 13 or disabled dependent, expenses for work/job search",
    phaseout: "Credit percentage decreases from 35% to 20% as AGI increases from $15,000 to $43,000",
    form: "Form 2441",
  },
  {
    id: "adoption_credit",
    name: "Adoption Credit",
    category: "family",
    refundable: "no",
    description: "Credit for qualified adoption expenses",
    maxAmount: "$16,810 per child (TY2024)",
    eligibility: "Qualified adoption expenses for eligible child",
    phaseout: "Begins at $252,150 MAGI, fully phased out at $292,150 (TY2024)",
    form: "Form 8839",
  },

  // === EDUCATION ===
  {
    id: "american_opportunity",
    name: "American Opportunity Tax Credit (AOTC)",
    category: "education",
    refundable: "partial",
    description: "Credit for first 4 years of post-secondary education expenses",
    maxAmount: "$2,500 per eligible student (100% of first $2,000 + 25% of next $2,000). 40% refundable ($1,000)",
    eligibility: "Student enrolled at least half-time in degree program, first 4 years, no felony drug conviction",
    phaseout: "Single: $80,000-$90,000 MAGI. MFJ: $160,000-$180,000",
    form: "Form 8863",
    tips: "Better than Lifetime Learning Credit for most undergrad students. Can claim for 4 tax years per student",
  },
  {
    id: "lifetime_learning",
    name: "Lifetime Learning Credit (LLC)",
    category: "education",
    refundable: "no",
    description: "Credit for tuition and fees for any post-secondary education or skill improvement",
    maxAmount: "20% of up to $10,000 in expenses = $2,000 max per return (not per student)",
    eligibility: "Any post-secondary education, no degree requirement, unlimited years",
    phaseout: "Single: $80,000-$90,000 MAGI. MFJ: $160,000-$180,000 (TY2024)",
    form: "Form 8863",
    tips: "Good for grad school, professional development, or after AOTC years are used up",
  },
  {
    id: "student_loan_interest",
    name: "Student Loan Interest Deduction",
    category: "education",
    refundable: "no",
    description: "Above-the-line deduction for interest paid on qualified student loans",
    maxAmount: "Up to $2,500 deduction",
    eligibility: "Paid interest on qualified student loan, not MFS, not claimed as dependent",
    phaseout: "Single: $80,000-$95,000 MAGI. MFJ: $165,000-$195,000 (TY2024)",
    form: "1040 Schedule 1",
  },

  // === ENERGY / GREEN ===
  {
    id: "ev_credit",
    name: "Clean Vehicle Credit (EV Credit)",
    category: "energy",
    refundable: "no",
    description: "Credit for purchasing a new qualifying electric vehicle",
    maxAmount: "$7,500 for new EVs meeting battery and assembly requirements",
    eligibility: "New EV with final assembly in North America, MSRP limits ($55K cars / $80K trucks/SUVs), income limits",
    phaseout: "Income cap: $150,000 single / $300,000 MFJ / $225,000 HoH",
    form: "Form 8936",
    tips: "Can transfer credit to dealer at point of sale for immediate price reduction",
  },
  {
    id: "used_ev_credit",
    name: "Used Clean Vehicle Credit",
    category: "energy",
    refundable: "no",
    description: "Credit for purchasing a qualifying used electric vehicle",
    maxAmount: "30% of sale price, up to $4,000",
    eligibility: "Used EV at least 2 model years old, price under $25,000, purchased from dealer",
    phaseout: "Income cap: $75,000 single / $150,000 MFJ / $112,500 HoH",
    form: "Form 8936",
  },
  {
    id: "residential_energy",
    name: "Residential Clean Energy Credit",
    category: "energy",
    refundable: "no",
    description: "Credit for solar panels, solar water heaters, wind turbines, geothermal, battery storage",
    maxAmount: "30% of qualified expenses (no cap for most systems)",
    eligibility: "Installed on your primary or secondary US residence",
    form: "Form 5695",
    tips: "This is the big solar panel credit. 30% rate through 2032, then steps down",
  },
  {
    id: "energy_efficiency",
    name: "Energy Efficient Home Improvement Credit",
    category: "energy",
    refundable: "no",
    description: "Credit for energy-efficient improvements: insulation, windows, doors, heat pumps, etc.",
    maxAmount: "30% of costs, up to $3,200/year. Sub-limits: $1,200 general / $2,000 heat pumps",
    eligibility: "Improvements to your primary residence, must meet energy efficiency standards",
    form: "Form 5695",
    tips: "Annual limit resets each year — plan improvements across multiple years to maximize",
  },

  // === RETIREMENT ===
  {
    id: "savers_credit",
    name: "Retirement Savings Contributions Credit (Saver's Credit)",
    category: "retirement",
    refundable: "no",
    description: "Credit for contributions to IRA, 401(k), 403(b), or other retirement plans",
    maxAmount: "50%, 20%, or 10% of up to $2,000 in contributions ($4,000 MFJ). Max credit: $1,000 ($2,000 MFJ)",
    eligibility: "Age 18+, not full-time student, not claimed as dependent",
    phaseout: "TY2024 — Single: 50% up to $23,000 / 20% up to $25,000 / 10% up to $38,250. MFJ: double those amounts",
    form: "Form 8880",
    tips: "Often overlooked. If your income is moderate, this is free money on top of your retirement savings",
  },

  // === HEALTHCARE ===
  {
    id: "premium_tax_credit",
    name: "Premium Tax Credit (PTC)",
    category: "healthcare",
    refundable: "full",
    description: "Credit for health insurance premiums purchased through the Marketplace (ACA exchange)",
    maxAmount: "Varies based on income and premium costs. Can cover most or all of premium",
    eligibility: "Purchased coverage through Healthcare.gov or state exchange, income 100-400% FPL (expanded through 2025)",
    phaseout: "Sliding scale based on household income relative to Federal Poverty Level",
    form: "Form 8962",
    tips: "Can be taken in advance to reduce monthly premiums, or claimed at filing",
  },
  {
    id: "hsa_deduction",
    name: "Health Savings Account (HSA) Deduction",
    category: "healthcare",
    refundable: "no",
    description: "Above-the-line deduction for HSA contributions. Triple tax advantage: deductible, grows tax-free, tax-free withdrawals for medical",
    maxAmount: "TY2024: $4,150 individual / $8,300 family. TY2025: $4,300 / $8,550. Extra $1,000 catch-up if 55+",
    eligibility: "Must have High Deductible Health Plan (HDHP), no other health coverage, not enrolled in Medicare",
    form: "Form 8889",
    tips: "Best tax-advantaged account available. Consider maxing out before traditional IRA. Can invest and let it grow for decades",
  },

  // === INCOME-BASED ===
  {
    id: "eitc",
    name: "Earned Income Tax Credit (EITC)",
    category: "income",
    refundable: "full",
    description: "Refundable credit for low-to-moderate income workers",
    maxAmount: "TY2024: $632 (no children) / $3,995 (1 child) / $6,604 (2 children) / $7,430 (3+ children)",
    eligibility: "Must have earned income, meet AGI limits, SSN, US citizen/resident, not MFS, investment income < $11,600",
    phaseout: "Complex phase-in and phase-out based on earned income and number of children",
    form: "Schedule EIC",
    tips: "One of the largest credits available. Many eligible taxpayers don't claim it. Refunds delayed until mid-February",
  },

  // === OTHER ===
  {
    id: "foreign_tax_credit",
    name: "Foreign Tax Credit",
    category: "other",
    refundable: "no",
    description: "Credit for income taxes paid to foreign governments, avoiding double taxation",
    maxAmount: "Generally limited to US tax on foreign-source income",
    eligibility: "Paid or accrued foreign income taxes. Can elect credit or deduction",
    form: "Form 1116 (or directly on 1040 if $300/$600 or less)",
    tips: "Usually better to take as credit than deduction. If foreign taxes are small ($300 single / $600 MFJ), can skip Form 1116",
  },
  {
    id: "elderly_disabled",
    name: "Credit for the Elderly or Disabled",
    category: "other",
    refundable: "no",
    description: "Credit for taxpayers 65+ or permanently disabled with limited income",
    maxAmount: "Up to $1,125 (varies by filing status)",
    eligibility: "Age 65+ or permanently disabled, income below limits",
    phaseout: "Reduced by nontaxable Social Security and excess AGI",
    form: "Schedule R",
  },
  {
    id: "amt_credit",
    name: "Alternative Minimum Tax (AMT) Credit",
    category: "other",
    refundable: "no",
    description: "Credit for AMT paid in prior years due to timing differences (e.g., ISO stock options)",
    maxAmount: "Amount of prior year AMT attributable to deferral items",
    eligibility: "Paid AMT in prior years on deferral items like ISO exercises",
    form: "Form 8801",
    tips: "If you exercised ISOs and paid AMT, you may be able to recover that tax in future years",
  },
];
