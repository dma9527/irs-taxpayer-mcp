/**
 * Common itemized deductions and their rules/limits.
 *
 * IRS Sources:
 *   Medical: IRC §213 (7.5% AGI floor)
 *   SALT: IRC §164, TCJA §11042 ($10K cap)
 *   Mortgage Interest: IRC §163(h), TCJA §11043 ($750K limit)
 *   Charitable: IRC §170
 *   Casualty: IRC §165(h) (federally declared disasters only post-TCJA)
 */

export interface DeductionRule {
  id: string;
  name: string;
  category: "medical" | "taxes" | "interest" | "charity" | "casualty" | "other";
  description: string;
  limit?: string;
  eligibility: string;
  form: string;
  line?: string;
}

export const ITEMIZED_DEDUCTIONS: DeductionRule[] = [
  {
    id: "medical_expenses",
    name: "Medical and Dental Expenses",
    category: "medical",
    description: "Unreimbursed medical and dental expenses that exceed 7.5% of AGI",
    limit: "Only the amount exceeding 7.5% of AGI is deductible",
    eligibility: "All taxpayers who itemize",
    form: "Schedule A",
    line: "Line 4",
  },
  {
    id: "state_local_taxes",
    name: "State and Local Taxes (SALT)",
    category: "taxes",
    description: "State/local income or sales taxes plus property taxes",
    limit: "TY2024: $10,000 cap ($5,000 MFS). TY2025: $40,000 cap ($20,000 MFS) for AGI ≤ $500K, phases down above. Per OBBB Act.",
    eligibility: "All taxpayers who itemize",
    form: "Schedule A",
    line: "Line 5d",
  },
  {
    id: "mortgage_interest",
    name: "Home Mortgage Interest",
    category: "interest",
    description: "Interest on mortgage debt for primary and second home",
    limit: "Interest on up to $750,000 of mortgage debt ($375,000 if MFS). Loans before 12/15/2017: $1M limit",
    eligibility: "Homeowners with qualified mortgage",
    form: "Schedule A",
    line: "Line 8a",
  },
  {
    id: "charitable_cash",
    name: "Charitable Contributions (Cash)",
    category: "charity",
    description: "Cash donations to qualified charitable organizations",
    limit: "Up to 60% of AGI for cash contributions to public charities",
    eligibility: "All taxpayers who itemize",
    form: "Schedule A",
    line: "Line 12",
  },
  {
    id: "charitable_noncash",
    name: "Charitable Contributions (Non-Cash)",
    category: "charity",
    description: "Donations of property, clothing, household items to qualified organizations",
    limit: "Generally up to 30% of AGI for appreciated property; 50% for other property",
    eligibility: "All taxpayers who itemize; items must be in good condition",
    form: "Schedule A",
    line: "Line 12",
  },
  {
    id: "investment_interest",
    name: "Investment Interest Expense",
    category: "interest",
    description: "Interest paid on money borrowed to purchase taxable investments",
    limit: "Limited to net investment income",
    eligibility: "Taxpayers with investment interest expense",
    form: "Form 4952",
  },
  {
    id: "casualty_loss",
    name: "Casualty and Theft Losses",
    category: "casualty",
    description: "Losses from federally declared disasters",
    limit: "Each loss reduced by $100, then total reduced by 10% of AGI",
    eligibility: "Only for federally declared disaster areas",
    form: "Form 4684",
  },
  {
    id: "gambling_losses",
    name: "Gambling Losses",
    category: "other",
    description: "Gambling losses to the extent of gambling winnings",
    limit: "Cannot exceed gambling winnings reported as income",
    eligibility: "Taxpayers who report gambling winnings",
    form: "Schedule A",
    line: "Line 16",
  },
];

export const ABOVE_THE_LINE_DEDUCTIONS = [
  {
    id: "educator_expenses",
    name: "Educator Expenses",
    description: "Unreimbursed classroom expenses for K-12 teachers",
    limit: "$300 per educator ($600 if both spouses are educators filing jointly)",
    form: "1040 Schedule 1",
  },
  {
    id: "hsa_deduction",
    name: "Health Savings Account (HSA) Deduction",
    description: "Contributions to a Health Savings Account",
    limit: "2024: $4,150 individual / $8,300 family. 2025: $4,300 individual / $8,550 family. Extra $1,000 if 55+",
    form: "Form 8889",
  },
  {
    id: "self_employment_tax",
    name: "Deductible Part of Self-Employment Tax",
    description: "50% of self-employment tax",
    limit: "50% of calculated SE tax",
    form: "1040 Schedule 1 / Schedule SE",
  },
  {
    id: "student_loan_interest",
    name: "Student Loan Interest",
    description: "Interest paid on qualified student loans",
    limit: "Up to $2,500; phases out at higher incomes",
    form: "1040 Schedule 1",
  },
  {
    id: "ira_deduction",
    name: "Traditional IRA Deduction",
    description: "Contributions to a traditional IRA",
    limit: "2024: $7,000 ($8,000 if 50+). 2025: $7,000 ($8,000 if 50+). May be limited if covered by employer plan",
    form: "1040 Schedule 1",
  },
];
