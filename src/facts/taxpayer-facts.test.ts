import { describe, expect, it } from "vitest";
import {
  TaxpayerFactsFileSchema,
  TaxpayerFactsSchema,
} from "./taxpayer-facts.js";

const minimalFacts = {
  taxYear: 2026,
  filingStatus: "single",
  income: { w2: 100000 },
};

describe("TaxpayerFacts schema", () => {
  it("accepts supported calculation facts without identity fields", () => {
    expect(TaxpayerFactsSchema.parse(minimalFacts)).toEqual(minimalFacts);
    expect(TaxpayerFactsFileSchema.parse({
      schemaVersion: "1.0",
      ...minimalFacts,
    })).toEqual({ schemaVersion: "1.0", ...minimalFacts });
  });

  it.each([
    { field: "ssn", value: "000-00-0000" },
    { field: "name", value: "Test Person" },
    { field: "address", value: "Test Address" },
    { field: "employerEin", value: "00-0000000" },
  ])("rejects unsupported identity field $field", ({ field, value }) => {
    const result = TaxpayerFactsFileSchema.safeParse({
      schemaVersion: "1.0",
      ...minimalFacts,
      [field]: value,
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown nested fields instead of silently dropping them", () => {
    const result = TaxpayerFactsFileSchema.safeParse({
      schemaVersion: "1.0",
      ...minimalFacts,
      income: {
        ...minimalFacts.income,
        unverifiedAmount: 25000,
      },
    });

    expect(result.success).toBe(false);
  });

  it("requires an explicit supported schema version for imported files", () => {
    expect(TaxpayerFactsFileSchema.safeParse(minimalFacts).success).toBe(false);
    expect(TaxpayerFactsFileSchema.safeParse({
      schemaVersion: "2.0",
      ...minimalFacts,
    }).success).toBe(false);
  });
});
