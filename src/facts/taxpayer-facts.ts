import { z } from "zod";

export const TAXPAYER_FACTS_SCHEMA_VERSION = "1.0";

export const FilingStatusSchema = z.enum(
  [
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
  ],
  {
    error: "Filing status must be single, married_filing_jointly, married_filing_separately, or head_of_household",
  },
);

const IncomeSchema = z.object({
  w2: z.number().min(0).optional(),
  selfEmployment: z.number().min(0).optional(),
  taxableInterest: z.number().min(0).optional(),
  ordinaryDividends: z.number().min(0).optional(),
  qualifiedDividends: z.number().min(0).optional(),
  shortTermCapitalGain: z.number().optional(),
  longTermCapitalGain: z.number().optional(),
  shortTermCapitalLossCarryover: z.number().min(0).optional(),
  longTermCapitalLossCarryover: z.number().min(0).optional(),
  other: z.number().optional(),
  socialSecurityBenefits: z.number().min(0).optional(),
  taxExemptInterest: z.number().min(0).optional(),
  retirementDistributions: z.number().min(0).optional(),
  taxableRetirementDistributions: z.number().min(0).optional(),
  earlyRetirementDistributionSubjectToPenalty: z.number().min(0).optional(),
}).strict().describe(
  "Annual income facts. Qualified dividends are included in ordinary dividends.",
);

const DeductionsSchema = z.object({
  aboveTheLine: z.number().min(0).optional(),
  itemized: z.number().min(0).optional().describe(
    "Schedule A total after the SALT cap and medical floor, before the TY2026 charitable floor and IRC 68 limit",
  ),
  itemizedCharitable: z.number().min(0).optional().describe(
    "TY2026+: charitable portion of itemized, for the 0.5% of AGI floor",
  ),
  itemizedStateAndLocalTaxes: z.number().min(0).optional().describe(
    "State and local taxes included in itemized after the SALT cap; added back for AMT (Form 6251 line 2a)",
  ),
  nonItemizerCashCharitable: z.number().min(0).optional().describe(
    "TY2026+: qualifying cash gifts to public charities for the non-itemizer deduction",
  ),
  qualifiedTips: z.number().min(0).optional().describe("TY2025+ Schedule 1-A qualified tips"),
  qualifiedOvertimeCompensation: z.number().min(0).optional().describe(
    "TY2025+ Schedule 1-A FLSA overtime premium",
  ),
  qualifiedVehicleLoanInterest: z.number().min(0).optional().describe(
    "TY2025+ Schedule 1-A interest on a new US-assembled personal vehicle loan",
  ),
  forceItemized: z.boolean().optional(),
}).strict();

const FamilySchema = z.object({
  qualifyingChildrenForCtc: z.number().int().min(0).optional(),
  qualifyingChildrenForEitc: z.number().int().min(0).optional(),
  otherDependentsForOdc: z.number().int().min(0).optional(),
  socialSecurityTaxesPaid: z.number().min(0).optional(),
  hasForm2555: z.boolean().optional(),
  marriedFilingSeparatelyLivedWithSpouse: z.boolean().optional(),
  dependentCareExpenses: z.number().min(0).optional(),
  dependentCareQualifyingIndividuals: z.number().int().min(0).optional(),
  dependentCareBenefitsExcluded: z.number().min(0).optional(),
  spouseEarnedIncome: z.number().min(0).optional().describe(
    "MFJ only: spouse's earned income, already included in household income",
  ),
  age65OrOlder: z.boolean().optional(),
  spouseAge65OrOlder: z.boolean().optional(),
}).strict();

const EducationSchema = z.object({
  aotcStudentQualifiedExpenses: z.array(z.number().min(0)).optional(),
  aotcRefundableAllowed: z.boolean().optional(),
  lifetimeLearningQualifiedExpenses: z.number().min(0).optional(),
}).strict();

const BusinessSchema = z.object({
  qualifiedBusinessIncome: z.number().min(0),
  w2Wages: z.number().min(0).optional(),
  qualifiedPropertyBasis: z.number().min(0).optional(),
  isSstb: z.boolean().optional(),
  materialParticipation: z.boolean().optional().describe(
    "TY2026+: materially participates, enabling the $400 minimum QBI deduction",
  ),
}).strict();

const PaymentsSchema = z.object({
  federalWithholding: z.number().min(0).optional(),
  stateWithholding: z.number().min(0).optional(),
  estimatedPayments: z.number().min(0).optional(),
}).strict();

export const TAXPAYER_FACTS_SHAPE = {
  taxYear: z.number().int().describe("Tax year: 2024, 2025, or 2026"),
  filingStatus: FilingStatusSchema,
  income: IncomeSchema,
  deductions: DeductionsSchema.optional(),
  family: FamilySchema.optional(),
  education: EducationSchema.optional(),
  business: BusinessSchema.optional(),
  stateCode: z.string().length(2).regex(/^[A-Za-z]{2}$/).optional(),
  payments: PaymentsSchema.optional(),
};

export const TaxpayerFactsSchema = z.object(TAXPAYER_FACTS_SHAPE).strict();

export const TaxpayerFactsFileSchema = z.object({
  schemaVersion: z.literal(TAXPAYER_FACTS_SCHEMA_VERSION),
  ...TAXPAYER_FACTS_SHAPE,
}).strict();

export type TaxpayerFacts = z.infer<typeof TaxpayerFactsSchema>;
export type TaxpayerFactsFile = z.infer<typeof TaxpayerFactsFileSchema>;

export function createTaxpayerFactsFile(
  facts: TaxpayerFacts,
): TaxpayerFactsFile {
  return TaxpayerFactsFileSchema.parse({
    schemaVersion: TAXPAYER_FACTS_SCHEMA_VERSION,
    ...facts,
  });
}

export function parseTaxpayerFactsFile(input: unknown): TaxpayerFacts {
  const parsed = TaxpayerFactsFileSchema.parse(input);
  const {
    schemaVersion: _schemaVersion,
    ...facts
  } = parsed;
  return TaxpayerFactsSchema.parse(facts);
}
