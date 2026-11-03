import { describe, it, expect } from "vitest";
import { calculateTax, type TaxInput } from "./tax-calculator.js";

const base2024Single: TaxInput = {
  taxYear: 2024,
  filingStatus: "single",
  grossIncome: 100000,
};

describe("calculateTax", () => {
  describe("basic federal tax", () => {
    it("calculates tax for single filer at $100k", () => {
      const result = calculateTax(base2024Single);
      expect(result.taxYear).toBe(2024);
      expect(result.filingStatus).toBe("single");
      expect(result.deductionType).toBe("standard");
      expect(result.deductionAmount).toBe(14600);
      expect(result.taxableIncome).toBe(85400);
      // 10% on 11600 = 1160, 12% on 35550 = 4266, 22% on 38250 = 8415
      expect(result.ordinaryIncomeTax).toBeCloseTo(13841, 0);
      expect(result.effectiveRate).toBeCloseTo(0.13841, 3);
      expect(result.marginalRate).toBe(0.22);
    });

    it("calculates tax for MFJ at $200k", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        grossIncome: 200000,
      });
      expect(result.deductionAmount).toBe(29200);
      expect(result.taxableIncome).toBe(170800);
      expect(result.marginalRate).toBe(0.22);
    });

    it("handles zero income", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 0,
      });
      expect(result.totalFederalTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
    });

    it("handles income below standard deduction", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 10000,
      });
      expect(result.taxableIncome).toBe(0);
      expect(result.totalFederalTax).toBe(0);
    });

    it("throws for unsupported tax year", () => {
      expect(() =>
        calculateTax({ taxYear: 2020, filingStatus: "single", grossIncome: 50000 })
      ).toThrow("not supported");
    });
  });

  describe("TY2025 brackets", () => {
    it("uses 2025 standard deduction", () => {
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 100000,
      });
      expect(result.deductionAmount).toBe(15750);
      expect(result.taxableIncome).toBe(84250);
    });
  });

  describe("TY2026 brackets", () => {
    it("uses TY2026 standard deduction and ordinary brackets", () => {
      const result = calculateTax({
        taxYear: 2026,
        filingStatus: "single",
        grossIncome: 100000,
      });

      expect(result.deductionAmount).toBe(16100);
      expect(result.taxableIncome).toBe(83900);
      expect(result.ordinaryIncomeTax).toBe(13170);
    });

    it("calculates TY2026 MFJ brackets", () => {
      const result = calculateTax({
        taxYear: 2026,
        filingStatus: "married_filing_jointly",
        grossIncome: 150000,
      });

      expect(result.taxableIncome).toBe(117800);
      expect(result.ordinaryIncomeTax).toBe(15340);
    });

    it("applies the TY2026 unmarried age-65 deduction", () => {
      const result = calculateTax({
        taxYear: 2026,
        filingStatus: "single",
        grossIncome: 100000,
        age65OrOlder: true,
      });

      // Senior deduction 6,000 - 25,000 x 6% = 4,500; $100,000 - $18,150 - $4,500.
      expect(result.deductionAmount).toBe(18150);
      expect(result.scheduleOneADeductions.senior).toBe(4500);
      expect(result.taxableIncome).toBe(77350);
    });

    it("stacks TY2026 long-term gains above ordinary income", () => {
      const result = calculateTax({
        taxYear: 2026,
        filingStatus: "single",
        grossIncome: 80000,
        capitalGains: 50000,
      });

      expect(result.taxableIncome).toBe(63900);
      expect(result.ordinaryIncomeTax).toBe(1420);
      expect(result.capitalGainsTax).toBe(2167.5);
    });
  });

  describe("additional deductions for age/blind", () => {
    it("adds extra deduction for age 65+", () => {
      const result = calculateTax({
        ...base2024Single,
        age65OrOlder: true,
      });
      expect(result.deductionAmount).toBe(14600 + 1950);
    });

    it("adds extra deduction for blind", () => {
      const result = calculateTax({
        ...base2024Single,
        blind: true,
      });
      expect(result.deductionAmount).toBe(14600 + 1950);
    });

    it("stacks age + blind deductions", () => {
      const result = calculateTax({
        ...base2024Single,
        age65OrOlder: true,
        blind: true,
      });
      expect(result.deductionAmount).toBe(14600 + 1950 + 1950);
    });
  });

  describe("itemized vs standard deduction", () => {
    it("uses standard when itemized is lower", () => {
      const result = calculateTax({
        ...base2024Single,
        itemizedDeductions: 5000,
      });
      expect(result.deductionType).toBe("standard");
      expect(result.deductionAmount).toBe(14600);
    });

    it("uses itemized when higher than standard", () => {
      const result = calculateTax({
        ...base2024Single,
        itemizedDeductions: 25000,
      });
      expect(result.deductionType).toBe("itemized");
      expect(result.deductionAmount).toBe(25000);
    });
  });

  describe("capital gains", () => {
    it("calculates long-term capital gains tax", () => {
      const result = calculateTax({
        ...base2024Single,
        grossIncome: 150000,
        capitalGains: 50000,
        capitalGainsLongTerm: true,
      });
      expect(result.capitalGainsTax).toBeGreaterThan(0);
    });

    it("zero capital gains tax in 0% bracket", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 40000,
        capitalGains: 5000,
        capitalGainsLongTerm: true,
      });
      // Ordinary income after deduction is ~25400, well within 0% CG bracket (47025)
      expect(result.capitalGainsTax).toBe(0);
    });
  });

  describe("self-employment tax", () => {
    it("calculates SE tax", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 80000,
        selfEmploymentIncome: 80000,
      });
      expect(result.selfEmploymentTax).toBeGreaterThan(0);
      // SE tax = 92.35% * 80000 * (12.4% SS + 2.9% Medicare)
      const netEarnings = 80000 * 0.9235;
      const expectedSE = netEarnings * 0.124 + netEarnings * 0.029;
      expect(result.selfEmploymentTax).toBeCloseTo(expectedSE, 0);
    });

    it("reduces SS wage base by W-2 income", () => {
      // $150k W-2 + $50k SE: remaining SS base = $168,600 - $150,000 = $18,600
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 200000,
        w2Income: 150000,
        selfEmploymentIncome: 50000,
      });
      const netEarnings = 50000 * 0.9235; // $46,175
      const ssTax = 18600 * 0.124; // only remaining wage base
      const medicareTax = netEarnings * 0.029;
      expect(result.selfEmploymentTax).toBeCloseTo(ssTax + medicareTax, 0);
    });

    it("no SS tax when W-2 exceeds wage base", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 250000,
        w2Income: 200000,
        selfEmploymentIncome: 50000,
      });
      // W-2 $200k > $168,600 wage base → SE SS tax = $0, only Medicare
      const netEarnings = 50000 * 0.9235;
      expect(result.selfEmploymentTax).toBeCloseTo(netEarnings * 0.029, 0);
    });
  });

  describe("NIIT (Net Investment Income Tax)", () => {
    it("applies 3.8% NIIT above threshold for single", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 300000,
        capitalGains: 100000,
        capitalGainsLongTerm: true,
      });
      // AGI ~300000, threshold 200000, excess 100000
      // Investment income = 100000, min(100000, 100000) * 3.8%
      expect(result.niit).toBeCloseTo(3800, 0);
    });

    it("no NIIT below threshold", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 150000,
        capitalGains: 50000,
        capitalGainsLongTerm: true,
      });
      expect(result.niit).toBe(0);
    });

    it("NIIT limited to lesser of investment income or excess AGI", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 210000,
        capitalGains: 50000,
        capitalGainsLongTerm: true,
      });
      // AGI ~210000, excess = 10000, investment = 50000
      // NIIT = min(50000, 10000) * 3.8% = 380
      expect(result.niit).toBeCloseTo(380, 0);
    });

    it("includes interest and dividends in net investment income", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 300000,
        netInvestmentIncome: 50000,
      });

      expect(result.niit).toBeCloseTo(1900, 0);
    });

    it("uses an explicit full NII amount instead of double-counting capital gains", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 300000,
        capitalGains: 30000,
        capitalGainsLongTerm: true,
        netInvestmentIncome: 50000,
      });

      expect(result.niit).toBeCloseTo(1900, 0);
    });
  });

  describe("Additional Medicare Tax", () => {
    it("uses SE net earnings (92.35%) on Form 8959 line 8", () => {
      // Line 11: 200,000 - 190,000 = 10,000; line 12: 27,705 - 10,000 = 17,705; x 0.9% = 159.35.
      const result = calculateTax({
        taxYear: 2026, filingStatus: "single", grossIncome: 220000, w2Income: 190000, selfEmploymentIncome: 30000,
      });
      expect(result.additionalMedicareTax).toBeCloseTo(159.35, 2);
    });
    it("applies 0.9% above threshold for single W-2 earner", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 250000,
        w2Income: 250000,
      });
      // Threshold 200000, excess 50000 * 0.9%
      expect(result.additionalMedicareTax).toBeCloseTo(450, 0);
    });

    it("no additional Medicare tax below threshold", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 150000,
        w2Income: 150000,
      });
      expect(result.additionalMedicareTax).toBe(0);
    });
  });

  describe("QBI deduction", () => {
    it("applies 20% QBI deduction", () => {
      const result = calculateTax({
        ...base2024Single,
        qualifiedBusinessIncome: 50000,
      });
      expect(result.qbiDeduction).toBeCloseTo(10000, 0);
    });

    it("no QBI deduction when zero", () => {
      const result = calculateTax(base2024Single);
      expect(result.qbiDeduction).toBe(0);
    });
    it("requires business classification above the QBI threshold", () => {
      expect(() => calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 300000,
        qualifiedBusinessIncome: 100000,
      })).toThrow("qualifiedBusinessIsSstb");
    });

    it("applies the full W-2 wage limit above the phase-in range", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 300000,
        qualifiedBusinessIncome: 100000,
        qualifiedBusinessIsSstb: false,
        qualifiedBusinessW2Wages: 20000,
        qualifiedBusinessPropertyBasis: 0,
      });

      expect(result.qbiDeduction).toBe(10000);
      expect(result.qbiWagePropertyLimit).toBe(10000);
      expect(result.qbiCalculationMethod).toBe("wage_property_limited");
    });

    it("uses the 2.5 percent UBIA alternative limit", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 300000,
        qualifiedBusinessIncome: 100000,
        qualifiedBusinessIsSstb: false,
        qualifiedBusinessW2Wages: 0,
        qualifiedBusinessPropertyBasis: 400000,
      });

      expect(result.qbiDeduction).toBe(10000);
      expect(result.qbiWagePropertyLimit).toBe(10000);
    });

    it("phases in the wage and property limit above the threshold", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 220000,
        qualifiedBusinessIncome: 100000,
        qualifiedBusinessIsSstb: false,
        qualifiedBusinessW2Wages: 20000,
        qualifiedBusinessPropertyBasis: 0,
      });

      expect(result.qbiPhaseInPercentage).toBeCloseTo(0.269, 3);
      expect(result.qbiDeduction).toBeCloseTo(17310, 0);
      expect(result.qbiCalculationMethod).toBe("phase_in");
    });

    it("applies the overall taxable-income limit after wage phase-in", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 220000,
        capitalGains: 100000,
        qualifiedBusinessIncome: 120000,
        qualifiedBusinessIsSstb: false,
        qualifiedBusinessW2Wages: 0,
        qualifiedBusinessPropertyBasis: 0,
      });

      expect(result.qbiDeduction).toBeCloseTo(17544, 0);
    });

    it("phases out an SSTB within the annual range", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 220000,
        qualifiedBusinessIncome: 100000,
        qualifiedBusinessIsSstb: true,
        qualifiedBusinessW2Wages: 20000,
        qualifiedBusinessPropertyBasis: 0,
      });

      expect(result.qbiDeduction).toBeCloseTo(12654, 0);
      expect(result.qbiCalculationMethod).toBe("sstb_phase_out");
    });

    it("disallows an SSTB above the phase-out range", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 300000,
        qualifiedBusinessIncome: 100000,
        qualifiedBusinessIsSstb: true,
        qualifiedBusinessW2Wages: 50000,
        qualifiedBusinessPropertyBasis: 500000,
      });

      expect(result.qbiDeduction).toBe(0);
      expect(result.qbiCalculationMethod).toBe("sstb_disallowed");
    });
  });

  describe("Child Tax Credit", () => {
    it("gives $2000 per child", () => {
      const result = calculateTax({
        ...base2024Single,
        dependents: 2,
      });
      expect(result.childTaxCredit).toBe(4000);
    });

    it("phases out at high income for single", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 250000,
        dependents: 1,
      });
      // Phaseout starts at 200000, excess = 50000
      // Reduction = ceil(50000/1000) * 50 = 2500
      // Credit = max(0, 2000 - 2500) = 0
      expect(result.childTaxCredit).toBe(0);
    });

    it("higher phaseout for MFJ", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        grossIncome: 350000,
        dependents: 2,
      });
      // Phaseout starts at 400000, income below threshold
      expect(result.childTaxCredit).toBe(4000);
    });

    it("calculates refundable ACTC from unused CTC and earned income", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 20000,
        w2Income: 20000,
        qualifyingChildrenForCtc: 1,
        earnedIncome: 20000,
      });

      expect(result.childTaxCredit).toBe(540);
      expect(result.additionalChildTaxCredit).toBe(1460);
      expect(result.creditForOtherDependents).toBe(0);
      expect(result.totalFederalTax).toBe(-1460);
    });

    it("keeps the credit for other dependents nonrefundable", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 10000,
        w2Income: 10000,
        otherDependentsForOdc: 1,
        earnedIncome: 10000,
      });

      expect(result.childTaxCredit).toBe(0);
      expect(result.creditForOtherDependents).toBe(0);
      expect(result.additionalChildTaxCredit).toBe(0);
      expect(result.totalFederalTax).toBe(0);
    });

    it("uses combined unused CTC and ODC liability for the ACTC cap", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 34867,
        w2Income: 34867,
        qualifyingChildrenForCtc: 1,
        otherDependentsForOdc: 1,
        earnedIncome: 34867,
      });

      expect(result.childTaxCredit).toBe(2000);
      expect(result.creditForOtherDependents).toBeCloseTo(200, 0);
      expect(result.additionalChildTaxCredit).toBe(300);
    });

    it("uses the three-child payroll-tax method when it is larger", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 30000,
        w2Income: 30000,
        qualifyingChildrenForCtc: 3,
        earnedIncome: 10000,
        socialSecurityTaxesPaid: 5000,
        earnedIncomeCredit: 1000,
      });

      expect(result.additionalChildTaxCredit).toBe(4000);
      expect(result.actcCalculationMethod).toBe("three_child_payroll");
    });

    it("does not calculate ACTC for Form 2555 filers", () => {
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 20000,
        w2Income: 20000,
        qualifyingChildrenForCtc: 1,
        earnedIncome: 20000,
        hasForm2555: true,
      });

      expect(result.additionalChildTaxCredit).toBe(0);
      expect(result.limitations).toContain("ACTC is unavailable when Form 2555 is filed.");
    });
  });

  describe("capital loss limitation and carryover", () => {
    it("limits a net capital loss to $3,000 for a single filer", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 90000,
        w2Income: 100000,
        capitalGains: -10000,
      });

      expect(result.capitalLossDeduction).toBe(3000);
      expect(result.adjustedGrossIncome).toBe(97000);
      expect(result.shortTermCapitalLossCarryforward).toBe(0);
      expect(result.longTermCapitalLossCarryforward).toBe(7000);
    });

    it("uses the $1,500 MFS capital-loss limit", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "married_filing_separately",
        grossIncome: 90000,
        w2Income: 100000,
        capitalGains: -10000,
      });

      expect(result.capitalLossDeduction).toBe(1500);
      expect(result.adjustedGrossIncome).toBe(98500);
      expect(result.longTermCapitalLossCarryforward).toBe(8500);
    });

    it("nets prior short and long carryovers before applying the annual limit", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 90000,
        w2Income: 100000,
        capitalGains: -6000,
        shortTermCapitalGains: -4000,
        shortTermCapitalLossCarryover: 2000,
        longTermCapitalLossCarryover: 3000,
      });

      expect(result.capitalLossDeduction).toBe(3000);
      expect(result.shortTermCapitalLossCarryforward).toBe(3000);
      expect(result.longTermCapitalLossCarryforward).toBe(9000);
    });

    it("nets a short-term loss against a long-term gain before preferential tax", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 106000,
        w2Income: 100000,
        capitalGains: 10000,
        shortTermCapitalGains: -4000,
      });

      expect(result.capitalLossDeduction).toBe(0);
      expect(result.capitalGainsTax).toBe(900);
      expect(result.shortTermCapitalLossCarryforward).toBe(0);
      expect(result.longTermCapitalLossCarryforward).toBe(0);
    });
    it("does not net capital losses against qualified dividends", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 110000,
        w2Income: 100000,
        capitalGains: -10000,
        qualifiedDividends: 20000,
      });

      expect(result.capitalLossDeduction).toBe(3000);
      expect(result.longTermCapitalLossCarryforward).toBe(7000);
      expect(result.capitalGainsTax).toBe(3000);
    });
  });

  describe("Social Security and retirement income", () => {
    it("matches Publication 915 single-filer taxable-benefit example", () => {
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 34970,
        socialSecurityBenefits: 5980,
      });

      expect(result.taxableSocialSecurityBenefits).toBe(2990);
      expect(result.adjustedGrossIncome).toBe(31980);
    });

    it("matches Publication 915 MFJ taxable-benefit example", () => {
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "married_filing_jointly",
        grossIncome: 50500,
        socialSecurityBenefits: 10000,
      });

      expect(result.taxableSocialSecurityBenefits).toBe(6275);
      expect(result.adjustedGrossIncome).toBe(46775);
    });

    it("uses the MFS lived-with-spouse worksheet rule", () => {
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "married_filing_separately",
        grossIncome: 12000,
        socialSecurityBenefits: 4000,
        marriedFilingSeparatelyLivedWithSpouse: true,
      });

      expect(result.taxableSocialSecurityBenefits).toBe(3400);
    });

    it("requires the MFS living-arrangement fact", () => {
      expect(() => calculateTax({
        taxYear: 2025,
        filingStatus: "married_filing_separately",
        grossIncome: 12000,
        socialSecurityBenefits: 4000,
      })).toThrow("marriedFilingSeparatelyLivedWithSpouse");
    });

    it("replaces gross retirement distributions with the taxable amount", () => {
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 80000,
        w2Income: 50000,
        retirementDistributions: 30000,
        taxableRetirementDistributions: 20000,
      });

      expect(result.taxableRetirementDistributions).toBe(20000);
      expect(result.adjustedGrossIncome).toBe(70000);
    });

    it("requires the taxable 1099-R amount", () => {
      expect(() => calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 80000,
        retirementDistributions: 30000,
      })).toThrow("taxableRetirementDistributions");
    });

    it("adds 10 percent tax for the supplied early-distribution amount", () => {
      const withoutPenalty = calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 80000,
        retirementDistributions: 30000,
        taxableRetirementDistributions: 20000,
      });
      const withPenalty = calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 80000,
        retirementDistributions: 30000,
        taxableRetirementDistributions: 20000,
        earlyRetirementDistributionSubjectToPenalty: 10000,
      });

      expect(withPenalty.earlyRetirementDistributionAdditionalTax).toBe(1000);
      expect(withPenalty.totalFederalTax - withoutPenalty.totalFederalTax).toBe(1000);
    });
  });

  describe("education credits", () => {
    it("splits the maximum AOTC into refundable and nonrefundable portions", () => {
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 40000,
        aotcStudentQualifiedExpenses: [4000],
        aotcRefundableAllowed: true,
      });

      expect(result.americanOpportunityCredit).toBe(2500);
      expect(result.refundableAmericanOpportunityCredit).toBe(1000);
      expect(result.nonrefundableAmericanOpportunityCreditApplied).toBe(1500);
    });

    it("phases out education credits using MAGI", () => {
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 85000,
        aotcStudentQualifiedExpenses: [4000],
        aotcRefundableAllowed: true,
      });

      expect(result.americanOpportunityCredit).toBe(1250);
      expect(result.refundableAmericanOpportunityCredit).toBe(500);
    });

    it("calculates the nonrefundable Lifetime Learning Credit", () => {
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 60000,
        lifetimeLearningQualifiedExpenses: 10000,
      });

      expect(result.lifetimeLearningCreditApplied).toBe(2000);
    });

    it("applies education credits before CTC and ACTC limitation", () => {
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "head_of_household",
        grossIncome: 24125,
        w2Income: 24125,
        qualifyingChildrenForCtc: 1,
        earnedIncome: 24125,
        aotcStudentQualifiedExpenses: [500],
        aotcRefundableAllowed: true,
      });

      expect(result.nonrefundableAmericanOpportunityCreditApplied).toBe(50);
      expect(result.refundableAmericanOpportunityCredit).toBe(200);
      expect(result.childTaxCredit).toBe(0);
      expect(result.additionalChildTaxCredit).toBe(1700);
      expect(result.totalFederalTax).toBe(-1900);
    });

    it("requires explicit AOTC refundable eligibility", () => {
      expect(() => calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 40000,
        aotcStudentQualifiedExpenses: [4000],
      })).toThrow("aotcRefundableAllowed");
    });

    it("rejects education credits for MFS", () => {
      expect(() => calculateTax({
        taxYear: 2025,
        filingStatus: "married_filing_separately",
        grossIncome: 40000,
        lifetimeLearningQualifiedExpenses: 5000,
      })).toThrow("Married filing separately");
    });
  });

  describe("estimated quarterly payment", () => {
    it("divides total tax by 4", () => {
      const result = calculateTax(base2024Single);
      expect(result.estimatedQuarterlyPayment).toBe(Math.ceil(result.totalFederalTax / 4));
    });
  });

  describe("AMT (Alternative Minimum Tax)", () => {
    it("phases out the TY2026 exemption at 50 cents per dollar under OBBB", () => {
      // AMTI = taxable $283,900 + standard deduction $16,100 + ISO $400,000 = $700,000; exemption fully phased out.
      // Tentative AMT = 244,500 * 26% + 455,500 * 28% = 191,110; regular tax = 68,134.25.
      const result = calculateTax({
        taxYear: 2026,
        filingStatus: "single",
        grossIncome: 300000,
        w2Income: 300000,
        isoExerciseSpread: 400000,
      });
      expect(result.amt).toBeCloseTo(122975.75, 2);
    });

    it("keeps the 25 cent TY2025 exemption phase-out", () => {
      // AMTI $700,000 (includes the $15,750 standard deduction add-back); exemption 88,100 - 73,650 * 25% = 69,687.50.
      // Tentative AMT = 239,100 * 26% + 391,212.50 * 28% = 171,705.50; regular tax = 69,034.75.
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 300000,
        w2Income: 300000,
        isoExerciseSpread: 400000,
      });
      expect(result.amt).toBeCloseTo(102670.75, 2);
    });

    it("measures AMT capital-gain bands from regular ordinary taxable income (Form 6251 Part III)", () => {
      // TY2026: regular ordinary $83,900; 15% band 545,500 - 83,900 = 461,600; 438,400 at 20%.
      // Tentative AMT 26,000 + 69,240 + 87,680 = 182,920; regular tax 13,170 + 156,920 = 170,090.
      const result = calculateTax({
        taxYear: 2026,
        filingStatus: "single",
        grossIncome: 1000000,
        w2Income: 100000,
        capitalGains: 900000,
      });
      expect(result.amt).toBeCloseTo(12830, 2);
    });

    it("adds the standard deduction back to AMTI (Form 6251 line 2a)", () => {
      // AMTI = taxable $185,400 + standard $14,600 + ISO $100,000 = $300,000; exemption $85,700.
      // Tentative AMT = 214,300 * 26% = 55,718; regular tax on $185,400 = 37,538.50.
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 200000,
        isoExerciseSpread: 100000,
      });
      expect(result.amt).toBeCloseTo(18179.5, 2);
    });

    it("no AMT for typical W-2 earner", () => {
      const result = calculateTax(base2024Single);
      expect(result.amt).toBe(0);
    });

    it("triggers AMT with large ISO exercise spread", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 200000,
        isoExerciseSpread: 300000,
      });
      expect(result.amt).toBeGreaterThan(0);
    });

    it("no AMT when ISO spread is small", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 100000,
        isoExerciseSpread: 5000,
      });
      expect(result.amt).toBe(0);
    });

    it("uses preferential rates for capital gains under AMT", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 1000000,
        w2Income: 100000,
        capitalGains: 900000,
      });

      // AMTI $1,000,000 adds back the $14,600 standard deduction (Form 6251 line 2a); exemption fully phased out.
      // Part III bands use regular ordinary taxable income $85,400 (lines 20, 27): 433,500 at 15% + 466,500 at 20%.
      // Tentative AMT 26,000 + 158,325 = 184,325; regular tax 13,841 + 158,325 = 172,166.
      expect(result.capitalGainsTax).toBe(158325);
      expect(result.amt).toBeCloseTo(12159, 2);
    });

    it("treats qualified dividends and long-term gains equally under AMT", () => {
      const common: TaxInput = {
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 1000000,
        w2Income: 100000,
      };
      const dividendResult = calculateTax({
        ...common,
        qualifiedDividends: 900000,
      });
      const capitalGainResult = calculateTax({
        ...common,
        capitalGains: 900000,
      });

      expect(dividendResult.amt).toBeCloseTo(12159, 2);
      expect(dividendResult.amt).toBe(capitalGainResult.amt);
      expect(dividendResult.totalFederalTax)
        .toBe(capitalGainResult.totalFederalTax);
    });

    it("caps preferential income at AMT taxable income after exemption", () => {
      const result = calculateTax({
        taxYear: 2025,
        filingStatus: "single",
        grossIncome: 320000,
        capitalGains: 247000,
        itemizedDeductions: 72000,
        age65OrOlder: true,
      });

      expect(result.taxableIncome).toBe(248000);
      expect(result.capitalGainsTax).toBe(29947.5);
      expect(result.amt).toBe(0);
    });

    it("AMT considers SALT add-back for itemizers", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "married_filing_jointly",
        grossIncome: 500000,
        itemizedDeductions: 50000,
        stateTaxDeducted: 10000,
        isoExerciseSpread: 200000,
      });
      expect(result.amt).toBeGreaterThanOrEqual(0);
    });
  });

  describe("high income scenario", () => {
    it("handles $500k single with all components", () => {
      const result = calculateTax({
        taxYear: 2024,
        filingStatus: "single",
        grossIncome: 500000,
        w2Income: 300000,
        capitalGains: 100000,
        capitalGainsLongTerm: true,
        selfEmploymentIncome: 100000,
        dependents: 1,
        qualifiedBusinessIncome: 100000,
        qualifiedBusinessIsSstb: false,
        qualifiedBusinessW2Wages: 50000,
        qualifiedBusinessPropertyBasis: 0,
      });
      expect(result.totalFederalTax).toBeGreaterThan(0);
      expect(result.niit).toBeGreaterThan(0);
      expect(result.additionalMedicareTax).toBeGreaterThan(0);
      expect(result.selfEmploymentTax).toBeGreaterThan(0);
      expect(result.capitalGainsTax).toBeGreaterThan(0);
      expect(result.qbiDeduction).toBeGreaterThan(0);
      expect(result.amt).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * IRS Tax Table verification — hand-calculated from published bracket data.
 * These tests verify exact dollar amounts, not just "greater than zero".
 */
describe("IRS Tax Table verification", () => {
  it("TY2024 single $50k → tax $4,016", () => {
    // Taxable: $50,000 - $14,600 = $35,400
    // 10% × $11,600 = $1,160 + 12% × $23,800 = $2,856
    const r = calculateTax({ taxYear: 2024, filingStatus: "single", grossIncome: 50000 });
    expect(r.taxableIncome).toBe(35400);
    expect(r.ordinaryIncomeTax).toBeCloseTo(4016, 0);
  });

  it("TY2024 MFJ $150k → tax $16,682", () => {
    // Taxable: $150,000 - $29,200 = $120,800
    // 10% × $23,200 + 12% × $71,100 + 22% × $26,500
    const r = calculateTax({ taxYear: 2024, filingStatus: "married_filing_jointly", grossIncome: 150000 });
    expect(r.taxableIncome).toBe(120800);
    expect(r.ordinaryIncomeTax).toBeCloseTo(16682, 0);
  });

  it("TY2024 single $500k → tax $140,264.75", () => {
    // Taxable: $485,400 — hits 35% bracket
    const r = calculateTax({ taxYear: 2024, filingStatus: "single", grossIncome: 500000 });
    expect(r.taxableIncome).toBe(485400);
    expect(r.ordinaryIncomeTax).toBeCloseTo(140264.75, 0);
  });

  it("TY2025 single $100k → tax $13,449", () => {
    // Taxable: $100,000 - $15,750 = $84,250
    // 10% × $11,925 + 12% × $36,550 + 22% × $35,775
    const r = calculateTax({ taxYear: 2025, filingStatus: "single", grossIncome: 100000 });
    expect(r.taxableIncome).toBe(84250);
    expect(r.ordinaryIncomeTax).toBeCloseTo(13449, 0);
  });
});


describe("P0 federal accuracy regressions", () => {
  it("applies unused standard deduction to long-term capital gains", () => {
    const result = calculateTax({
      taxYear: 2024,
      filingStatus: "single",
      grossIncome: 100000,
      capitalGains: 100000,
      capitalGainsLongTerm: true,
    });

    expect(result.taxableIncome).toBe(85400);
    expect(result.capitalGainsTax).toBeCloseTo(5756.25, 2);
  });

  it("excludes net capital gain from the QBI taxable-income limit", () => {
    const result = calculateTax({
      taxYear: 2024,
      filingStatus: "single",
      grossIncome: 135000,
      capitalGains: 100000,
      capitalGainsLongTerm: true,
      qualifiedBusinessIncome: 50000,
    });

    expect(result.qbiDeduction).toBe(4080);
    expect(result.taxableIncome).toBe(116320);
  });

  it("does not allow the Child Tax Credit to offset self-employment tax", () => {
    const result = calculateTax({
      taxYear: 2024,
      filingStatus: "single",
      grossIncome: 15000,
      selfEmploymentIncome: 15000,
      dependents: 1,
    });

    expect(result.ordinaryIncomeTax).toBe(0);
    expect(result.totalFederalTax).toBeCloseTo(result.selfEmploymentTax, 2);
  });
});

describe("TY2026 OBBB charitable and itemized deduction rules", () => {
  it("allows the non-itemizer cash charitable deduction up to $1,000 single", () => {
    // Taxable $80,000 - $16,100 - $1,000 = $62,900; tax 1,240 + 4,560 + 2,750.
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "single",
      grossIncome: 80000,
      charitableCashContributions: 1500,
    });
    expect(result.nonItemizerCharitableDeduction).toBe(1000);
    expect(result.adjustedGrossIncome).toBe(80000);
    expect(result.taxableIncome).toBe(62900);
    expect(result.ordinaryIncomeTax).toBeCloseTo(8550, 2);
  });

  it("caps the non-itemizer charitable deduction at $2,000 for MFJ", () => {
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      grossIncome: 120000,
      charitableCashContributions: 5000,
    });
    expect(result.nonItemizerCharitableDeduction).toBe(2000);
    expect(result.taxableIncome).toBe(120000 - 32200 - 2000);
  });

  it("does not allow the non-itemizer charitable deduction before TY2026", () => {
    const result = calculateTax({
      taxYear: 2025,
      filingStatus: "single",
      grossIncome: 80000,
      charitableCashContributions: 1500,
    });
    expect(result.nonItemizerCharitableDeduction).toBe(0);
    expect(result.taxableIncome).toBe(64250);
  });

  it("applies the 0.5% of AGI floor to itemized charitable contributions", () => {
    // Floor 0.5% x $200,000 = $1,000; itemized $30,000 becomes $29,000.
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "single",
      grossIncome: 200000,
      itemizedDeductions: 30000,
      itemizedCharitableContributions: 5000,
    });
    expect(result.deductionType).toBe("itemized");
    expect(result.deductionAmount).toBe(29000);
    expect(result.taxableIncome).toBe(171000);
  });

  it("limits the charitable floor to the charitable amount itemized", () => {
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "single",
      grossIncome: 200000,
      itemizedDeductions: 30000,
      itemizedCharitableContributions: 400,
    });
    expect(result.deductionAmount).toBe(29600);
  });

  it("reduces itemized deductions by 2/37 of the full deduction above the 37% bracket", () => {
    // Income above $768,700 is $231,300, more than itemized $60,000; reduction 60,000 x 2/37.
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      grossIncome: 1000000,
      itemizedDeductions: 60000,
    });
    expect(result.itemizedDeductionLimitReduction).toBeCloseTo(3243.24, 2);
    expect(result.deductionAmount).toBeCloseTo(56756.76, 2);
  });

  it("reduces itemized deductions by 2/37 of the excess when it is smaller", () => {
    // Taxable income plus itemized $800,000 exceeds $768,700 by $31,300; reduction 31,300 x 2/37.
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      grossIncome: 800000,
      itemizedDeductions: 60000,
    });
    expect(result.itemizedDeductionLimitReduction).toBeCloseTo(1691.89, 2);
    expect(result.deductionAmount).toBeCloseTo(58308.11, 2);
  });

  it("does not apply the 2/37 limit before TY2026", () => {
    const result = calculateTax({
      taxYear: 2025,
      filingStatus: "married_filing_jointly",
      grossIncome: 1000000,
      itemizedDeductions: 60000,
    });
    expect(result.itemizedDeductionLimitReduction).toBe(0);
    expect(result.deductionAmount).toBe(60000);
  });
});

describe("Child and Dependent Care Credit", () => {
  it("uses the TY2026 50% schedule reduced to 37% at $40,000 AGI", () => {
    // 50% minus ceil(25,000 / 2,000) = 13 points; 37% of the $3,000 one-child limit.
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "head_of_household",
      grossIncome: 40000,
      w2Income: 40000,
      dependentCareExpenses: 4000,
      dependentCareQualifyingIndividuals: 1,
    });
    expect(result.dependentCareCredit).toBeCloseTo(1110, 2);
  });

  it("applies the TY2026 second phase-down above $150,000 MFJ", () => {
    // First phase-down floors at 35%; ceil(50,000 / 4,000) = 13 more points gives 22% of $6,000.
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      grossIncome: 200000,
      w2Income: 200000,
      spouseEarnedIncome: 80000,
      dependentCareExpenses: 10000,
      dependentCareQualifyingIndividuals: 2,
    });
    expect(result.dependentCareCredit).toBeCloseTo(1320, 2);
  });

  it("keeps the 20% floor for TY2025 at the same income", () => {
    const result = calculateTax({
      taxYear: 2025,
      filingStatus: "married_filing_jointly",
      grossIncome: 200000,
      w2Income: 200000,
      spouseEarnedIncome: 80000,
      dependentCareExpenses: 10000,
      dependentCareQualifyingIndividuals: 2,
    });
    expect(result.dependentCareCredit).toBeCloseTo(1200, 2);
  });

  it("reduces the expense limit by excluded employer dependent care benefits", () => {
    // ($6,000 - $5,000) x 22%.
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      grossIncome: 200000,
      w2Income: 200000,
      spouseEarnedIncome: 80000,
      dependentCareExpenses: 10000,
      dependentCareQualifyingIndividuals: 2,
      dependentCareBenefitsExcluded: 5000,
    });
    expect(result.dependentCareCredit).toBeCloseTo(220, 2);
  });

  it("limits expenses to the lower-earning spouse's earned income", () => {
    // Expenses capped at spouse earned income $2,000; 22% of $2,000.
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      grossIncome: 200000,
      w2Income: 200000,
      spouseEarnedIncome: 2000,
      dependentCareExpenses: 10000,
      dependentCareQualifyingIndividuals: 2,
    });
    expect(result.dependentCareCredit).toBeCloseTo(440, 2);
  });

  it("does not calculate the MFJ credit without the spouse's earned income", () => {
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      grossIncome: 200000,
      w2Income: 200000,
      dependentCareExpenses: 10000,
      dependentCareQualifyingIndividuals: 2,
    });
    expect(result.dependentCareCredit).toBe(0);
    expect(result.limitations.join(" ")).toContain("spouseEarnedIncome");
  });

  it("does not allow the credit for married filing separately", () => {
    const result = calculateTax({
      taxYear: 2026,
      filingStatus: "married_filing_separately",
      grossIncome: 60000,
      w2Income: 60000,
      dependentCareExpenses: 3000,
      dependentCareQualifyingIndividuals: 1,
    });
    expect(result.dependentCareCredit).toBe(0);
    expect(result.limitations.join(" ")).toContain("married filing separately");
  });
});

describe("OBBB Schedule 1-A deductions in the federal calculation", () => {
  it("applies the TY2026 $400 minimum QBI deduction for active businesses", () => {
    // 20% x $1,500 = $300, raised to $400 under IRC 199A(i).
    const result = calculateTax({
      taxYear: 2026, filingStatus: "single", grossIncome: 61500, w2Income: 60000,
      qualifiedBusinessIncome: 1500, qualifiedBusinessMaterialParticipation: true,
    });
    expect(result.qbiDeduction).toBe(400);
  });

  it("does not apply the minimum QBI deduction without material participation or before TY2026", () => {
    const passive = calculateTax({
      taxYear: 2026, filingStatus: "single", grossIncome: 61500, w2Income: 60000, qualifiedBusinessIncome: 1500,
    });
    const priorYear = calculateTax({
      taxYear: 2025, filingStatus: "single", grossIncome: 61500, w2Income: 60000,
      qualifiedBusinessIncome: 1500, qualifiedBusinessMaterialParticipation: true,
    });
    expect(passive.qbiDeduction).toBe(300);
    expect(priorYear.qbiDeduction).toBe(300);
  });

  it("allows the full $6,000 senior deduction below the phase-out", () => {
    // $60,000 - ($16,100 + $2,050) - $6,000 = $35,850.
    const result = calculateTax({
      taxYear: 2026, filingStatus: "single", grossIncome: 60000, w2Income: 60000, age65OrOlder: true,
    });
    expect(result.scheduleOneADeductions.senior).toBe(6000);
    expect(result.taxableIncome).toBe(35850);
  });

  it("phases out the senior deduction by 6% of MAGI over $75,000", () => {
    // 6,000 - 15,000 x 6% = 5,100; $90,000 - $18,150 - $5,100 = $66,750.
    const result = calculateTax({
      taxYear: 2026, filingStatus: "single", grossIncome: 90000, w2Income: 90000, age65OrOlder: true,
    });
    expect(result.scheduleOneADeductions.senior).toBe(5100);
    expect(result.taxableIncome).toBe(66750);
  });

  it("applies the senior phase-out per spouse for MFJ", () => {
    // 2 x (6,000 - 50,000 x 6%) = 6,000; $200,000 - $35,500 - $6,000 = $158,500.
    const result = calculateTax({
      taxYear: 2026, filingStatus: "married_filing_jointly", grossIncome: 200000, w2Income: 200000,
      age65OrOlder: true, spouseAge65OrOlder: true,
    });
    expect(result.scheduleOneADeductions.senior).toBe(6000);
    expect(result.taxableIncome).toBe(158500);
  });

  it("reduces the tips deduction by $100 per full $1,000 over $150,000", () => {
    // Excess $10,500 is 10 full steps: 20,000 - 1,000 = 19,000.
    const result = calculateTax({
      taxYear: 2026, filingStatus: "single", grossIncome: 160500, w2Income: 160500, qualifiedTips: 20000,
    });
    expect(result.scheduleOneADeductions.tips).toBe(19000);
    expect(result.taxableIncome).toBe(160500 - 16100 - 19000);
  });

  it("caps MFJ overtime at $25,000 before the phase-out", () => {
    const result = calculateTax({
      taxYear: 2026, filingStatus: "married_filing_jointly", grossIncome: 310000, w2Income: 310000,
      qualifiedOvertimeCompensation: 30000,
    });
    expect(result.scheduleOneADeductions.overtime).toBe(24000);
  });

  it("reduces vehicle loan interest by $200 per $1,000 or portion over $100,000", () => {
    const result = calculateTax({
      taxYear: 2026, filingStatus: "single", grossIncome: 100500, w2Income: 100500,
      qualifiedVehicleLoanInterest: 3000,
    });
    expect(result.scheduleOneADeductions.vehicleLoanInterest).toBe(2800);
  });

  it("disallows tips, overtime, and senior deductions for married filing separately", () => {
    const result = calculateTax({
      taxYear: 2026, filingStatus: "married_filing_separately", grossIncome: 80000, w2Income: 80000,
      age65OrOlder: true, qualifiedTips: 5000, qualifiedOvertimeCompensation: 5000,
      qualifiedVehicleLoanInterest: 1000,
    });
    expect(result.scheduleOneADeductions).toEqual({ tips: 0, overtime: 0, vehicleLoanInterest: 1000, senior: 0 });
    expect(result.limitations.join(" ")).toContain("married filing separately");
  });

  it("does not allow Schedule 1-A deductions before TY2025", () => {
    const result = calculateTax({
      taxYear: 2024, filingStatus: "single", grossIncome: 60000, w2Income: 60000, age65OrOlder: true,
      qualifiedTips: 5000,
    });
    expect(result.scheduleOneADeductions).toEqual({ tips: 0, overtime: 0, vehicleLoanInterest: 0, senior: 0 });
  });

  it("adds the senior deduction back to AMTI", () => {
    // AMTI = 35,850 + 18,150 + 6,000 + 300,000 = 360,000; tentative 63,570 + 25,400 x 28% = 70,682.
    // Regular tax on $35,850 = 4,054.
    const result = calculateTax({
      taxYear: 2026, filingStatus: "single", grossIncome: 60000, w2Income: 60000, age65OrOlder: true,
      isoExerciseSpread: 300000,
    });
    expect(result.amt).toBeCloseTo(66628, 2);
  });
});
