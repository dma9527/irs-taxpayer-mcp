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
    errorMap: () => ({
      message: "Filing status must be single, married_filing_jointly, married_filing_separately, or head_of_household",
    }),
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
    "Eligible itemized deduction total after applicable limits",
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
