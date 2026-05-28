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
  });

  describe("Additional Medicare Tax", () => {
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
  });

  describe("estimated quarterly payment", () => {
    it("divides total tax by 4", () => {
      const result = calculateTax(base2024Single);
      expect(result.estimatedQuarterlyPayment).toBe(Math.ceil(result.totalFederalTax / 4));
    });
  });

  describe("AMT (Alternative Minimum Tax)", () => {
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

/**
 * TY2026 verification — hand-calculated from Rev. Proc. 2025-32 published bracket data.
 * Std ded (single): $16,100. Brackets: 10/12/22/24/32/35/37 at $12,400 / $50,400 /
 * $105,700 / $201,775 / $256,225 / $640,600.
 */
describe("TY2026 IRS Tax Table verification (Rev. Proc. 2025-32)", () => {
  it("TY2026 single $50k → tax $3,820", () => {
    // Taxable: $50,000 - $16,100 = $33,900
    // 10% × $12,400 = $1,240 + 12% × ($33,900 - $12,400) = 12% × $21,500 = $2,580
    const r = calculateTax({ taxYear: 2026, filingStatus: "single", grossIncome: 50000 });
    expect(r.taxableIncome).toBe(33900);
    expect(r.ordinaryIncomeTax).toBeCloseTo(3820, 0);
  });

  it("TY2026 single $100k → tax $13,170", () => {
    // Taxable: $100,000 - $16,100 = $83,900
    // 10% × $12,400 + 12% × $38,000 + 22% × ($83,900 - $50,400) = $1,240 + $4,560 + $7,370
    const r = calculateTax({ taxYear: 2026, filingStatus: "single", grossIncome: 100000 });
    expect(r.taxableIncome).toBe(83900);
    expect(r.ordinaryIncomeTax).toBeCloseTo(13170, 0);
  });

  it("TY2026 MFJ $150k → tax $15,340", () => {
    // Taxable: $150,000 - $32,200 = $117,800
    // 10% × $24,800 + 12% × $76,000 + 22% × ($117,800 - $100,800)
    // = $2,480 + $9,120 + $3,740
    const r = calculateTax({
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      grossIncome: 150000,
    });
    expect(r.taxableIncome).toBe(117800);
    expect(r.ordinaryIncomeTax).toBeCloseTo(15340, 0);
  });

  it("TY2026 single $500k → tax $138,134.25 (top of 35% bracket cite)", () => {
    // Taxable: $500,000 - $16,100 = $483,900 — falls in 35% bracket
    // Rev. Proc. 2025-32 Table 3: Over $256,225 but not over $640,600 →
    //   $58,448 plus 35% of the excess over $256,225
    // $58,448 + 35% × ($483,900 - $256,225) = $58,448 + $79,686.25 = $138,134.25
    const r = calculateTax({ taxYear: 2026, filingStatus: "single", grossIncome: 500000 });
    expect(r.taxableIncome).toBe(483900);
    expect(r.ordinaryIncomeTax).toBeCloseTo(138134.25, 0);
  });

  it("TY2026 single age 65+ standard deduction is $18,150", () => {
    // Per Rev. Proc. 2025-32 §4.14(1) + §4.14(3): $16,100 base + $2,050 add-on
    // (unmarried and not surviving spouse).
    const r = calculateTax({
      taxYear: 2026,
      filingStatus: "single",
      grossIncome: 100000,
      age65OrOlder: true,
    });
    expect(r.deductionAmount).toBe(18150);
    expect(r.taxableIncome).toBe(81850);
  });

  it("TY2026 MFJ age-65 add-on is $1,650 per spouse", () => {
    // Per Rev. Proc. 2025-32 §4.14(3): $1,650 base (married, not unmarried).
    const r = calculateTax({
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      grossIncome: 100000,
      age65OrOlder: true,
    });
    expect(r.deductionAmount).toBe(32200 + 1650);
  });

  it("TY2026 single $80k w/ $50k LTCG spans 0% & 15% cap-gains brackets", () => {
    // Gross $80K with $50K LTCG, single, std ded $16,100.
    // Taxable income: $63,900. Ordinary portion: $13,900. LTCG: $50,000.
    // Ordinary tax on $13,900: 10% × $12,400 + 12% × $1,500 = $1,240 + $180 = $1,420
    // LTCG stacked above $13,900 of ordinary:
    //   0% bracket up to $49,450 (Rev. Proc. 2025-32 §4.03): $49,450 - $13,900
    //     = $35,550 of LTCG at 0% = $0
    //   15% bracket: remaining $50,000 - $35,550 = $14,450 at 15% = $2,167.50
    // NIIT: $0 (AGI $80K below $200K threshold).
    const r = calculateTax({
      taxYear: 2026,
      filingStatus: "single",
      grossIncome: 80000,
      capitalGains: 50000,
      capitalGainsLongTerm: true,
    });
    expect(r.taxableIncome).toBe(63900);
    expect(r.ordinaryIncomeTax).toBeCloseTo(1420, 0);
    expect(r.capitalGainsTax).toBeCloseTo(2167.5, 0);
    expect(r.niit).toBe(0);
    expect(r.amt).toBe(0);
  });

  it("TY2026 CTC remains $2,200 per child (OBBB continued)", () => {
    // Rev. Proc. 2025-32 §4.05(1): max credit $2,200 — same as TY2025.
    const r = calculateTax({
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      grossIncome: 100000,
      dependents: 2,
    });
    expect(r.childTaxCredit).toBe(4400);
  });
});
