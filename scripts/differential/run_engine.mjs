// Runs shared scenarios through the local engine and prints JSON results.
import { readFileSync } from "node:fs";
import { calculateTax } from "../../dist/calculators/tax-calculator.js";
import { calculateEITC } from "../../dist/calculators/eitc-calculator.js";
import { getSaltCap } from "../../dist/data/tax-brackets.js";

const scenarios = JSON.parse(readFileSync(process.argv[2], "utf8"));
const results = scenarios.map((scenario) => {
  const wages = scenario.wages + scenario.spouse_wages;
  const dividends = scenario.odiv;
  const grossIncome = wages + scenario.ltcg + dividends;
  const preliminaryAgi = grossIncome;
  const salt = Math.min(scenario.salt, getSaltCap(scenario.year, scenario.status, preliminaryAgi));
  const itemized = salt + scenario.mortgage + scenario.charity;
  const result = calculateTax({
    taxYear: scenario.year,
    filingStatus: scenario.status,
    grossIncome,
    w2Income: wages,
    capitalGains: scenario.ltcg,
    qualifiedDividends: scenario.qdiv,
    netInvestmentIncome: scenario.ltcg + dividends,
    itemizedDeductions: itemized > 0 ? itemized : undefined,
    itemizedCharitableContributions: scenario.charity,
    charitableCashContributions: scenario.charity,
    stateTaxDeducted: salt,
    qualifyingChildrenForCtc: scenario.ctc_kids,
    earnedIncome: wages,
    dependentCareExpenses: scenario.care_expenses,
    dependentCareQualifyingIndividuals: scenario.care_kids,
    spouseEarnedIncome: scenario.status === "married_filing_jointly" ? scenario.spouse_wages : undefined,
    age65OrOlder: scenario.age >= 65,
    spouseAge65OrOlder: scenario.status === "married_filing_jointly" && scenario.spouse_age >= 65,
    qualifiedTips: scenario.tips,
    qualifiedOvertimeCompensation: scenario.overtime,
    qualifiedVehicleLoanInterest: scenario.auto_interest,
  });
  const eitc = calculateEITC({
    taxYear: scenario.year,
    filingStatus: scenario.status,
    earnedIncome: wages,
    agi: result.adjustedGrossIncome,
    qualifyingChildren: scenario.eitc_kids,
    investmentIncome: scenario.ltcg + dividends,
  });
  return {
    name: scenario.name,
    agi: result.adjustedGrossIncome,
    taxableIncome: result.taxableIncome,
    taxBeforeCredits: result.ordinaryIncomeTax + result.capitalGainsTax + result.amt,
    amt: result.amt,
    cdcc: result.dependentCareCredit,
    ctcNonrefundable: result.childTaxCredit,
    actc: result.additionalChildTaxCredit,
    eitc: eitc.credit,
    niit: result.niit,
  };
});
console.log(JSON.stringify(results));
