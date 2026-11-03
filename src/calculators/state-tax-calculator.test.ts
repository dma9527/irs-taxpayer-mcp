import { describe, expect, it } from "vitest";
import { calculateStateTax } from "./state-tax-calculator.js";

describe("calculateStateTax accuracy safeguards", () => {
  it("fails closed when a graduated state has no brackets", () => {
    expect(() =>
      calculateStateTax({
        stateCode: "AR",
        taxYear: 2024,
        taxableIncome: 100000,
        filingStatus: "single",
      }),
    ).toThrow("Arkansas TY2024 calculation data are not available");
  });

  it("uses explicit California married brackets", () => {
    const single = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      taxableIncome: 100000,
      filingStatus: "single",
    });
    const married = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      incomeBeforeDeductions: 100000,
      filingStatus: "married",
    });

    expect(single?.tax).toBe(5327);
    expect(married?.tax).toBe(2490);
  });

  it("keeps the legacy taxableIncome alias equivalent", () => {
    const explicit = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      incomeBeforeDeductions: 100000,
      filingStatus: "single",
    });
    const legacy = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      taxableIncome: 100000,
      filingStatus: "single",
    });

    expect(legacy).toEqual(explicit);
  });

  it("applies California mental-health surcharge above $1M for married filers", () => {
    const result = calculateStateTax({
      stateCode: "CA",
      taxYear: 2024,
      taxableIncome: 1200000,
      filingStatus: "married",
    });

    expect(result?.adjustedIncome).toBe(1188920);
    expect(result?.tax).toBe(113453);
  });

  it("fails closed when the state has no profile for the requested year", () => {
    expect(() =>
      calculateStateTax({
        stateCode: "CA",
        taxYear: 2025,
        incomeBeforeDeductions: 100000,
        filingStatus: "single",
      }),
    ).toThrow("California TY2025 calculation data are not available");
  });

  it("fails closed when an unverified state profile is unavailable", () => {
    expect(() =>
      calculateStateTax({
        stateCode: "NY",
        taxYear: 2024,
        taxableIncome: 100000,
        filingStatus: "married",
      }),
    ).toThrow("New York TY2024 calculation data are not available");
  });
});

describe("TY2026 state profiles", () => {
  it("applies the Massachusetts personal exemption at 5%", () => {
    // ($100,000 - $4,400) x 5%.
    const result = calculateStateTax({ stateCode: "MA", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    expect(result?.tax).toBe(4780);
  });

  it("applies the Massachusetts 4% surtax above $1,107,750", () => {
    // ($2,000,000 - $8,800) x 5% + ($1,991,200 - $1,107,750) x 4%.
    const result = calculateStateTax({ stateCode: "MA", taxYear: 2026, incomeBeforeDeductions: 2000000, filingStatus: "married" });
    expect(result?.tax).toBe(134898);
  });

  it("applies the Illinois $2,925 exemption per person", () => {
    const single = calculateStateTax({ stateCode: "IL", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "IL", taxYear: 2026, incomeBeforeDeductions: 400000, filingStatus: "married" });
    expect(single?.tax).toBe(4805);
    expect(married?.tax).toBe(19510);
  });

  it("disallows the Illinois exemption above $250,000 AGI", () => {
    const result = calculateStateTax({ stateCode: "IL", taxYear: 2026, incomeBeforeDeductions: 300000, filingStatus: "single" });
    expect(result?.deduction).toBe(0);
    expect(result?.tax).toBe(14850);
  });

  it("applies the Pennsylvania 3.07% flat rate with no deduction", () => {
    const result = calculateStateTax({ stateCode: "PA", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    expect(result?.tax).toBe(3070);
    expect(result?.hasLocalTaxes).toBe(true);
  });

  it("applies the North Carolina 3.99% rate after the standard deduction", () => {
    const single = calculateStateTax({ stateCode: "NC", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "NC", taxYear: 2026, incomeBeforeDeductions: 125500, filingStatus: "married" });
    expect(single?.tax).toBe(3481);
    expect(married?.tax).toBe(3990);
  });

  it("uses the TY2026 California FTB schedules and standard deduction", () => {
    // Single: 94,100 taxable -> 3,310.88 + 9.3% x 18,903. MFJ: 188,200 -> 6,621.76 + 9.3% x 37,806.
    const single = calculateStateTax({ stateCode: "CA", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "CA", taxYear: 2026, incomeBeforeDeductions: 200000, filingStatus: "married" });
    expect(single?.deduction).toBe(5900);
    expect(single?.tax).toBe(5069);
    expect(married?.deduction).toBe(11800);
    expect(married?.tax).toBe(10138);
  });

  it("adds the 1% Mental Health Services Tax above $1,000,000 for TY2026 California", () => {
    // 74,675.27 + 12.3% x (1,194,100 - 768,213) + 1% x 194,100.
    const result = calculateStateTax({ stateCode: "CA", taxYear: 2026, incomeBeforeDeductions: 1200000, filingStatus: "single" });
    expect(result?.tax).toBe(129000);
  });

  it("applies the Michigan 4.25% rate after the $5,900 exemption per person", () => {
    // (100,000 - 5,900) x 4.25% = 3,999.25; (200,100 - 11,800) x 4.25% = 8,002.75.
    const single = calculateStateTax({ stateCode: "MI", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "MI", taxYear: 2026, incomeBeforeDeductions: 200100, filingStatus: "married" });
    expect(single?.tax).toBe(3999);
    expect(married?.tax).toBe(8003);
    expect(single?.hasLocalTaxes).toBe(true);
  });

  it("applies the Indiana 2.95% rate after the $1,000 exemption per person", () => {
    // (100,200 - 1,000) x 2.95% = 2,926.40; (150,000 - 2,000) x 2.95% = 4,366.
    const single = calculateStateTax({ stateCode: "IN", taxYear: 2026, incomeBeforeDeductions: 100200, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "IN", taxYear: 2026, incomeBeforeDeductions: 150000, filingStatus: "married" });
    expect(single?.tax).toBe(2926);
    expect(married?.tax).toBe(4366);
    expect(single?.hasLocalTaxes).toBe(true);
  });

  it("applies the Kentucky 3.5% rate after one $3,360 standard deduction per return", () => {
    // (100,000 - 3,360) x 3.5% = 3,382.40; joint return takes one deduction: (80,000 - 3,360) x 3.5% = 2,682.40.
    const single = calculateStateTax({ stateCode: "KY", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "KY", taxYear: 2026, incomeBeforeDeductions: 80000, filingStatus: "married" });
    expect(single?.tax).toBe(3382);
    expect(married?.tax).toBe(2682);
  });

  it("applies the Georgia 4.99% rate after the TY2026 $15,000 / $30,000 standard deduction", () => {
    // (100,100 - 15,000) x 4.99% = 4,246.49; (150,000 - 30,000) x 4.99% = 5,988.
    const single = calculateStateTax({ stateCode: "GA", taxYear: 2026, incomeBeforeDeductions: 100100, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "GA", taxYear: 2026, incomeBeforeDeductions: 150000, filingStatus: "married" });
    expect(single?.tax).toBe(4246);
    expect(married?.tax).toBe(5988);
  });

  it("applies the Virginia schedule after the standard deduction and $930 exemptions", () => {
    // Single: 100,000 - 8,750 - 930 = 90,320; 60 + 60 + 600 + 5.75% x 73,320 = 4,935.90.
    // MFJ: 150,000 - 17,500 - 1,860 = 130,640; 720 + 5.75% x 113,640 = 7,254.30.
    const single = calculateStateTax({ stateCode: "VA", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "VA", taxYear: 2026, incomeBeforeDeductions: 150000, filingStatus: "married" });
    expect(single?.deduction).toBe(9680);
    expect(single?.tax).toBe(4936);
    expect(married?.tax).toBe(7254);
  });

  it("uses New Jersey Table A for single and Table B for joint returns", () => {
    // Table A: 99,000 x 6.37% - 2,126.25 = 4,180.05. Table B: 198,000 x 6.37% - 4,042.50 = 8,570.10.
    const single = calculateStateTax({ stateCode: "NJ", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" });
    const married = calculateStateTax({ stateCode: "NJ", taxYear: 2026, incomeBeforeDeductions: 200000, filingStatus: "married" });
    expect(single?.tax).toBe(4180);
    expect(married?.tax).toBe(8570);
  });

  it.each([
    // Exemption tier by income; tax is $332 + 2.75% over $26,050, or zero at or below $26,050.
    ["single", 25000, 2400, 0],
    ["single", 30000, 2400, 375],
    ["single", 60100, 2150, 1209],
    ["married", 120000, 3800, 2811],
    ["single", 600000, 0, 16116],
  ] as const)("applies the Ohio TY2026 schedule: %s at $%i", (filingStatus, income, deduction, tax) => {
    const result = calculateStateTax({ stateCode: "OH", taxYear: 2026, incomeBeforeDeductions: income, filingStatus });
    expect(result?.deduction).toBe(deduction);
    expect(result?.tax).toBe(tax);
  });

  it("still fails closed for TY2026 states without a verified profile", () => {
    expect(() =>
      calculateStateTax({ stateCode: "AZ", taxYear: 2026, incomeBeforeDeductions: 100000, filingStatus: "single" }),
    ).toThrow("Arizona TY2026 calculation data are not available");
  });
});
