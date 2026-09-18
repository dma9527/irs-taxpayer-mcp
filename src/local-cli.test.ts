import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildTaxpayerFactsFromAnswers,
  runLocalCommand,
  writePrivateJsonFile,
  type LocalCommandIO,
} from "./local-cli.js";
import { TaxPlanSchema } from "./services/tax-plan-service.js";

function createMemoryIo() {
  const output: string[] = [];
  const errors: string[] = [];
  const io: LocalCommandIO = {
    writeOut: (text) => output.push(text),
    writeError: (text) => errors.push(text),
  };
  return { io, output, errors };
}

async function withTemporaryDirectory<T>(
  callback: (directory: string) => T | Promise<T>,
): Promise<T> {
  const directory = mkdtempSync(join(tmpdir(), "taxpayer-intake-"));
  try {
    return await callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const validFile = {
  schemaVersion: "1.0",
  taxYear: 2026,
  filingStatus: "single",
  income: { w2: 100000 },
  payments: { federalWithholding: 12000 },
};

describe("local taxpayer facts CLI", () => {
  it("validates a strict local facts file without echoing its values", async () => {
    await withTemporaryDirectory(async (directory) => {
      const path = join(directory, "facts.json");
      writeFileSync(path, JSON.stringify(validFile));
      const { io, output, errors } = createMemoryIo();

      const status = await runLocalCommand(["validate", "--facts", path], io);

      expect(status).toBe(0);
      expect(output.join("\n")).toContain("TaxpayerFacts file is valid");
      expect(output.join("\n")).not.toContain("100000");
      expect(errors).toEqual([]);
    });
  });

  it("rejects identity fields without echoing sensitive values", async () => {
    await withTemporaryDirectory(async (directory) => {
      const path = join(directory, "facts.json");
      writeFileSync(path, JSON.stringify({
        ...validFile,
        ssn: "SENSITIVE-TEST-VALUE",
      }));
      const { io, output, errors } = createMemoryIo();

      const status = await runLocalCommand(["validate", "--facts", path], io);

      expect(status).toBe(1);
      expect(output).toEqual([]);
      expect(errors.join("\n")).toContain("ssn");
      expect(errors.join("\n")).not.toContain("SENSITIVE-TEST-VALUE");
    });
  });

  it("does not echo an invalid filing-status value", async () => {
    await withTemporaryDirectory(async (directory) => {
      const path = join(directory, "facts.json");
      writeFileSync(path, JSON.stringify({
        ...validFile,
        filingStatus: "SENSITIVE-STATUS-VALUE",
      }));
      const { io, errors } = createMemoryIo();

      const status = await runLocalCommand(["validate", "--facts", path], io);

      expect(status).toBe(1);
      expect(errors.join("\n")).toContain("Filing status must be");
      expect(errors.join("\n")).not.toContain("SENSITIVE-STATUS-VALUE");
    });
  });

  it("generates a plan directly from local JSON without MCP", async () => {
    await withTemporaryDirectory(async (directory) => {
      const path = join(directory, "facts.json");
      writeFileSync(path, JSON.stringify(validFile));
      const { io, output, errors } = createMemoryIo();

      const status = await runLocalCommand(
        ["plan", "--facts", path, "--json"],
        io,
      );
      const parsed: unknown = JSON.parse(output.join("\n"));

      expect(status).toBe(0);
      expect(parsed).toMatchObject({
        contractVersion: "1.0",
        taxYear: 2026,
        privacy: {
          execution: "local",
          networkRequests: false,
          persisted: false,
          telemetry: false,
          modelInvoked: false,
        },
        results: {
          adjustedGrossIncome: 100000,
          federalTaxAfterRefundableCredits: 13170,
        },
      });
      expect(errors).toEqual([]);
    });
  });

  it("writes private local files and refuses overwrite", async () => {
    await withTemporaryDirectory((directory) => {
      const path = join(directory, "facts.json");
      writePrivateJsonFile(path, validFile, false);

      if (process.platform !== "win32") {
        expect(statSync(path).mode & 0o777).toBe(0o600);
      }
      expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(validFile);
      expect(() => writePrivateJsonFile(path, validFile, false))
        .toThrow("already exists");
    });
  });

  it("builds normalized facts from local questionnaire answers", () => {
    expect(buildTaxpayerFactsFromAnswers({
      taxYear: "2026",
      filingStatus: "single",
      w2: "100000",
      selfEmployment: "0",
      taxableInterest: "500",
      ordinaryDividends: "1000",
      qualifiedDividends: "800",
      stateCode: "",
      federalWithholding: "12000",
    })).toEqual({
      schemaVersion: "1.0",
      taxYear: 2026,
      filingStatus: "single",
      income: {
        w2: 100000,
        taxableInterest: 500,
        ordinaryDividends: 1000,
        qualifiedDividends: 800,
      },
      payments: { federalWithholding: 12000 },
    });
  });

  it("preserves explicit zero taxable retirement distributions", () => {
    const facts = buildTaxpayerFactsFromAnswers({
      taxYear: "2026",
      filingStatus: "single",
      retirementDistributions: "10000",
      taxableRetirementDistributions: "0",
    });

    expect(facts.income.retirementDistributions).toBe(10000);
    expect(facts.income.taxableRetirementDistributions).toBe(0);
  });

  it("rejects symbolic links for imports and outputs", async () => {
    if (process.platform === "win32") return;
    await withTemporaryDirectory(async (directory) => {
      const target = join(directory, "target.json");
      const link = join(directory, "link.json");
      writeFileSync(target, JSON.stringify(validFile));
      symlinkSync(target, link);
      const { io, errors } = createMemoryIo();

      const status = await runLocalCommand(["validate", "--facts", link], io);

      expect(status).toBe(1);
      expect(errors.join("\n")).toContain("must not be a symbolic link");
      expect(() => writePrivateJsonFile(link, validFile, true))
        .toThrow("must not be a symbolic link");
    });
  });

  it("rejects oversized imports before JSON parsing", async () => {
    await withTemporaryDirectory(async (directory) => {
      const path = join(directory, "facts.json");
      writeFileSync(path, "x".repeat(1_048_577));
      const { io, errors } = createMemoryIo();

      const status = await runLocalCommand(["validate", "--facts", path], io);

      expect(status).toBe(1);
      expect(errors.join("\n")).toContain("1 MiB");
    });
  });

  it("runs guided intake locally and writes normalized private facts", async () => {
    await withTemporaryDirectory(async (directory) => {
      const path = join(directory, "guided-facts.json");
      const answers: Record<string, string> = {
        taxYear: "2026",
        filingStatus: "single",
        w2: "100000",
        federalWithholding: "12000",
      };
      const output: string[] = [];
      const errors: string[] = [];
      const io: LocalCommandIO = {
        writeOut: (text) => output.push(text),
        writeError: (text) => errors.push(text),
        ask: async (id, _question, defaultValue) =>
          answers[id] ?? defaultValue ?? "",
      };

      const status = await runLocalCommand(
        ["intake", "--output", path],
        io,
      );

      expect(status).toBe(0);
      expect(errors).toEqual([]);
      expect(output.join("\n")).toContain(
        "No model, network request, or telemetry was used",
      );
      if (process.platform !== "win32") {
        expect(statSync(path).mode & 0o777).toBe(0o600);
      }
      expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({
        schemaVersion: "1.0",
        taxYear: 2026,
        filingStatus: "single",
        income: { w2: 100000 },
        payments: { federalWithholding: 12000 },
      });
    });
  });

  it("runs direct validation and planning through the built binary", async () => {
    await withTemporaryDirectory((directory) => {
      const path = join(directory, "facts.json");
      writeFileSync(path, JSON.stringify(validFile));

      const validation = spawnSync(
        process.execPath,
        ["dist/index.js", "validate", "--facts", path],
        { encoding: "utf8" },
      );
      expect(validation.status).toBe(0);
      expect(validation.stdout).toContain("TaxpayerFacts file is valid");
      expect(validation.stderr).toBe("");

      const planning = spawnSync(
        process.execPath,
        ["dist/index.js", "plan", "--facts", path, "--json"],
        { encoding: "utf8" },
      );
      expect(planning.status).toBe(0);
      expect(planning.stderr).toBe("");
      const plan = TaxPlanSchema.parse(JSON.parse(planning.stdout));
      expect(plan.privacy.modelInvoked).toBe(false);
      expect(plan.results.federalTaxAfterRefundableCredits).toBe(13170);
    });
  });
});
