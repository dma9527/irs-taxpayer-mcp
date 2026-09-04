import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ShapeOutput } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { calculateEITC } from "../calculators/eitc-calculator.js";
import { calculateStateTax } from "../calculators/state-tax-calculator.js";
import { calculateTax } from "../calculators/tax-calculator.js";
import { getStateCalculationInfo } from "../data/state-taxes.js";
import { getTaxYearData } from "../data/tax-brackets.js";
import { ERRORS, toolError, wrapToolHandler } from "./error-handler.js";
import { FilingStatusEnum, fmt } from "./shared.js";

const PLAN_CONTRACT_VERSION = "1.0";

const FEDERAL_SOURCES: Record<number, { title: string; url: string }> = {
  2024: {
    title: "IRS Revenue Procedure 2023-34",
    url: "https://www.irs.gov/irb/2023-44_IRB#REV-PROC-2023-34",
  },
  2025: {
    title: "IRS Revenue Procedure 2024-40 and OBBB",
    url: "https://www.irs.gov/irb/2024-44_IRB#REV-PROC-2024-40",
  },
  2026: {
    title: "IRS Revenue Procedure 2025-32",
    url: "https://www.irs.gov/irb/2025-45_IRB#REV-PROC-2025-32",
  },
};

const TAX_PLAN_INPUT_SCHEMA = {
  taxYear: z.number().int().describe("Tax year: 2024, 2025, or 2026"),
  filingStatus: FilingStatusEnum,
  income: z.object({
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
  }).describe("Annual income facts. Qualified dividends are included in ordinary dividends."),
  deductions: z.object({
    aboveTheLine: z.number().min(0).optional(),
    itemized: z.number().min(0).optional().describe("Eligible itemized deduction total after applicable limits"),
    forceItemized: z.boolean().optional(),
  }).optional(),
  family: z.object({
    qualifyingChildrenForCtc: z.number().int().min(0).optional(),
    qualifyingChildrenForEitc: z.number().int().min(0).optional(),
    otherDependentsForOdc: z.number().int().min(0).optional(),
    socialSecurityTaxesPaid: z.number().min(0).optional(),
    hasForm2555: z.boolean().optional(),
    marriedFilingSeparatelyLivedWithSpouse: z.boolean().optional(),
  }).optional(),
  education: z.object({
    aotcStudentQualifiedExpenses: z.array(z.number().min(0)).optional(),
    aotcRefundableAllowed: z.boolean().optional(),
    lifetimeLearningQualifiedExpenses: z.number().min(0).optional(),
  }).optional(),
  business: z.object({
    qualifiedBusinessIncome: z.number().min(0),
    w2Wages: z.number().min(0).optional(),
    qualifiedPropertyBasis: z.number().min(0).optional(),
    isSstb: z.boolean().optional(),
  }).optional(),
  stateCode: z.string().length(2).optional(),
  payments: z.object({
    federalWithholding: z.number().min(0).optional(),
    stateWithholding: z.number().min(0).optional(),
    estimatedPayments: z.number().min(0).optional(),
  }).optional(),
};

const TAX_PLAN_OUTPUT_SCHEMA = {
  text: z.string(),
  isError: z.boolean(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    suggestion: z.string(),
  }).optional(),
  plan: z.object({
    contractVersion: z.literal(PLAN_CONTRACT_VERSION),
    taxYear: z.number(),
    filingStatus: FilingStatusEnum,
    privacy: z.object({
      execution: z.literal("local"),
      networkRequests: z.literal(false),
      persisted: z.literal(false),
      telemetry: z.literal(false),
    }),
    facts: z.object({
      grossIncome: z.number(),
      cashIncome: z.number(),
      earnedIncome: z.number(),
      investmentIncomeForEitc: z.number(),
      stateCode: z.string().optional(),
    }),
    results: z.object({
      adjustedGrossIncome: z.number(),
      deductionType: z.enum(["standard", "itemized"]),
      deductionAmount: z.number(),
      taxableIncome: z.number(),
      ordinaryIncomeTax: z.number(),
      capitalGainsTax: z.number(),
      selfEmploymentTax: z.number(),
      niit: z.number(),
      additionalMedicareTax: z.number(),
      amt: z.number(),
      refundableCredits: z.number(),
      federalTaxAfterRefundableCredits: z.number(),
      employeeFica: z.number(),
      stateTax: z.number(),
      totalTax: z.number(),
      takeHomeIncome: z.number(),
      federalBalance: z.number(),
      stateBalance: z.number(),
      estimatedQuarterlyPayment: z.number(),
      marginalRate: z.number(),
      effectiveFederalRate: z.number(),
    }),
    assumptions: z.array(z.string()),
    warnings: z.array(z.string()),
    unsupportedBoundaries: z.array(z.string()),
    sources: z.array(z.object({
      title: z.string(),
      url: z.string().optional(),
    })),
    calculationTrace: z.array(z.object({
      step: z.string(),
      amount: z.number(),
      description: z.string(),
    })),
  }).optional(),
};

type TaxPlanInput = ShapeOutput<typeof TAX_PLAN_INPUT_SCHEMA>;

function currency(amount: number): string {
  return amount < 0 ? `-$${fmt(Math.abs(amount))}` : `$${fmt(amount)}`;
}

export function registerTaxPlanTools(server: McpServer): void {
  const handler = wrapToolHandler<TaxPlanInput>(async (params) => {
    const taxData = getTaxYearData(params.taxYear);
    if (!taxData) return ERRORS.unsupportedYear(params.taxYear);

    const income = params.income;
    const w2Income = income.w2 ?? 0;
    const selfEmploymentIncome = income.selfEmployment ?? 0;
    const interestIncome = income.taxableInterest ?? 0;
    const ordinaryDividends = income.ordinaryDividends ?? 0;
    const qualifiedDividends = income.qualifiedDividends ?? 0;
    const shortTermCapitalGains = income.shortTermCapitalGain ?? 0;
    const longTermCapitalGains = income.longTermCapitalGain ?? 0;
    const otherIncome = income.other ?? 0;
    const socialSecurityBenefits = income.socialSecurityBenefits ?? 0;
    const retirementDistributions = income.retirementDistributions ?? 0;

    if (qualifiedDividends > ordinaryDividends) {
      return toolError({
        code: "INVALID_INPUT",
        message: "Qualified dividends cannot exceed ordinary dividends.",
        suggestion: "Include qualified dividends in ordinaryDividends and enter only the qualified subset in qualifiedDividends.",
      });
    }

    if ((income.taxableRetirementDistributions ?? 0) > retirementDistributions) {
      return toolError({
        code: "INVALID_INPUT",
        message: "Taxable retirement distributions cannot exceed gross retirement distributions.",
        suggestion: "Check Form 1099-R boxes 1 and 2a.",
      });
    }

    if (retirementDistributions > 0
      && income.taxableRetirementDistributions === undefined) {
      return toolError({
        code: "INVALID_INPUT",
        message: "Taxable retirement distributions are required when gross retirement distributions are provided.",
        suggestion: "Enter the taxable amount from Form 1099-R box 2a or determine it before using the planner.",
      });
    }

    if ((income.earlyRetirementDistributionSubjectToPenalty ?? 0)
      > (income.taxableRetirementDistributions ?? 0)) {
      return toolError({
        code: "INVALID_INPUT",
        message: "The early-distribution penalty base cannot exceed the taxable retirement distribution.",
        suggestion: "Enter the taxable early-distribution amount after applicable exceptions.",
      });
    }

    if (params.business
      && (params.business.isSstb === undefined
        || params.business.w2Wages === undefined
        || params.business.qualifiedPropertyBasis === undefined)) {
      return toolError({
        code: "INVALID_INPUT",
        message: "QBI planning requires SSTB status, W-2 wages, and qualified property basis.",
        suggestion: "Provide all business limitation facts, using zero where the verified amount is zero.",
      });
    }

    const currentCapitalIncome = shortTermCapitalGains
      + longTermCapitalGains;
    const netCapitalIncome = currentCapitalIncome
      - (income.shortTermCapitalLossCarryover ?? 0)
      - (income.longTermCapitalLossCarryover ?? 0);
    const calculatorGrossIncome = w2Income
      + selfEmploymentIncome
      + interestIncome
      + ordinaryDividends
      + currentCapitalIncome
      + otherIncome
      + socialSecurityBenefits
      + retirementDistributions;
    if (calculatorGrossIncome <= 0) {
      return toolError({
        code: "INVALID_INPUT",
        message: "Supplied income is outside the planner's supported loss boundary.",
        suggestion: "Net operating losses and cases where total income is not positive require tax-professional review.",
      });
    }

    const earnedIncome = w2Income + Math.max(0, selfEmploymentIncome);
    const netInvestmentIncome = interestIncome
      + ordinaryDividends
      + Math.max(0, netCapitalIncome);
    const investmentIncomeForEitc = netInvestmentIncome
      + (income.taxExemptInterest ?? 0);

    const federalResult = calculateTax({
      taxYear: params.taxYear,
      filingStatus: params.filingStatus,
      grossIncome: calculatorGrossIncome,
      w2Income,
      selfEmploymentIncome,
      capitalGains: longTermCapitalGains,
      qualifiedDividends,
      capitalGainsLongTerm: true,
      shortTermCapitalGains,
      shortTermCapitalLossCarryover: income.shortTermCapitalLossCarryover,
      longTermCapitalLossCarryover: income.longTermCapitalLossCarryover,
      socialSecurityBenefits: income.socialSecurityBenefits,
      taxExemptInterest: income.taxExemptInterest,
      marriedFilingSeparatelyLivedWithSpouse:
        params.family?.marriedFilingSeparatelyLivedWithSpouse,
      retirementDistributions: income.retirementDistributions,
      taxableRetirementDistributions: income.taxableRetirementDistributions,
      earlyRetirementDistributionSubjectToPenalty:
        income.earlyRetirementDistributionSubjectToPenalty,
      netInvestmentIncome,
      aboveTheLineDeductions: params.deductions?.aboveTheLine,
      itemizedDeductions: params.deductions?.itemized,
      forceItemizedDeductions: params.deductions?.forceItemized,
      dependents: params.family?.qualifyingChildrenForCtc,
      qualifyingChildrenForCtc: params.family?.qualifyingChildrenForCtc,
      otherDependentsForOdc: params.family?.otherDependentsForOdc,
      earnedIncome,
      socialSecurityTaxesPaid: params.family?.socialSecurityTaxesPaid,
      hasForm2555: params.family?.hasForm2555,
      aotcStudentQualifiedExpenses:
        params.education?.aotcStudentQualifiedExpenses,
      aotcRefundableAllowed: params.education?.aotcRefundableAllowed,
      lifetimeLearningQualifiedExpenses:
        params.education?.lifetimeLearningQualifiedExpenses,
      qualifiedBusinessIncome: params.business?.qualifiedBusinessIncome,
      qualifiedBusinessW2Wages: params.business?.w2Wages,
      qualifiedBusinessPropertyBasis: params.business?.qualifiedPropertyBasis,
      qualifiedBusinessIsSstb: params.business?.isSstb,
    });

    const planGrossIncome = federalResult.adjustedGrossIncome
      + (params.deductions?.aboveTheLine ?? 0);

    const eitcResult = calculateEITC({
      taxYear: params.taxYear,
      filingStatus: params.filingStatus,
      earnedIncome,
      agi: federalResult.adjustedGrossIncome,
      qualifyingChildren: params.family?.qualifyingChildrenForEitc ?? 0,
      investmentIncome: investmentIncomeForEitc,
    });
    const earnedIncomeCredit = eitcResult.eligible ? eitcResult.credit : 0;
    const federalTaxAfterRefundableCredits =
      federalResult.totalFederalTax - earnedIncomeCredit;

    const employeeFica = Math.round(
      Math.min(w2Income, taxData.socialSecurity.wageBase)
        * taxData.socialSecurity.taxRate
      + w2Income * taxData.medicare.taxRate,
    );

    let stateTax = 0;
    let stateBalance = 0;
    const federalSource = FEDERAL_SOURCES[params.taxYear];
    if (!federalSource) {
      return ERRORS.notAvailable(
        `TY${params.taxYear} planner provenance`,
        "Add an official federal source before exposing the year through generate_tax_plan.",
      );
    }
    const sources: Array<{ title: string; url?: string }> = [federalSource];
    if (params.stateCode) {
      const stateResult = calculateStateTax({
        stateCode: params.stateCode,
        taxYear: params.taxYear,
        incomeBeforeDeductions: federalResult.adjustedGrossIncome,
        filingStatus: params.filingStatus === "married_filing_jointly"
          ? "married"
          : "single",
      });
      if (!stateResult) return ERRORS.invalidState(params.stateCode);
      stateTax = stateResult.tax;
      stateBalance = stateTax - (params.payments?.stateWithholding ?? 0);
      const stateSource = getStateCalculationInfo(
        params.stateCode,
        params.taxYear,
      );
      if (stateSource) sources.push({ title: stateSource.source, url: undefined });
    }

    const federalPayments = (params.payments?.federalWithholding ?? 0)
      + (params.payments?.estimatedPayments ?? 0);
    const federalBalance = federalTaxAfterRefundableCredits - federalPayments;
    const totalTax = federalTaxAfterRefundableCredits + employeeFica + stateTax;
    const takeHomeIncome = calculatorGrossIncome - totalTax;
    const refundableCredits = earnedIncomeCredit
      + federalResult.additionalChildTaxCredit
      + federalResult.refundableAmericanOpportunityCredit;

    const assumptions = [
      "All inputs are annual US-dollar amounts supplied by the user.",
      "CTC, ODC, and EITC dependent counts have each been verified under their separate eligibility tests.",
      "Any supplied itemized deduction is already limited to an eligible Schedule A amount.",
      "State estimates use federal AGI as pre-deduction state income and only exact-year profiles.",
    ];
    const warnings = [...federalResult.limitations];
    if (params.stateCode) {
      warnings.push("Part-year, nonresident, local, multi-state allocation, and state-specific income adjustments are not modeled.");
      if (params.filingStatus === "head_of_household"
        || params.filingStatus === "married_filing_separately") {
        warnings.push("The supported state estimate uses the single state profile for this federal filing status.");
      }
      if (socialSecurityBenefits > 0) {
        warnings.push("The state estimate does not subtract state-exempt Social Security benefits from its federal-AGI starting point.");
      }
    }

    const unsupportedBoundaries = [
      "Tax return preparation, signature, and electronic filing.",
      "Eligibility facts not explicitly supplied and verified by the user.",
      "Unmodeled forms, elections, worksheets, local taxes, and state adjustments.",
      "Tax years and state profiles not explicitly included in this release.",
    ];

    const calculationTrace = [
      { step: "cash_income", amount: calculatorGrossIncome, description: "Sum of supplied cash income categories before tax normalization." },
      { step: "gross_income", amount: planGrossIncome, description: "Income after modeled capital-loss limits and taxable-benefit normalization." },
      { step: "adjusted_gross_income", amount: federalResult.adjustedGrossIncome, description: "Gross income after modeled above-the-line adjustments and taxable-benefit rules." },
      { step: "deduction", amount: federalResult.deductionAmount, description: `${federalResult.deductionType} deduction selected.` },
      { step: "taxable_income", amount: federalResult.taxableIncome, description: "AGI after deductions and modeled QBI deduction." },
      { step: "federal_tax", amount: federalTaxAfterRefundableCredits, description: "Federal income and other modeled taxes after modeled refundable credits." },
      { step: "employee_fica", amount: employeeFica, description: "Employee Social Security and Medicare share on W-2 wages." },
      { step: "state_tax", amount: stateTax, description: "Exact-year supported state estimate, if requested." },
      { step: "total_tax", amount: totalTax, description: "Federal tax, employee FICA, and supported state tax." },
    ];

    const plan = {
      contractVersion: PLAN_CONTRACT_VERSION,
      taxYear: params.taxYear,
      filingStatus: params.filingStatus,
      privacy: {
        execution: "local",
        networkRequests: false,
        persisted: false,
        telemetry: false,
      },
      facts: {
        grossIncome: planGrossIncome,
        cashIncome: calculatorGrossIncome,
        earnedIncome,
        investmentIncomeForEitc,
        ...(params.stateCode ? { stateCode: params.stateCode.toUpperCase() } : {}),
      },
      results: {
        adjustedGrossIncome: federalResult.adjustedGrossIncome,
        deductionType: federalResult.deductionType,
        deductionAmount: federalResult.deductionAmount,
        taxableIncome: federalResult.taxableIncome,
        ordinaryIncomeTax: federalResult.ordinaryIncomeTax,
        capitalGainsTax: federalResult.capitalGainsTax,
        selfEmploymentTax: federalResult.selfEmploymentTax,
        niit: federalResult.niit,
        additionalMedicareTax: federalResult.additionalMedicareTax,
        amt: federalResult.amt,
        refundableCredits,
        federalTaxAfterRefundableCredits,
        employeeFica,
        stateTax,
        totalTax,
        takeHomeIncome,
        federalBalance,
        stateBalance,
        estimatedQuarterlyPayment: Math.max(
          0,
          Math.ceil(federalTaxAfterRefundableCredits / 4),
        ),
        marginalRate: federalResult.marginalRate,
        effectiveFederalRate: planGrossIncome > 0
          ? federalTaxAfterRefundableCredits / planGrossIncome
          : 0,
      },
      assumptions,
      warnings,
      unsupportedBoundaries,
      sources,
      calculationTrace,
    };

    const text = [
      `# Local Tax Plan for TY${params.taxYear}`,
      "",
      `Filing status: ${params.filingStatus.replaceAll("_", " ")}`,
      `Cash income: ${currency(calculatorGrossIncome)}`,
      `Tax gross income: ${currency(planGrossIncome)}`,
      `Adjusted gross income: ${currency(federalResult.adjustedGrossIncome)}`,
      `Taxable income: ${currency(federalResult.taxableIncome)}`,
      `Federal tax after refundable credits: ${currency(federalTaxAfterRefundableCredits)}`,
      `Employee FICA: ${currency(employeeFica)}`,
      `State tax: ${currency(stateTax)}`,
      `Total modeled tax: ${currency(totalTax)}`,
      `Take-home income: ${currency(takeHomeIncome)}`,
      "",
      "## Privacy",
      "Calculated locally. No network request, persistence, or telemetry is used.",
      "",
      "## Boundaries",
      ...unsupportedBoundaries.map((boundary) => `- ${boundary}`),
      "",
      "This is a deterministic planning estimate, not tax preparation or filing advice.",
    ].join("\n");

    return {
      content: [{ type: "text", text }],
      structuredContent: {
        text,
        isError: false,
        plan,
      },
    };
  });

  server.registerTool<typeof TAX_PLAN_OUTPUT_SCHEMA, typeof TAX_PLAN_INPUT_SCHEMA>(
    "generate_tax_plan",
    {
      description:
        "Generate a deterministic, privacy-first local tax plan with structured results, assumptions, source provenance, calculation trace, and explicit unsupported boundaries.",
      inputSchema: TAX_PLAN_INPUT_SCHEMA,
      outputSchema: TAX_PLAN_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    handler,
  );
}
