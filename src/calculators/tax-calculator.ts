/**
 * Core tax calculation engine.
 * All calculations run locally — no user data leaves the machine.
 */

import {
  type FilingStatus,
  type TaxBracket,
  type TaxYearData,
  getTaxYearData,
} from "../data/tax-brackets.js";
import {
  validate,
  validateIncome,
  validateTaxYear,
  TaxInputValidationError,
} from "./validation.js";

export interface TaxInput {
  taxYear: number;
  filingStatus: FilingStatus;
  grossIncome: number;
  w2Income?: number;
  selfEmploymentIncome?: number;
  capitalGains?: number;
  qualifiedDividends?: number;
  capitalGainsLongTerm?: boolean;
  shortTermCapitalGains?: number;
  shortTermCapitalLossCarryover?: number;
  longTermCapitalLossCarryover?: number;
  socialSecurityBenefits?: number;
  taxExemptInterest?: number;
  marriedFilingSeparatelyLivedWithSpouse?: boolean;
  retirementDistributions?: number;
  taxableRetirementDistributions?: number;
  earlyRetirementDistributionSubjectToPenalty?: number;
  aotcStudentQualifiedExpenses?: number[];
  aotcRefundableAllowed?: boolean;
  lifetimeLearningQualifiedExpenses?: number;
  netInvestmentIncome?: number;
  aboveTheLineDeductions?: number;
  /** Schedule A total after the SALT cap and AGI floors, before the TY2026 charitable floor and IRC 68 limit. */
  itemizedDeductions?: number;
  /** Charitable portion included in itemizedDeductions (for the TY2026 0.5% of AGI floor). */
  itemizedCharitableContributions?: number;
  /** Qualifying cash gifts to public charities for the TY2026 non-itemizer deduction. */
  charitableCashContributions?: number;
  forceItemizedDeductions?: boolean;
  dependents?: number;
  qualifyingChildrenForCtc?: number;
  otherDependentsForOdc?: number;
  earnedIncome?: number;
  socialSecurityTaxesPaid?: number;
  earnedIncomeCredit?: number;
  hasForm2555?: boolean;
  age65OrOlder?: boolean;
  blind?: boolean;
  spouseAge65OrOlder?: boolean;
  spouseBlind?: boolean;
  qualifiedBusinessIncome?: number;
  qualifiedBusinessW2Wages?: number;
  qualifiedBusinessPropertyBasis?: number;
  qualifiedBusinessIsSstb?: boolean;
  /** Taxpayer materially participates in the QBI businesses (IRC 199A(i) minimum deduction). */
  qualifiedBusinessMaterialParticipation?: boolean;
  isoExerciseSpread?: number;
  stateTaxDeducted?: number;
  /** Schedule 1-A (TY2025+): qualified tips, overtime premium, and US-assembled vehicle loan interest. */
  qualifiedTips?: number;
  qualifiedOvertimeCompensation?: number;
  qualifiedVehicleLoanInterest?: number;
  dependentCareExpenses?: number;
  dependentCareQualifyingIndividuals?: number;
  /** Employer dependent care benefits excluded under IRC 129. */
  dependentCareBenefitsExcluded?: number;
  /** MFJ only: the spouse's earned income, included in combined earned income. */
  spouseEarnedIncome?: number;
}

export interface TaxBreakdown {
  taxYear: number;
  filingStatus: FilingStatus;
  grossIncome: number;
  adjustedGrossIncome: number;
  deductionType: "standard" | "itemized";
  deductionAmount: number;
  nonItemizerCharitableDeduction: number;
  itemizedDeductionLimitReduction: number;
  scheduleOneADeductions: ScheduleOneADeductions;
  taxableIncome: number;
  bracketBreakdown: { rate: number; taxableAmount: number; tax: number }[];
  ordinaryIncomeTax: number;
  capitalGainsTax: number;
  capitalLossDeduction: number;
  shortTermCapitalLossCarryforward: number;
  longTermCapitalLossCarryforward: number;
  taxableSocialSecurityBenefits: number;
  taxableRetirementDistributions: number;
  earlyRetirementDistributionAdditionalTax: number;
  americanOpportunityCredit: number;
  refundableAmericanOpportunityCredit: number;
  nonrefundableAmericanOpportunityCreditApplied: number;
  lifetimeLearningCreditApplied: number;
  selfEmploymentTax: number;
  niit: number;
  additionalMedicareTax: number;
  qbiDeduction: number;
  qbiWagePropertyLimit: number;
  qbiPhaseInPercentage: number;
  qbiCalculationMethod:
    | "none"
    | "below_threshold"
    | "phase_in"
    | "wage_property_limited"
    | "sstb_phase_out"
    | "sstb_disallowed";
  amt: number;
  totalFederalTax: number;
  effectiveRate: number;
  marginalRate: number;
  childTaxCredit: number;
  creditForOtherDependents: number;
  dependentCareCredit: number;
  additionalChildTaxCredit: number;
  actcCalculationMethod: "none" | "earned_income" | "earned_income_limited" | "three_child_payroll";
  limitations: string[];
  estimatedQuarterlyPayment: number;
}

function calculateBracketTax(
  taxableIncome: number,
  brackets: TaxBracket[]
): { breakdown: { rate: number; taxableAmount: number; tax: number }[]; total: number; marginalRate: number } {
  const breakdown: { rate: number; taxableAmount: number; tax: number }[] = [];
  let remaining = taxableIncome;
  let total = 0;
  let marginalRate = 0;

  for (const bracket of brackets) {
    if (remaining <= 0) break;

    const bracketSize = bracket.max !== null ? bracket.max - bracket.min : Infinity;
    const taxableAmount = Math.min(remaining, bracketSize);
    const tax = taxableAmount * bracket.rate;

    breakdown.push({ rate: bracket.rate, taxableAmount, tax });
    total += tax;
    remaining -= taxableAmount;
    marginalRate = bracket.rate;
  }

  return { breakdown, total, marginalRate };
}

function calculateCapitalGainsTax(
  gains: number,
  taxableOrdinaryIncome: number,
  filingStatus: FilingStatus,
  taxData: TaxYearData
): number {
  if (gains <= 0) return 0;

  const cgBrackets = taxData.capitalGainsBrackets[filingStatus];
  let tax = 0;
  let remainingGains = gains;
  let incomeFloor = taxableOrdinaryIncome;

  for (const bracket of cgBrackets) {
    if (remainingGains <= 0) break;

    const spaceInBracket = Math.max(0, bracket.threshold - incomeFloor);
    const taxableAtThisRate = Math.min(remainingGains, spaceInBracket);

    tax += taxableAtThisRate * bracket.rate;
    remainingGains -= taxableAtThisRate;
    incomeFloor += taxableAtThisRate;
  }

  return tax;
}

interface CapitalNettingResult {
  longTermGain: number;
  shortTermGain: number;
  capitalLossDeduction: number;
  shortTermCapitalLossCarryforward: number;
  longTermCapitalLossCarryforward: number;
}

function calculateCapitalNetting(
  currentLongTermGainOrLoss: number,
  currentShortTermGainOrLoss: number,
  longTermLossCarryover: number,
  shortTermLossCarryover: number,
  filingStatus: FilingStatus,
): CapitalNettingResult {
  let netLongTerm = currentLongTermGainOrLoss - longTermLossCarryover;
  let netShortTerm = currentShortTermGainOrLoss - shortTermLossCarryover;

  if (netLongTerm > 0 && netShortTerm < 0) {
    const offset = Math.min(netLongTerm, -netShortTerm);
    netLongTerm -= offset;
    netShortTerm += offset;
  } else if (netShortTerm > 0 && netLongTerm < 0) {
    const offset = Math.min(netShortTerm, -netLongTerm);
    netShortTerm -= offset;
    netLongTerm += offset;
  }

  const shortTermLoss = Math.max(0, -netShortTerm);
  const longTermLoss = Math.max(0, -netLongTerm);
  const annualLossLimit = filingStatus === "married_filing_separately" ? 1500 : 3000;
  const capitalLossDeduction = Math.min(
    annualLossLimit,
    shortTermLoss + longTermLoss,
  );
  const shortTermLossUsed = Math.min(shortTermLoss, capitalLossDeduction);
  const remainingDeduction = capitalLossDeduction - shortTermLossUsed;

  return {
    longTermGain: Math.max(0, netLongTerm),
    shortTermGain: Math.max(0, netShortTerm),
    capitalLossDeduction,
    shortTermCapitalLossCarryforward: shortTermLoss - shortTermLossUsed,
    longTermCapitalLossCarryforward: Math.max(0, longTermLoss - remainingDeduction),
  };
}

function calculateSelfEmploymentTax(seIncome: number, taxData: TaxYearData, w2Income: number = 0): number {
  if (seIncome <= 0) return 0;

  const netEarnings = seIncome * 0.9235; // 92.35% of SE income
  // W-2 wages already used part of the SS wage base
  const remainingWageBase = Math.max(0, taxData.socialSecurity.wageBase - w2Income);
  const ssWages = Math.min(netEarnings, remainingWageBase);
  const ssTax = ssWages * taxData.socialSecurity.taxRate * 2; // both employer + employee share
  const medicareTax = netEarnings * taxData.medicare.taxRate * 2;

  return ssTax + medicareTax;
}

/**
 * Net Investment Income Tax (NIIT) — 3.8% on investment income
 * for taxpayers with MAGI above threshold.
 */
function calculateNIIT(
  agi: number,
  investmentIncome: number,
  filingStatus: FilingStatus
): number {
  const thresholds: Record<FilingStatus, number> = {
    single: 200000,
    married_filing_jointly: 250000,
    married_filing_separately: 125000,
    head_of_household: 200000,
  };
  const threshold = thresholds[filingStatus];
  if (agi <= threshold || investmentIncome <= 0) return 0;

  const excess = agi - threshold;
  const taxableNII = Math.min(investmentIncome, excess);
  return taxableNII * 0.038;
}

/**
 * Additional Medicare Tax — 0.9% on earned income above threshold.
 * Applies to W-2 wages + SE income.
 */
function calculateAdditionalMedicareTax(
  earnedIncome: number,
  filingStatus: FilingStatus,
  taxData: TaxYearData
): number {
  const threshold = taxData.medicare.additionalTaxThreshold[filingStatus];
  if (earnedIncome <= threshold) return 0;
  return (earnedIncome - threshold) * taxData.medicare.additionalTaxRate;
}

function calculateTaxableSocialSecurityBenefits(
  benefits: number,
  otherAdjustedGrossIncome: number,
  taxExemptInterest: number,
  filingStatus: FilingStatus,
  marriedFilingSeparatelyLivedWithSpouse: boolean | undefined,
): number {
  if (benefits <= 0) return 0;
  if (benefits < 0 || taxExemptInterest < 0) {
    throw new Error("Social Security benefits and tax-exempt interest must be nonnegative.");
  }

  let baseAmount: number;
  let adjustedBaseAmount: number;
  if (filingStatus === "married_filing_jointly") {
    baseAmount = 32000;
    adjustedBaseAmount = 44000;
  } else if (filingStatus === "married_filing_separately") {
    if (marriedFilingSeparatelyLivedWithSpouse === undefined) {
      throw new Error(
        "marriedFilingSeparatelyLivedWithSpouse is required when MFS Social Security benefits are provided.",
      );
    }
    if (marriedFilingSeparatelyLivedWithSpouse) {
      const worksheetIncome = Math.max(
        0,
        benefits * 0.50 + otherAdjustedGrossIncome + taxExemptInterest,
      );
      return Math.min(benefits * 0.85, worksheetIncome * 0.85);
    }
    baseAmount = 25000;
    adjustedBaseAmount = 34000;
  } else {
    baseAmount = 25000;
    adjustedBaseAmount = 34000;
  }

  const provisionalIncome = benefits * 0.50
    + otherAdjustedGrossIncome
    + taxExemptInterest;
  if (provisionalIncome <= baseAmount) return 0;
  if (provisionalIncome <= adjustedBaseAmount) {
    return Math.min(
      benefits * 0.50,
      (provisionalIncome - baseAmount) * 0.50,
    );
  }

  const firstTierTaxable = Math.min(
    benefits * 0.50,
    (adjustedBaseAmount - baseAmount) * 0.50,
  );
  return Math.min(
    benefits * 0.85,
    firstTierTaxable + (provisionalIncome - adjustedBaseAmount) * 0.85,
  );
}

interface EducationCreditResult {
  americanOpportunityCredit: number;
  refundableAmericanOpportunityCredit: number;
  nonrefundableAmericanOpportunityCredit: number;
  lifetimeLearningCredit: number;
}

function calculateEducationCredits(
  agi: number,
  filingStatus: FilingStatus,
  aotcStudentQualifiedExpenses: number[] | undefined,
  aotcRefundableAllowed: boolean | undefined,
  lifetimeLearningQualifiedExpenses: number,
  hasForm2555: boolean,
): EducationCreditResult {
  const aotcExpenses = aotcStudentQualifiedExpenses ?? [];
  const hasEducationExpenses = aotcExpenses.length > 0
    || lifetimeLearningQualifiedExpenses > 0;
  if (!hasEducationExpenses) {
    return {
      americanOpportunityCredit: 0,
      refundableAmericanOpportunityCredit: 0,
      nonrefundableAmericanOpportunityCredit: 0,
      lifetimeLearningCredit: 0,
    };
  }
  if (filingStatus === "married_filing_separately") {
    throw new Error("Married filing separately cannot claim AOTC or Lifetime Learning Credit.");
  }
  if (hasForm2555) {
    throw new Error(
      "Education-credit MAGI with Form 2555 requires additional Form 8863 worksheet inputs and is not supported.",
    );
  }
  if (aotcExpenses.some((expense) => expense < 0)
    || lifetimeLearningQualifiedExpenses < 0) {
    throw new Error("Qualified education expenses must be nonnegative.");
  }
  if (aotcExpenses.length > 0 && aotcRefundableAllowed === undefined) {
    throw new Error(
      "aotcRefundableAllowed is required after applying the under-age-24 support rules.",
    );
  }

  const lowerPhaseout = filingStatus === "married_filing_jointly"
    ? 160000
    : 80000;
  const upperPhaseout = filingStatus === "married_filing_jointly"
    ? 180000
    : 90000;
  const phaseoutFactor = agi <= lowerPhaseout
    ? 1
    : agi >= upperPhaseout
      ? 0
      : (upperPhaseout - agi) / (upperPhaseout - lowerPhaseout);

  const tentativeAotc = aotcExpenses.reduce((total, expense) => {
    const firstTier = Math.min(expense, 2000);
    const secondTier = Math.min(Math.max(0, expense - 2000), 2000) * 0.25;
    return total + firstTier + secondTier;
  }, 0) * phaseoutFactor;
  const refundableAmericanOpportunityCredit = aotcRefundableAllowed
    ? tentativeAotc * 0.40
    : 0;
  const nonrefundableAmericanOpportunityCredit = tentativeAotc
    - refundableAmericanOpportunityCredit;
  const lifetimeLearningCredit = Math.min(
    lifetimeLearningQualifiedExpenses,
    10000,
  ) * 0.20 * phaseoutFactor;

  return {
    americanOpportunityCredit: tentativeAotc,
    refundableAmericanOpportunityCredit,
    nonrefundableAmericanOpportunityCredit,
    lifetimeLearningCredit,
  };
}

interface QBIResult {
  deduction: number;
  wagePropertyLimit: number;
  phaseInPercentage: number;
  method: TaxBreakdown["qbiCalculationMethod"];
}

/** Qualified Business Income deduction under Section 199A planning rules. */
function calculateQBIDeduction(
  qbi: number,
  taxableIncomeBeforeQBI: number,
  netCapitalGain: number,
  filingStatus: FilingStatus,
  taxData: TaxYearData,
  isSstb: boolean | undefined,
  w2Wages: number | undefined,
  qualifiedPropertyBasis: number | undefined,
): QBIResult {
  if (qbi <= 0) {
    return {
      deduction: 0,
      wagePropertyLimit: 0,
      phaseInPercentage: 0,
      method: "none",
    };
  }

  const rate = taxData.qualifiedBusinessIncomeDeductionRate;
  const taxableIncomeLimit = Math.max(
    0,
    taxableIncomeBeforeQBI - netCapitalGain,
  ) * rate;
  const baseDeduction = Math.min(qbi * rate, taxableIncomeLimit);
  const limit = taxData.qbiLimit[filingStatus];

  if (taxableIncomeBeforeQBI <= limit.threshold) {
    return {
      deduction: baseDeduction,
      wagePropertyLimit: 0,
      phaseInPercentage: 0,
      method: "below_threshold",
    };
  }

  if (isSstb === undefined) {
    throw new Error(
      "qualifiedBusinessIsSstb is required when taxable income exceeds the QBI threshold.",
    );
  }
  if (w2Wages === undefined || qualifiedPropertyBasis === undefined) {
    throw new Error(
      "qualifiedBusinessW2Wages and qualifiedBusinessPropertyBasis are required above the QBI threshold; pass 0 when none apply.",
    );
  }
  if (w2Wages < 0 || qualifiedPropertyBasis < 0) {
    throw new Error("QBI wage and qualified-property inputs must be nonnegative.");
  }

  const phaseInPercentage = Math.min(
    1,
    (taxableIncomeBeforeQBI - limit.threshold)
      / (limit.phaseoutEnd - limit.threshold),
  );
  if (isSstb && phaseInPercentage >= 1) {
    return {
      deduction: 0,
      wagePropertyLimit: 0,
      phaseInPercentage,
      method: "sstb_disallowed",
    };
  }

  const applicablePercentage = isSstb ? 1 - phaseInPercentage : 1;
  const applicableQbi = qbi * applicablePercentage;
  const applicableWages = w2Wages * applicablePercentage;
  const applicablePropertyBasis = qualifiedPropertyBasis * applicablePercentage;
  const tentativeDeduction = applicableQbi * rate;
  const wagePropertyLimit = Math.max(
    applicableWages * 0.50,
    applicableWages * 0.25 + applicablePropertyBasis * 0.025,
  );
  const wagePropertyReduction = Math.max(
    0,
    tentativeDeduction - wagePropertyLimit,
  ) * phaseInPercentage;

  return {
    deduction: Math.min(
      taxableIncomeLimit,
      Math.max(0, tentativeDeduction - wagePropertyReduction),
    ),
    wagePropertyLimit,
    phaseInPercentage,
    method: isSstb
      ? "sstb_phase_out"
      : phaseInPercentage < 1
        ? "phase_in"
        : "wage_property_limited",
  };
}

/**
 * Alternative Minimum Tax (AMT).
 * Simplified: adds back common AMT preference items (SALT, ISO spread),
 * applies AMT exemption with phase-out, then 26%/28% rates.
 * AMT = max(0, tentative AMT - regular tax).
 */
function calculateAMT(
  regularTax: number,
  taxableIncome: number,
  preferentialIncome: number,
  filingStatus: FilingStatus,
  taxData: TaxYearData,
  isoSpread: number,
  saltDeducted: number,
  standardDeductionAddBack: number,
  regularOrdinaryTaxableIncome: number,
): number {
  // AMTI = regular taxable income + standard deduction or SALT (Form 6251 line 2a) + ISO spread.
  const amtIncome = taxableIncome + isoSpread + saltDeducted + standardDeductionAddBack;

  // Exemption phase-out: 25 cents per dollar through TY2025, 50 cents from TY2026 (OBBB).
  let exemption = taxData.amt.exemption[filingStatus];
  const phaseoutStart = taxData.amt.phaseoutStart[filingStatus];
  if (amtIncome > phaseoutStart) {
    const reduction = (amtIncome - phaseoutStart) * taxData.amt.phaseoutRate;
    exemption = Math.max(0, exemption - reduction);
  }

  const amtBase = Math.max(0, amtIncome - exemption);

  const amtPreferentialIncome = Math.min(
    Math.max(0, preferentialIncome),
    amtBase,
  );
  const amtOrdinaryIncome = amtBase - amtPreferentialIncome;

  // Apply 26% and 28% AMT rates only to ordinary AMTI.
  const threshold = taxData.amt.rate28Threshold[filingStatus];
  const ordinaryTentativeTax = amtOrdinaryIncome <= threshold
    ? amtOrdinaryIncome * 0.26
    : threshold * 0.26 + (amtOrdinaryIncome - threshold) * 0.28;
  // Form 6251 Part III measures the 0%/15% bands from regular ordinary taxable income (lines 20, 27).
  const preferentialTentativeTax = calculateCapitalGainsTax(
    amtPreferentialIncome,
    regularOrdinaryTaxableIncome,
    filingStatus,
    taxData,
  );
  // Line 40: Part III never exceeds the 26%/28% tax on all AMT taxable income.
  const flatTentativeTax = amtBase <= threshold
    ? amtBase * 0.26
    : threshold * 0.26 + (amtBase - threshold) * 0.28;
  const tentativeAMT = Math.min(ordinaryTentativeTax + preferentialTentativeTax, flatTentativeTax);

  // AMT is the excess over regular tax
  return Math.max(0, tentativeAMT - regularTax);
}

export interface ScheduleOneADeductions {
  tips: number;
  overtime: number;
  vehicleLoanInterest: number;
  senior: number;
}

export interface ScheduleOneAInput {
  qualifiedTips?: number;
  qualifiedOvertimeCompensation?: number;
  qualifiedVehicleLoanInterest?: number;
  seniorCount: number;
}

const NO_SCHEDULE_ONE_A: ScheduleOneADeductions = { tips: 0, overtime: 0, vehicleLoanInterest: 0, senior: 0 };

/** OBBB Schedule 1-A deductions (IRC 224, 225, 163(h)(4), 151(d)(5)); MAGI equals AGI here. */
export function calculateScheduleOneADeductions(
  taxData: TaxYearData,
  filingStatus: FilingStatus,
  magi: number,
  input: ScheduleOneAInput,
): ScheduleOneADeductions {
  const rules = taxData.obbbDeductions;
  if (!rules) return { ...NO_SCHEDULE_ONE_A };
  const isJoint = filingStatus === "married_filing_jointly";
  const jointReturnRequired = filingStatus === "married_filing_separately";
  const fullStepReduction = (threshold: number, perStep: number) =>
    Math.floor(Math.max(0, magi - threshold) / 1000) * perStep;

  const tipsThreshold = isJoint ? rules.tipsDeduction.agiLimitMFJ : rules.tipsDeduction.agiLimitSingle;
  const tips = jointReturnRequired ? 0 : Math.max(
    0,
    Math.min(input.qualifiedTips ?? 0, rules.tipsDeduction.max) - fullStepReduction(tipsThreshold, 100),
  );
  const overtimeCap = isJoint ? rules.overtimeDeduction.maxMFJ : rules.overtimeDeduction.maxSingle;
  const overtimeThreshold = isJoint ? rules.overtimeDeduction.agiLimitMFJ : rules.overtimeDeduction.agiLimitSingle;
  const overtime = jointReturnRequired ? 0 : Math.max(
    0,
    Math.min(input.qualifiedOvertimeCompensation ?? 0, overtimeCap) - fullStepReduction(overtimeThreshold, 100),
  );
  // Vehicle loan interest phases out per $1,000 "or portion thereof".
  const vehicleThreshold = isJoint ? rules.autoLoanInterest.agiLimitMFJ : rules.autoLoanInterest.agiLimitSingle;
  const vehicleLoanInterest = Math.max(
    0,
    Math.min(input.qualifiedVehicleLoanInterest ?? 0, rules.autoLoanInterest.max)
      - Math.ceil(Math.max(0, magi - vehicleThreshold) / 1000) * 200,
  );
  const seniorThreshold = isJoint ? rules.seniorBonus.phaseoutMFJ : rules.seniorBonus.phaseoutSingle;
  const seniorPerPerson = Math.max(0, rules.seniorBonus.amount - Math.max(0, magi - seniorThreshold) * 0.06);
  const senior = jointReturnRequired ? 0 : seniorPerPerson * input.seniorCount;
  return { tips, overtime, vehicleLoanInterest, senior };
}

export interface ItemizedDeductionLimits {
  charitableFloorReduction: number;
  itemizedDeductionLimitReduction: number;
  itemizedAllowed: number;
}

/** TY2026+ charitable 0.5% floor (IRC 170(b)(1)(I)) then the IRC 68 2/37 limit; no-ops for earlier years. */
export function applyItemizedDeductionLimits(
  taxData: TaxYearData,
  filingStatus: FilingStatus,
  agi: number,
  itemized: number,
  itemizedCharitable: number,
): ItemizedDeductionLimits {
  const charitableRules = taxData.charitableDeduction;
  const charitableFloorReduction = charitableRules
    ? Math.min(Math.min(itemizedCharitable, itemized), agi * charitableRules.itemizedFloorRate)
    : 0;
  const itemizedAfterFloor = itemized - charitableFloorReduction;
  // Taxable income plus itemized deductions equals AGI before the QBI deduction.
  const topBracketStart = taxData.brackets[filingStatus].at(-1)?.min ?? Infinity;
  const itemizedDeductionLimitReduction = taxData.itemizedDeductionLimitRate
    ? taxData.itemizedDeductionLimitRate
      * Math.min(itemizedAfterFloor, Math.max(0, agi - topBracketStart))
    : 0;
  return {
    charitableFloorReduction,
    itemizedDeductionLimitReduction,
    itemizedAllowed: itemizedAfterFloor - itemizedDeductionLimitReduction,
  };
}

/** TY2026+ IRC 170(p) deduction for qualifying cash gifts by non-itemizers. */
export function calculateNonItemizerCharitableDeduction(
  taxData: TaxYearData,
  filingStatus: FilingStatus,
  cashContributions: number,
): number {
  const limit = taxData.charitableDeduction?.nonItemizerCashLimit[filingStatus] ?? 0;
  return Math.min(Math.max(0, cashContributions), limit);
}

function dependentCareApplicablePercentage(
  agi: number,
  filingStatus: FilingStatus,
  schedule: TaxYearData["dependentCareCredit"],
): number {
  const firstSteps = Math.ceil(Math.max(0, agi - schedule.firstPhasedownStart) / schedule.firstPhasedownStep);
  let points = Math.max(schedule.firstPhasedownFloor, schedule.maxRate - firstSteps);
  const second = schedule.secondPhasedown;
  if (second) {
    const isJoint = filingStatus === "married_filing_jointly";
    const start = isJoint ? second.startJoint : second.start;
    const step = isJoint ? second.stepJoint : second.step;
    const secondSteps = Math.ceil(Math.max(0, agi - start) / step);
    points = Math.max(second.floor, points - secondSteps);
  }
  return points / 100;
}

/** Form 2441 credit before the tax liability limit (IRC 21). */
function calculateDependentCareCredit(
  input: TaxInput,
  agi: number,
  earnedIncome: number,
  taxData: TaxYearData,
  limitations: string[],
): number {
  const expenses = input.dependentCareExpenses ?? 0;
  const qualifyingIndividuals = input.dependentCareQualifyingIndividuals ?? 0;
  if (expenses <= 0 || qualifyingIndividuals <= 0) return 0;
  if (input.filingStatus === "married_filing_separately") {
    limitations.push(
      "The Child and Dependent Care Credit is not calculated for married filing separately; the living-apart exception is not modeled.",
    );
    return 0;
  }
  let earnedIncomeLimit = earnedIncome;
  if (input.filingStatus === "married_filing_jointly") {
    if (input.spouseEarnedIncome === undefined) {
      limitations.push(
        "The Child and Dependent Care Credit requires spouseEarnedIncome for married filing jointly.",
      );
      return 0;
    }
    earnedIncomeLimit = Math.min(input.spouseEarnedIncome, Math.max(0, earnedIncome - input.spouseEarnedIncome));
  }
  const schedule = taxData.dependentCareCredit;
  const expenseCap = qualifyingIndividuals >= 2 ? schedule.expenseLimitTwoOrMore : schedule.expenseLimitOne;
  const qualifiedExpenses = Math.max(0, Math.min(
    expenses,
    expenseCap - (input.dependentCareBenefitsExcluded ?? 0),
    earnedIncomeLimit,
  ));
  return qualifiedExpenses * dependentCareApplicablePercentage(agi, input.filingStatus, schedule);
}

export function calculateTax(input: TaxInput): TaxBreakdown {
  // Input validation
  const errors = validate(
    validateTaxYear(input.taxYear),
    validateIncome(input.grossIncome, "grossIncome"),
  );
  if (errors.length > 0) {
    throw new TaxInputValidationError(errors);
  }

  const taxData = getTaxYearData(input.taxYear);
  if (!taxData) {
    throw new Error(`Tax year ${input.taxYear} is not supported. Supported years: 2024, 2025, 2026`);
  }

  // Step 1: Net capital gains and losses, then calculate AGI.
  const currentLongTermGainOrLoss = input.capitalGainsLongTerm !== false
    ? (input.capitalGains ?? 0)
    : 0;
  const currentShortTermGainOrLoss = input.shortTermCapitalGains
    ?? (input.capitalGainsLongTerm === false ? (input.capitalGains ?? 0) : 0);
  const shortTermLossCarryover = input.shortTermCapitalLossCarryover ?? 0;
  const longTermLossCarryover = input.longTermCapitalLossCarryover ?? 0;
  if (shortTermLossCarryover < 0 || longTermLossCarryover < 0) {
    throw new Error("Capital loss carryovers must be nonnegative loss amounts.");
  }
  const capitalNetting = calculateCapitalNetting(
    currentLongTermGainOrLoss,
    currentShortTermGainOrLoss,
    longTermLossCarryover,
    shortTermLossCarryover,
    input.filingStatus,
  );
  const qualifiedDividends = input.qualifiedDividends ?? 0;
  const socialSecurityBenefits = input.socialSecurityBenefits ?? 0;
  const taxExemptInterest = input.taxExemptInterest ?? 0;
  const retirementDistributions = input.retirementDistributions ?? 0;
  const taxableRetirementDistributions = input.taxableRetirementDistributions;
  if (qualifiedDividends < 0 || socialSecurityBenefits < 0 || taxExemptInterest < 0) {
    throw new Error("Qualified dividends, Social Security benefits, and tax-exempt interest must be nonnegative.");
  }
  if ((input.retirementDistributions === undefined)
    !== (taxableRetirementDistributions === undefined)) {
    throw new Error(
      "retirementDistributions and taxableRetirementDistributions must be provided together from Form 1099-R.",
    );
  }
  if ((taxableRetirementDistributions ?? 0) < 0
    || (taxableRetirementDistributions ?? 0) > retirementDistributions) {
    throw new Error(
      "taxableRetirementDistributions must be between 0 and retirementDistributions.",
    );
  }
  if (socialSecurityBenefits > 0 && input.hasForm2555) {
    throw new Error(
      "Social Security benefit taxation with Form 2555 requires the Publication 915 special worksheet and is not supported.",
    );
  }

  const ordinaryIncomeBeforeSocialSecurity = input.grossIncome
    - currentLongTermGainOrLoss
    - currentShortTermGainOrLoss
    - qualifiedDividends
    - socialSecurityBenefits
    - retirementDistributions
    + (taxableRetirementDistributions ?? 0);
  const aboveTheLine = input.aboveTheLineDeductions ?? 0;
  const w2 = input.w2Income ?? 0;
  const seDeduction = input.selfEmploymentIncome
    ? calculateSelfEmploymentTax(input.selfEmploymentIncome, taxData, w2) * 0.5
    : 0;
  const adjustedGrossIncomeBeforeSocialSecurity = ordinaryIncomeBeforeSocialSecurity
    + capitalNetting.longTermGain
    + capitalNetting.shortTermGain
    + qualifiedDividends
    - capitalNetting.capitalLossDeduction
    - aboveTheLine
    - seDeduction;
  const taxableSocialSecurityBenefits = calculateTaxableSocialSecurityBenefits(
    socialSecurityBenefits,
    adjustedGrossIncomeBeforeSocialSecurity,
    taxExemptInterest,
    input.filingStatus,
    input.marriedFilingSeparatelyLivedWithSpouse,
  );
  const agi = adjustedGrossIncomeBeforeSocialSecurity
    + taxableSocialSecurityBenefits;

  // Step 2: Determine deduction (standard vs itemized)
  let standardDeduction = taxData.standardDeduction[input.filingStatus];

  // Additional deduction for age 65+ or blind
  const additionalAmount = taxData.additionalDeduction.age65OrBlind[input.filingStatus];
  if (input.age65OrOlder) standardDeduction += additionalAmount;
  if (input.blind) standardDeduction += additionalAmount;
  if (input.spouseAge65OrOlder) standardDeduction += additionalAmount;
  if (input.spouseBlind) standardDeduction += additionalAmount;

  const limitations: string[] = [];
  const itemized = input.itemizedDeductions ?? 0;
  const {
    itemizedAllowed,
    itemizedDeductionLimitReduction,
  } = applyItemizedDeductionLimits(
    taxData,
    input.filingStatus,
    agi,
    itemized,
    input.itemizedCharitableContributions ?? 0,
  );
  const potentialNonItemizerCharitable = calculateNonItemizerCharitableDeduction(
    taxData,
    input.filingStatus,
    input.charitableCashContributions ?? 0,
  );
  const useItemized = input.forceItemizedDeductions === true
    || itemizedAllowed > standardDeduction + potentialNonItemizerCharitable;
  const deductionAmount = useItemized ? itemizedAllowed : standardDeduction;
  const nonItemizerCharitableDeduction = useItemized ? 0 : potentialNonItemizerCharitable;
  const seniorCount = (input.age65OrOlder ? 1 : 0)
    + (input.filingStatus === "married_filing_jointly" && input.spouseAge65OrOlder ? 1 : 0);
  const scheduleOneADeductions = calculateScheduleOneADeductions(taxData, input.filingStatus, agi, {
    qualifiedTips: input.qualifiedTips,
    qualifiedOvertimeCompensation: input.qualifiedOvertimeCompensation,
    qualifiedVehicleLoanInterest: input.qualifiedVehicleLoanInterest,
    seniorCount,
  });
  const scheduleOneATotal = scheduleOneADeductions.tips
    + scheduleOneADeductions.overtime
    + scheduleOneADeductions.vehicleLoanInterest
    + scheduleOneADeductions.senior;
  if (input.filingStatus === "married_filing_separately" && taxData.obbbDeductions
    && ((input.qualifiedTips ?? 0) > 0 || (input.qualifiedOvertimeCompensation ?? 0) > 0 || seniorCount > 0)) {
    limitations.push(
      "The tips, overtime, and senior deductions are not allowed for married filing separately.",
    );
  }
  if (itemizedDeductionLimitReduction > 0 && (input.qualifiedBusinessIncome ?? 0) > 0) {
    limitations.push(
      "The IRC 68 itemized deduction limit uses AGI before the QBI deduction, which can slightly overstate the reduction.",
    );
  }

  // Step 3: Calculate taxable income after Schedule D netting.
  const longTermGains = capitalNetting.longTermGain;
  const shortTermGains = capitalNetting.shortTermGain;
  const ordinaryIncome = ordinaryIncomeBeforeSocialSecurity
    + taxableSocialSecurityBenefits
    + shortTermGains
    - capitalNetting.capitalLossDeduction;
  const totalDeductions = aboveTheLine + seDeduction + deductionAmount + nonItemizerCharitableDeduction
    + scheduleOneATotal;
  const taxableOrdinaryIncome = Math.max(0, ordinaryIncome - totalDeductions);
  const unusedDeductions = Math.max(0, totalDeductions - Math.max(0, ordinaryIncome));
  const taxablePreferentialIncome = Math.max(
    0,
    longTermGains + qualifiedDividends - unusedDeductions,
  );

  // Step 4: QBI deduction
  const qbi = input.qualifiedBusinessIncome ?? 0;
  const qbiResult = calculateQBIDeduction(
    qbi,
    taxableOrdinaryIncome + taxablePreferentialIncome,
    taxablePreferentialIncome,
    input.filingStatus,
    taxData,
    input.qualifiedBusinessIsSstb,
    input.qualifiedBusinessW2Wages,
    input.qualifiedBusinessPropertyBasis,
  );
  // IRC 199A(i) (TY2026+): $400 minimum when active QBI is at least $1,000.
  const minimumQbi = taxData.qbiMinimumDeduction;
  const qbiDeduction = minimumQbi && input.qualifiedBusinessMaterialParticipation === true
    && qbi >= minimumQbi.qualifiedBusinessIncomeThreshold
    ? Math.max(qbiResult.deduction, minimumQbi.amount)
    : qbiResult.deduction;

  const adjustedTaxableOrdinary = Math.max(0, taxableOrdinaryIncome - qbiDeduction);

  // Step 5: Calculate ordinary income tax
  const { breakdown, total: ordinaryTax, marginalRate } = calculateBracketTax(
    adjustedTaxableOrdinary,
    taxData.brackets[input.filingStatus]
  );

  // Step 6: Capital gains tax (long-term only)
  const cgTax = taxablePreferentialIncome > 0
    ? calculateCapitalGainsTax(taxablePreferentialIncome, adjustedTaxableOrdinary, input.filingStatus, taxData)
    : 0;

  // Step 7: Self-employment tax
  const seTax = input.selfEmploymentIncome
    ? calculateSelfEmploymentTax(input.selfEmploymentIncome, taxData, w2)
    : 0;

  // Step 8: NIIT (3.8% on the lesser of NII or excess MAGI)
  const netInvestmentIncome = input.netInvestmentIncome
    ?? Math.max(0, longTermGains + shortTermGains + qualifiedDividends);
  const niit = calculateNIIT(agi, netInvestmentIncome, input.filingStatus);

  // Step 9: Additional Medicare Tax (0.9% on earned income above threshold)
  const medicareEarnedIncome = (input.w2Income ?? 0) + (input.selfEmploymentIncome ?? 0);
  const additionalMedicareTax = calculateAdditionalMedicareTax(medicareEarnedIncome, input.filingStatus, taxData);
  const earlyRetirementDistributionSubjectToPenalty =
    input.earlyRetirementDistributionSubjectToPenalty ?? 0;
  if (earlyRetirementDistributionSubjectToPenalty < 0
    || earlyRetirementDistributionSubjectToPenalty
      > (taxableRetirementDistributions ?? 0)) {
    throw new Error(
      "earlyRetirementDistributionSubjectToPenalty must be between 0 and taxableRetirementDistributions after exceptions.",
    );
  }
  const earlyRetirementDistributionAdditionalTax =
    earlyRetirementDistributionSubjectToPenalty * 0.10;

  // Step 10: CTC and ODC after the combined MAGI phase-out.
  // Legacy dependents remain nonrefundable-only unless qualifying children are explicit.
  const explicitActcChildren = input.qualifyingChildrenForCtc ?? 0;
  const qualifyingChildren = input.qualifyingChildrenForCtc ?? input.dependents ?? 0;
  const otherDependents = input.otherDependentsForOdc ?? 0;
  const grossChildCredit = qualifyingChildren * taxData.childTaxCredit.amount;
  const grossOtherDependentCredit = otherDependents * taxData.childTaxCredit.otherDependentAmount;
  const phaseoutStart = taxData.childTaxCredit.phaseoutStart[input.filingStatus];
  const phaseoutReduction = agi > phaseoutStart
    ? Math.ceil((agi - phaseoutStart) / 1000) * taxData.childTaxCredit.phaseoutRate
    : 0;
  const combinedCreditAfterPhaseout = Math.max(
    0,
    grossChildCredit + grossOtherDependentCredit - phaseoutReduction,
  );
  const childCreditAfterPhaseout = Math.min(grossChildCredit, combinedCreditAfterPhaseout);
  const otherDependentCreditAfterPhaseout = Math.min(
    grossOtherDependentCredit,
    Math.max(0, combinedCreditAfterPhaseout - childCreditAfterPhaseout),
  );

  // Step 11: AMT
  const isoSpread = input.isoExerciseSpread ?? 0;
  const saltDeducted = useItemized ? (input.stateTaxDeducted ?? 0) : 0;
  const regularIncomeTax = ordinaryTax + cgTax;
  const taxableIncomeForAMT = adjustedTaxableOrdinary + taxablePreferentialIncome;
  const amt = calculateAMT(
    regularIncomeTax,
    taxableIncomeForAMT,
    taxablePreferentialIncome,
    input.filingStatus,
    taxData,
    isoSpread,
    saltDeducted,
    // Form 6251 line 1a adds back the Schedule 1-A senior deduction.
    (useItemized ? 0 : deductionAmount) + scheduleOneADeductions.senior,
    adjustedTaxableOrdinary,
  );

  const educationCredits = calculateEducationCredits(
    agi,
    input.filingStatus,
    input.aotcStudentQualifiedExpenses,
    input.aotcRefundableAllowed,
    input.lifetimeLearningQualifiedExpenses ?? 0,
    input.hasForm2555 ?? false,
  );

  const actcEarnedIncome = input.earnedIncome
    ?? ((input.w2Income ?? 0) + Math.max(0, (input.selfEmploymentIncome ?? 0) - seDeduction));

  // Schedule 3 order: dependent care (Form 2441), then education credits, then CTC and ODC.
  const incomeTaxBeforeCredits = regularIncomeTax + amt;
  const dependentCareCreditBeforeLimit = calculateDependentCareCredit(
    input,
    agi,
    actcEarnedIncome,
    taxData,
    limitations,
  );
  const dependentCareCredit = Math.min(dependentCareCreditBeforeLimit, incomeTaxBeforeCredits);
  const taxAfterDependentCare = incomeTaxBeforeCredits - dependentCareCredit;
  const nonrefundableAmericanOpportunityCreditApplied = Math.min(
    educationCredits.nonrefundableAmericanOpportunityCredit,
    taxAfterDependentCare,
  );
  const taxAfterAotc = taxAfterDependentCare
    - nonrefundableAmericanOpportunityCreditApplied;
  const lifetimeLearningCreditApplied = Math.min(
    educationCredits.lifetimeLearningCredit,
    taxAfterAotc,
  );
  const taxAfterEducationCredits = taxAfterAotc - lifetimeLearningCreditApplied;
  const childCredit = Math.min(
    childCreditAfterPhaseout,
    taxAfterEducationCredits,
  );
  const taxAfterChildCredit = taxAfterEducationCredits - childCredit;
  const creditForOtherDependents = Math.min(
    otherDependentCreditAfterPhaseout,
    taxAfterChildCredit,
  );
  const incomeTaxAfterCredits = taxAfterChildCredit - creditForOtherDependents;

  // Refundable ACTC uses the Schedule 8812 earned-income method. For 3+ children,
  // the payroll-tax method is used only when the required values are supplied.
  const unusedCombinedDependentCredit = Math.max(
    0,
    childCreditAfterPhaseout
      + otherDependentCreditAfterPhaseout
      - childCredit
      - creditForOtherDependents,
  );
  const earnedIncomeMethod = Math.max(
    0,
    actcEarnedIncome - taxData.childTaxCredit.earnedIncomeThreshold,
  ) * taxData.childTaxCredit.refundableRate;
  let actcMethodAmount = earnedIncomeMethod;
  let actcCalculationMethod: TaxBreakdown["actcCalculationMethod"] = "none";

  if (explicitActcChildren > 0 && unusedCombinedDependentCredit > 0 && !input.hasForm2555) {
    actcCalculationMethod = "earned_income";
    if (explicitActcChildren >= 3) {
      if (input.socialSecurityTaxesPaid !== undefined) {
        const payrollTaxMethod = Math.max(
          0,
          input.socialSecurityTaxesPaid - (input.earnedIncomeCredit ?? 0),
        );
        if (payrollTaxMethod > earnedIncomeMethod) {
          actcMethodAmount = payrollTaxMethod;
          actcCalculationMethod = "three_child_payroll";
        }
      } else {
        actcCalculationMethod = "earned_income_limited";
        limitations.push(
          "ACTC for 3 or more children may be understated without socialSecurityTaxesPaid and earnedIncomeCredit.",
        );
      }
    }
  } else if (input.hasForm2555 && explicitActcChildren > 0) {
    limitations.push("ACTC is unavailable when Form 2555 is filed.");
  } else if (input.dependents !== undefined && input.qualifyingChildrenForCtc === undefined) {
    limitations.push(
      "ACTC was not calculated because qualifyingChildrenForCtc was not provided.",
    );
  }

  const additionalChildTaxCredit = input.hasForm2555
    ? 0
    : Math.round(Math.min(
        unusedCombinedDependentCredit,
        explicitActcChildren * taxData.childTaxCredit.refundableAmount,
        actcMethodAmount,
      ));
  const totalTax = incomeTaxAfterCredits
    + seTax
    + niit
    + additionalMedicareTax
    + earlyRetirementDistributionAdditionalTax
    - additionalChildTaxCredit
    - educationCredits.refundableAmericanOpportunityCredit;
  const taxableIncome = adjustedTaxableOrdinary + taxablePreferentialIncome;

  return {
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
    grossIncome: input.grossIncome,
    adjustedGrossIncome: agi,
    deductionType: useItemized ? "itemized" : "standard",
    deductionAmount,
    nonItemizerCharitableDeduction,
    itemizedDeductionLimitReduction,
    scheduleOneADeductions,
    taxableIncome,
    bracketBreakdown: breakdown,
    ordinaryIncomeTax: ordinaryTax,
    capitalGainsTax: cgTax,
    capitalLossDeduction: capitalNetting.capitalLossDeduction,
    shortTermCapitalLossCarryforward:
      capitalNetting.shortTermCapitalLossCarryforward,
    longTermCapitalLossCarryforward:
      capitalNetting.longTermCapitalLossCarryforward,
    taxableSocialSecurityBenefits,
    taxableRetirementDistributions: taxableRetirementDistributions ?? 0,
    earlyRetirementDistributionAdditionalTax,
    americanOpportunityCredit: educationCredits.americanOpportunityCredit,
    refundableAmericanOpportunityCredit:
      educationCredits.refundableAmericanOpportunityCredit,
    nonrefundableAmericanOpportunityCreditApplied,
    lifetimeLearningCreditApplied,
    selfEmploymentTax: seTax,
    niit,
    additionalMedicareTax,
    qbiDeduction,
    qbiWagePropertyLimit: qbiResult.wagePropertyLimit,
    qbiPhaseInPercentage: qbiResult.phaseInPercentage,
    qbiCalculationMethod: qbiResult.method,
    amt,
    totalFederalTax: totalTax,
    effectiveRate: input.grossIncome > 0 ? totalTax / input.grossIncome : 0,
    marginalRate,
    childTaxCredit: childCredit,
    creditForOtherDependents,
    dependentCareCredit,
    additionalChildTaxCredit,
    actcCalculationMethod,
    limitations,
    estimatedQuarterlyPayment: Math.max(0, Math.ceil(totalTax / 4)),
  };
}
