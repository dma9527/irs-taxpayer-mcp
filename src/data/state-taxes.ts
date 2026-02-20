/**
 * State income tax data for all 50 states + DC.
 * Simplified: uses top marginal rate and basic structure.
 * For states with graduated brackets, includes full bracket data.
 *
 * Sources:
 *   Tax Foundation: "State Individual Income Tax Rates and Brackets" (2024)
 *   Federation of Tax Administrators: state tax rate tables
 *   Individual state department of revenue websites
 */

export type StateTaxType = "none" | "flat" | "graduated";

export interface StateBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface LocalTaxInfo {
  name: string;
  rate: number;
  nonResidentRate?: number;
  notes?: string;
}

export interface StateInfo {
  code: string;
  name: string;
  taxType: StateTaxType;
  topRate: number;
  brackets?: StateBracket[];
  standardDeduction?: { single: number; married: number };
  personalExemption?: { single: number; married: number };
  notes?: string;
  saltDeductionOnFederal: boolean;
  localTaxes?: boolean;
  localTaxData?: LocalTaxInfo[];
}

export const STATE_TAX_DATA: Record<string, StateInfo> = {
  // === NO INCOME TAX ===
  AK: { code: "AK", name: "Alaska", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  FL: { code: "FL", name: "Florida", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  NV: { code: "NV", name: "Nevada", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  NH: { code: "NH", name: "New Hampshire", taxType: "none", topRate: 0, saltDeductionOnFederal: false, notes: "No tax on wages. Interest/dividends tax repealed as of 2025" },
  SD: { code: "SD", name: "South Dakota", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  TN: { code: "TN", name: "Tennessee", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  TX: { code: "TX", name: "Texas", taxType: "none", topRate: 0, saltDeductionOnFederal: false },
  WA: { code: "WA", name: "Washington", taxType: "none", topRate: 0, saltDeductionOnFederal: false, notes: "No income tax but has 7% capital gains tax on gains over $270,000 (TY2024)" },
  WY: { code: "WY", name: "Wyoming", taxType: "none", topRate: 0, saltDeductionOnFederal: false },

  // === FLAT TAX STATES ===
  AZ: { code: "AZ", name: "Arizona", taxType: "flat", topRate: 0.025, saltDeductionOnFederal: true, standardDeduction: { single: 14600, married: 29200 } },
  CO: { code: "CO", name: "Colorado", taxType: "flat", topRate: 0.044, saltDeductionOnFederal: true },
  GA: { code: "GA", name: "Georgia", taxType: "flat", topRate: 0.0539, saltDeductionOnFederal: true, standardDeduction: { single: 12000, married: 24000 }, notes: "Transitioning to flat tax, rate decreasing annually" },
  ID: { code: "ID", name: "Idaho", taxType: "flat", topRate: 0.058, saltDeductionOnFederal: true },
  IL: { code: "IL", name: "Illinois", taxType: "flat", topRate: 0.0495, saltDeductionOnFederal: true, personalExemption: { single: 2625, married: 5250 } },
  IN: {
    code: "IN", name: "Indiana", taxType: "flat", topRate: 0.03, saltDeductionOnFederal: true, localTaxes: true, notes: "Counties impose additional income tax (0.25%-3.38%). State rate 3.0% for TY2025", localTaxData: [
      { name: "Marion County (Indianapolis)", rate: 0.0202 },
      { name: "Allen County (Fort Wayne)", rate: 0.0159 },
      { name: "Lake County", rate: 0.015 },
    ]
  },
  IA: { code: "IA", name: "Iowa", taxType: "flat", topRate: 0.038, saltDeductionOnFederal: true, notes: "Transitioned to flat tax in 2025" },
  KS: { code: "KS", name: "Kansas", taxType: "flat", topRate: 0.057, saltDeductionOnFederal: true, standardDeduction: { single: 3500, married: 8000 } },
  KY: { code: "KY", name: "Kentucky", taxType: "flat", topRate: 0.04, saltDeductionOnFederal: true, standardDeduction: { single: 3160, married: 6320 } },
  MA: { code: "MA", name: "Massachusetts", taxType: "flat", topRate: 0.05, saltDeductionOnFederal: true, notes: "Additional 4% surtax on income over $1M (total 9%)" },
  MI: {
    code: "MI", name: "Michigan", taxType: "flat", topRate: 0.0425, saltDeductionOnFederal: true, personalExemption: { single: 5600, married: 11200 }, localTaxes: true, localTaxData: [
      { name: "Detroit", rate: 0.024, nonResidentRate: 0.012 },
      { name: "Grand Rapids", rate: 0.015, nonResidentRate: 0.0075 },
      { name: "Other MI cities (24 total)", rate: 0.01, nonResidentRate: 0.005, notes: "Standard rate for most MI cities" },
    ]
  },
  MS: { code: "MS", name: "Mississippi", taxType: "flat", topRate: 0.047, saltDeductionOnFederal: true, notes: "Flat tax as of 2026, currently graduated" },
  NC: { code: "NC", name: "North Carolina", taxType: "flat", topRate: 0.045, saltDeductionOnFederal: true, standardDeduction: { single: 12750, married: 25500 } },
  ND: { code: "ND", name: "North Dakota", taxType: "flat", topRate: 0.0195, saltDeductionOnFederal: true },
  PA: {
    code: "PA", name: "Pennsylvania", taxType: "flat", topRate: 0.0307, saltDeductionOnFederal: true, localTaxes: true, notes: "Philadelphia and other cities impose local income tax", localTaxData: [
      { name: "Philadelphia", rate: 0.0374, nonResidentRate: 0.0343, notes: "Rates effective Jul 1, 2025. Wage tax on all earned income" },
      { name: "Pittsburgh", rate: 0.03, notes: "Residents: 3.0%" },
    ]
  },
  UT: { code: "UT", name: "Utah", taxType: "flat", topRate: 0.0465, saltDeductionOnFederal: true },

  // === GRADUATED TAX STATES (selected major ones with brackets) ===
  AL: {
    code: "AL", name: "Alabama", taxType: "graduated", topRate: 0.05, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 500, rate: 0.02 }, { min: 500, max: 3000, rate: 0.04 }, { min: 3000, max: null, rate: 0.05 },
    ]
  },
  AR: { code: "AR", name: "Arkansas", taxType: "graduated", topRate: 0.039, saltDeductionOnFederal: true },
  CA: {
    code: "CA", name: "California", taxType: "graduated", topRate: 0.133, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 10412, rate: 0.01 }, { min: 10412, max: 24684, rate: 0.02 }, { min: 24684, max: 38959, rate: 0.04 },
      { min: 38959, max: 54081, rate: 0.06 }, { min: 54081, max: 68350, rate: 0.08 }, { min: 68350, max: 349137, rate: 0.093 },
      { min: 349137, max: 418961, rate: 0.103 }, { min: 418961, max: 698271, rate: 0.113 }, { min: 698271, max: 1000000, rate: 0.123 },
      { min: 1000000, max: null, rate: 0.133 },
    ], standardDeduction: { single: 5540, married: 11080 }, notes: "Highest state income tax rate in the US. Additional 1% mental health surcharge on income over $1M"
  },
  CT: {
    code: "CT", name: "Connecticut", taxType: "graduated", topRate: 0.0699, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 10000, rate: 0.03 }, { min: 10000, max: 50000, rate: 0.05 }, { min: 50000, max: 100000, rate: 0.055 },
      { min: 100000, max: 200000, rate: 0.06 }, { min: 200000, max: 250000, rate: 0.065 }, { min: 250000, max: 500000, rate: 0.069 },
      { min: 500000, max: null, rate: 0.0699 },
    ]
  },
  DE: {
    code: "DE", name: "Delaware", taxType: "graduated", topRate: 0.066, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 2000, rate: 0.0 }, { min: 2000, max: 5000, rate: 0.022 }, { min: 5000, max: 10000, rate: 0.039 },
      { min: 10000, max: 20000, rate: 0.048 }, { min: 20000, max: 25000, rate: 0.052 }, { min: 25000, max: 60000, rate: 0.0555 },
      { min: 60000, max: null, rate: 0.066 },
    ], standardDeduction: { single: 3250, married: 6500 }
  },
  HI: {
    code: "HI", name: "Hawaii", taxType: "graduated", topRate: 0.11, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 2400, rate: 0.014 }, { min: 2400, max: 4800, rate: 0.032 }, { min: 4800, max: 9600, rate: 0.055 },
      { min: 9600, max: 14400, rate: 0.064 }, { min: 14400, max: 19200, rate: 0.068 }, { min: 19200, max: 24000, rate: 0.072 },
      { min: 24000, max: 36000, rate: 0.076 }, { min: 36000, max: 48000, rate: 0.079 }, { min: 48000, max: 150000, rate: 0.0825 },
      { min: 150000, max: 175000, rate: 0.09 }, { min: 175000, max: 200000, rate: 0.10 }, { min: 200000, max: null, rate: 0.11 },
    ], standardDeduction: { single: 2200, married: 4400 }
  },
  LA: { code: "LA", name: "Louisiana", taxType: "graduated", topRate: 0.045, saltDeductionOnFederal: true },
  ME: { code: "ME", name: "Maine", taxType: "graduated", topRate: 0.0715, saltDeductionOnFederal: true },
  MD: {
    code: "MD", name: "Maryland", taxType: "graduated", topRate: 0.0575, saltDeductionOnFederal: true, localTaxes: true, notes: "All counties impose additional 2.25%-3.2% income tax", localTaxData: [
      { name: "Montgomery County", rate: 0.032 },
      { name: "Howard County", rate: 0.032 },
      { name: "Baltimore City", rate: 0.032 },
      { name: "Prince George's County", rate: 0.032 },
      { name: "Anne Arundel County", rate: 0.0281 },
      { name: "Other MD counties", rate: 0.0275, notes: "Range: 2.25%-3.2%" },
    ]
  },
  MN: {
    code: "MN", name: "Minnesota", taxType: "graduated", topRate: 0.0985, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 30070, rate: 0.0535 }, { min: 30070, max: 98760, rate: 0.068 },
      { min: 98760, max: 183340, rate: 0.0785 }, { min: 183340, max: null, rate: 0.0985 },
    ], standardDeduction: { single: 14575, married: 29150 }
  },
  MO: {
    code: "MO", name: "Missouri", taxType: "graduated", topRate: 0.048, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 1207, rate: 0.02 }, { min: 1207, max: 2414, rate: 0.025 }, { min: 2414, max: 3621, rate: 0.03 },
      { min: 3621, max: 4828, rate: 0.035 }, { min: 4828, max: 6035, rate: 0.04 }, { min: 6035, max: 7242, rate: 0.045 },
      { min: 7242, max: null, rate: 0.048 },
    ], standardDeduction: { single: 14600, married: 29200 }
  },
  MT: { code: "MT", name: "Montana", taxType: "graduated", topRate: 0.059, saltDeductionOnFederal: true },
  NE: { code: "NE", name: "Nebraska", taxType: "graduated", topRate: 0.0564, saltDeductionOnFederal: true },
  NJ: {
    code: "NJ", name: "New Jersey", taxType: "graduated", topRate: 0.1075, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 20000, rate: 0.014 }, { min: 20000, max: 35000, rate: 0.0175 }, { min: 35000, max: 40000, rate: 0.035 },
      { min: 40000, max: 75000, rate: 0.05525 }, { min: 75000, max: 500000, rate: 0.0637 }, { min: 500000, max: 1000000, rate: 0.0897 },
      { min: 1000000, max: null, rate: 0.1075 },
    ], notes: "10.75% on income over $1M"
  },
  NM: { code: "NM", name: "New Mexico", taxType: "graduated", topRate: 0.059, saltDeductionOnFederal: true },
  NY: {
    code: "NY", name: "New York", taxType: "graduated", topRate: 0.109, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 8500, rate: 0.04 }, { min: 8500, max: 11700, rate: 0.045 }, { min: 11700, max: 13900, rate: 0.0525 },
      { min: 13900, max: 80650, rate: 0.055 }, { min: 80650, max: 215400, rate: 0.06 }, { min: 215400, max: 1077550, rate: 0.0685 },
      { min: 1077550, max: 5000000, rate: 0.0965 }, { min: 5000000, max: 25000000, rate: 0.103 }, { min: 25000000, max: null, rate: 0.109 },
    ], standardDeduction: { single: 8000, married: 16050 }, localTaxes: true, notes: "NYC imposes additional 3.078%-3.876% income tax", localTaxData: [
      { name: "New York City", rate: 0.03876, notes: "Progressive: 3.078% (<$12K), 3.762% ($12K-$25K), 3.819% ($25K-$50K), 3.876% (>$50K). Residents only" },
      { name: "Yonkers", rate: 0.01959, notes: "16.75% surcharge on NY state tax. Non-residents: 0.5% of wages" },
    ]
  },
  OH: {
    code: "OH", name: "Ohio", taxType: "graduated", topRate: 0.035, saltDeductionOnFederal: true, localTaxes: true, localTaxData: [
      { name: "Columbus", rate: 0.025 },
      { name: "Cleveland", rate: 0.025 },
      { name: "Cincinnati", rate: 0.018 },
      { name: "Other OH cities (600+)", rate: 0.02, notes: "Range: 0.5%-3.0%. Most cities 1.5%-2.5%" },
    ]
  },
  OK: { code: "OK", name: "Oklahoma", taxType: "graduated", topRate: 0.0475, saltDeductionOnFederal: true },
  OR: {
    code: "OR", name: "Oregon", taxType: "graduated", topRate: 0.099, saltDeductionOnFederal: true, brackets: [
      { min: 0, max: 4050, rate: 0.0475 }, { min: 4050, max: 10200, rate: 0.0675 },
      { min: 10200, max: 125000, rate: 0.0875 }, { min: 125000, max: null, rate: 0.099 },
    ], standardDeduction: { single: 2745, married: 5495 }, notes: "No sales tax but high income tax"
  },
  RI: { code: "RI", name: "Rhode Island", taxType: "graduated", topRate: 0.0599, saltDeductionOnFederal: true },
  SC: { code: "SC", name: "South Carolina", taxType: "graduated", topRate: 0.064, saltDeductionOnFederal: true },
  VT: { code: "VT", name: "Vermont", taxType: "graduated", topRate: 0.0875, saltDeductionOnFederal: true },
  VA: { code: "VA", name: "Virginia", taxType: "graduated", topRate: 0.0575, saltDeductionOnFederal: true, standardDeduction: { single: 8000, married: 16000 } },
  WV: { code: "WV", name: "West Virginia", taxType: "graduated", topRate: 0.0512, saltDeductionOnFederal: true },
  WI: { code: "WI", name: "Wisconsin", taxType: "graduated", topRate: 0.0765, saltDeductionOnFederal: true },
  DC: { code: "DC", name: "District of Columbia", taxType: "graduated", topRate: 0.1075, saltDeductionOnFederal: true },
};

export function getStateInfo(stateCode: string): StateInfo | undefined {
  return STATE_TAX_DATA[stateCode.toUpperCase()];
}

export function getNoIncomeTaxStates(): StateInfo[] {
  return Object.values(STATE_TAX_DATA).filter((s) => s.taxType === "none");
}
