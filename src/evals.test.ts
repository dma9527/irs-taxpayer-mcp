import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MCP agent evaluations", () => {
  it("contains 10 stable question and answer pairs", () => {
    const evaluation = readFileSync("evals/tax-tools.xml", "utf8");
    const questions = evaluation.match(/<question>/g) ?? [];
    const answers = evaluation.match(/<answer>/g) ?? [];

    expect(questions).toHaveLength(10);
    expect(answers).toHaveLength(10);
    expect(evaluation).toContain("generate_tax_plan");
    expect(evaluation).toContain("calculate_eitc");
  });
});
