import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { platform, stdin, stdout } from "node:process";
import { ZodError } from "zod";
import {
  createTaxpayerFactsFile,
  FilingStatusSchema,
  parseTaxpayerFactsFile,
  TaxpayerFactsFileSchema,
  type TaxpayerFactsFile,
} from "./facts/taxpayer-facts.js";
import {
  buildTaxPlan,
  TaxPlanServiceError,
} from "./services/tax-plan-service.js";

const MAX_FACTS_FILE_BYTES = 1_048_576;
const LOCAL_COMMANDS = new Set(["intake", "template", "validate", "plan"]);

export interface LocalCommandIO {
  writeOut: (text: string) => void;
  writeError: (text: string) => void;
  ask?: (
    id: string,
    question: string,
    defaultValue?: string,
  ) => Promise<string>;
}

interface TerminalLocalCommandIO {
  io: LocalCommandIO;
  close: () => void;
}

export function isLocalCommand(args: readonly string[]): boolean {
  return args.length > 0 && LOCAL_COMMANDS.has(args[0] ?? "");
}

export function createTerminalLocalCommandIo(): TerminalLocalCommandIO {
  const readline = createInterface({ input: stdin, output: stdout });
  return {
    io: {
      writeOut: (text) => console.log(text),
      writeError: (text) => console.error(text),
      ask: async (_id, question, defaultValue) => {
        const suffix = defaultValue === undefined ? "" : ` [${defaultValue}]`;
        const answer = await readline.question(`${question}${suffix}: `);
        return answer.trim() || defaultValue || "";
      },
    },
    close: () => readline.close(),
  };
}

function readOption(
  args: readonly string[],
  option: string,
): string | undefined {
  const index = args.indexOf(option);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function assertKnownOptions(
  args: readonly string[],
  optionsWithValues: readonly string[],
  flags: readonly string[],
): void {
  const known = new Set([...optionsWithValues, ...flags]);
  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) continue;
    if (!known.has(argument)) throw new Error(`Unknown option: ${argument}`);
    if (optionsWithValues.includes(argument)) index += 1;
  }
}

function readFactsFile(pathInput: string) {
  const path = resolve(pathInput);
  if (lstatSync(path).isSymbolicLink()) {
    throw new Error("TaxpayerFacts import must not be a symbolic link");
  }

  const noFollow = platform === "win32" ? 0 : constants.O_NOFOLLOW;
  const descriptor = openSync(path, constants.O_RDONLY | noFollow);
  let content: string;
  try {
    const fileInfo = fstatSync(descriptor);
    if (!fileInfo.isFile()) {
      throw new Error("TaxpayerFacts import must be a regular file");
    }
    if (fileInfo.size > MAX_FACTS_FILE_BYTES) {
      throw new Error("TaxpayerFacts import exceeds the 1 MiB limit");
    }
    content = readFileSync(descriptor, "utf8");
  } finally {
    closeSync(descriptor);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("TaxpayerFacts import is not valid JSON");
  }
  return parseTaxpayerFactsFile(parsed);
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

function formatError(error: unknown): string {
  if (error instanceof ZodError) return formatZodError(error);
  if (error instanceof TaxPlanServiceError) {
    return `${error.code}: ${error.message}\n${error.suggestion}`;
  }
  if (error instanceof Error) return error.message;
  return "Unknown local command error";
}

export function writePrivateJsonFile(
  pathInput: string,
  value: unknown,
  overwrite: boolean,
): void {
  const path = resolve(pathInput);
  if (existsSync(path)) {
    const existing = lstatSync(path);
    if (existing.isSymbolicLink()) {
      throw new Error("TaxpayerFacts output must not be a symbolic link");
    }
    if (!existing.isFile()) {
      throw new Error("TaxpayerFacts output must be a regular file");
    }
  }
  const noFollow = platform === "win32" ? 0 : constants.O_NOFOLLOW;
  let flags = constants.O_WRONLY | constants.O_CREAT | noFollow;
  flags |= overwrite ? constants.O_TRUNC : constants.O_EXCL;
  let descriptor: number | undefined;
  try {
    descriptor = openSync(path, flags, 0o600);
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      throw new Error(`${path} already exists; use --force to replace it`);
    }
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  if (platform !== "win32") chmodSync(path, 0o600);
}

function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Questionnaire amounts must be numbers");
  return parsed === 0 ? undefined : parsed;
}

function optionalInteger(value: string | undefined): number | undefined {
  const parsed = optionalNumber(value);
  if (parsed === undefined) return undefined;
  if (!Number.isInteger(parsed)) throw new Error("Questionnaire counts must be integers");
  return parsed;
}

function optionalNumberIncludingZero(
  value: string | undefined,
): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Questionnaire amounts must be numbers");
  }
  return parsed;
}

function optionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["yes", "y", "true"].includes(normalized)) return true;
  if (["no", "n", "false"].includes(normalized)) return false;
  throw new Error("Questionnaire boolean answers must be yes or no");
}

function optionalNumberList(value: string | undefined): number[] | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const numbers = value.split(",").map((entry) => Number(entry.trim()));
  if (numbers.some((entry) => !Number.isFinite(entry) || entry < 0)) {
    throw new Error("Questionnaire expense lists must contain nonnegative numbers");
  }
  return numbers;
}

function compactObject(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

export function buildTaxpayerFactsFromAnswers(
  answers: Readonly<Record<string, string>>,
): TaxpayerFactsFile {
  const taxYear = Number(answers.taxYear);
  const filingStatus = FilingStatusSchema.parse(answers.filingStatus);
  const retirementDistributions = optionalNumber(
    answers.retirementDistributions,
  );
  const taxableRetirementDistributions = retirementDistributions === undefined
    ? undefined
    : optionalNumberIncludingZero(answers.taxableRetirementDistributions);
  const income = compactObject({
    w2: optionalNumber(answers.w2),
    selfEmployment: optionalNumber(answers.selfEmployment),
    taxableInterest: optionalNumber(answers.taxableInterest),
    ordinaryDividends: optionalNumber(answers.ordinaryDividends),
    qualifiedDividends: optionalNumber(answers.qualifiedDividends),
    shortTermCapitalGain: optionalNumber(answers.shortTermCapitalGain),
    longTermCapitalGain: optionalNumber(answers.longTermCapitalGain),
    shortTermCapitalLossCarryover:
      optionalNumber(answers.shortTermCapitalLossCarryover),
    longTermCapitalLossCarryover:
      optionalNumber(answers.longTermCapitalLossCarryover),
    other: optionalNumber(answers.other),
    socialSecurityBenefits: optionalNumber(answers.socialSecurityBenefits),
    taxExemptInterest: optionalNumber(answers.taxExemptInterest),
    retirementDistributions,
    taxableRetirementDistributions,
    earlyRetirementDistributionSubjectToPenalty:
      optionalNumber(answers.earlyRetirementDistributionSubjectToPenalty),
  });
  const deductions = compactObject({
    aboveTheLine: optionalNumber(answers.aboveTheLine),
    itemized: optionalNumber(answers.itemized),
    forceItemized: optionalBoolean(answers.forceItemized),
  });
  const family = compactObject({
    qualifyingChildrenForCtc: optionalInteger(answers.qualifyingChildrenForCtc),
    qualifyingChildrenForEitc:
      optionalInteger(answers.qualifyingChildrenForEitc),
    otherDependentsForOdc: optionalInteger(answers.otherDependentsForOdc),
    socialSecurityTaxesPaid: optionalNumber(answers.socialSecurityTaxesPaid),
    hasForm2555: optionalBoolean(answers.hasForm2555),
    marriedFilingSeparatelyLivedWithSpouse:
      optionalBoolean(answers.marriedFilingSeparatelyLivedWithSpouse),
  });
  const education = compactObject({
    aotcStudentQualifiedExpenses:
      optionalNumberList(answers.aotcStudentQualifiedExpenses),
    aotcRefundableAllowed: optionalBoolean(answers.aotcRefundableAllowed),
    lifetimeLearningQualifiedExpenses:
      optionalNumber(answers.lifetimeLearningQualifiedExpenses),
  });
  const qbi = optionalNumber(answers.qualifiedBusinessIncome);
  const business = qbi === undefined
    ? undefined
    : compactObject({
      qualifiedBusinessIncome: qbi,
      w2Wages: optionalNumber(answers.businessW2Wages) ?? 0,
      qualifiedPropertyBasis:
        optionalNumber(answers.qualifiedPropertyBasis) ?? 0,
      isSstb: optionalBoolean(answers.businessIsSstb) ?? false,
    });
  const payments = compactObject({
    federalWithholding: optionalNumber(answers.federalWithholding),
    stateWithholding: optionalNumber(answers.stateWithholding),
    estimatedPayments: optionalNumber(answers.estimatedPayments),
  });
  const stateCode = answers.stateCode?.trim().toUpperCase() || undefined;

  return TaxpayerFactsFileSchema.parse({
    schemaVersion: "1.0",
    taxYear,
    filingStatus,
    income,
    ...(Object.keys(deductions).length > 0 ? { deductions } : {}),
    ...(Object.keys(family).length > 0 ? { family } : {}),
    ...(Object.keys(education).length > 0 ? { education } : {}),
    ...(business ? { business } : {}),
    ...(stateCode ? { stateCode } : {}),
    ...(Object.keys(payments).length > 0 ? { payments } : {}),
  });
}

async function collectIntakeAnswers(io: LocalCommandIO) {
  if (!io.ask) throw new Error("Interactive intake requires a terminal");
  const answers: Record<string, string> = {};
  const ask = async (
    id: string,
    question: string,
    defaultValue = "",
  ): Promise<void> => {
    answers[id] = await io.ask?.(id, question, defaultValue) ?? defaultValue;
  };

  await ask("taxYear", "Tax year", "2026");
  await ask(
    "filingStatus",
    "Filing status: single, married_filing_jointly, married_filing_separately, or head_of_household",
    "single",
  );
  await ask("w2", "W-2 wages", "0");
  await ask("selfEmployment", "Self-employment net income", "0");
  await ask("taxableInterest", "Taxable interest", "0");
  await ask("ordinaryDividends", "Ordinary dividends", "0");
  await ask("qualifiedDividends", "Qualified dividends included above", "0");
  await ask("shortTermCapitalGain", "Net short-term capital gain or loss", "0");
  await ask("longTermCapitalGain", "Net long-term capital gain or loss", "0");
  await ask("shortTermCapitalLossCarryover", "Short-term loss carryover", "0");
  await ask("longTermCapitalLossCarryover", "Long-term loss carryover", "0");
  await ask("other", "Other modeled income or loss", "0");
  await ask("socialSecurityBenefits", "Gross Social Security benefits", "0");
  await ask("taxExemptInterest", "Tax-exempt interest", "0");
  await ask("retirementDistributions", "Gross retirement distributions", "0");
  await ask("taxableRetirementDistributions", "Taxable retirement distributions", "0");
  await ask(
    "earlyRetirementDistributionSubjectToPenalty",
    "Early-distribution amount subject to additional tax",
    "0",
  );
  await ask("aboveTheLine", "Above-the-line deductions", "0");
  await ask("itemized", "Eligible itemized deduction total", "0");
  await ask("forceItemized", "Force itemized deductions? yes or no", "no");
  await ask("qualifyingChildrenForCtc", "Qualifying children for CTC", "0");
  await ask("qualifyingChildrenForEitc", "Qualifying children for EITC", "0");
  await ask("otherDependentsForOdc", "Other dependents for ODC", "0");
  await ask("socialSecurityTaxesPaid", "Schedule 8812 payroll-tax amount", "0");
  await ask("hasForm2555", "Filing Form 2555? yes or no", "no");
  await ask(
    "marriedFilingSeparatelyLivedWithSpouse",
    "For MFS, lived with spouse during the year? yes or no",
    "no",
  );
  await ask(
    "aotcStudentQualifiedExpenses",
    "AOTC expenses per student, comma-separated",
    "",
  );
  await ask("aotcRefundableAllowed", "Refundable AOTC allowed? yes or no", "no");
  await ask("lifetimeLearningQualifiedExpenses", "Lifetime Learning expenses", "0");
  await ask("qualifiedBusinessIncome", "Qualified business income", "0");
  await ask("businessW2Wages", "Business W-2 wages", "0");
  await ask("qualifiedPropertyBasis", "Qualified property basis", "0");
  await ask("businessIsSstb", "Business is an SSTB? yes or no", "no");
  await ask("stateCode", "Optional two-letter state code", "");
  await ask("federalWithholding", "Federal withholding", "0");
  await ask("stateWithholding", "State withholding", "0");
  await ask("estimatedPayments", "Estimated payments", "0");
  return answers;
}

function localCommandHelp(): string {
  return [
    "Local privacy commands (no MCP connection and no model invocation):",
    "  irs-taxpayer-mcp intake [--output facts.json] [--force]",
    "  irs-taxpayer-mcp template [--output facts.json] [--force]",
    "  irs-taxpayer-mcp validate --facts facts.json",
    "  irs-taxpayer-mcp plan --facts facts.json [--json]",
  ].join("\n");
}

export async function runLocalCommand(
  args: readonly string[],
  io: LocalCommandIO,
): Promise<number> {
  try {
    const command = args[0];
    if (!command || !LOCAL_COMMANDS.has(command)) {
      throw new Error("Unknown local command");
    }
    if (args.includes("--help") || args.includes("-h")) {
      io.writeOut(localCommandHelp());
      return 0;
    }

    if (command === "validate") {
      assertKnownOptions(args, ["--facts"], []);
      const factsPath = readOption(args, "--facts");
      if (!factsPath) throw new Error("validate requires --facts <file>");
      readFactsFile(factsPath);
      io.writeOut("TaxpayerFacts file is valid. No values were printed.");
      return 0;
    }

    if (command === "plan") {
      assertKnownOptions(args, ["--facts"], ["--json"]);
      const factsPath = readOption(args, "--facts");
      if (!factsPath) throw new Error("plan requires --facts <file>");
      const facts = readFactsFile(factsPath);
      const result = buildTaxPlan(facts, { modelInvoked: false });
      io.writeOut(
        args.includes("--json")
          ? JSON.stringify(result.plan, null, 2)
          : result.text,
      );
      return 0;
    }

    if (command === "template") {
      assertKnownOptions(args, ["--output"], ["--force"]);
      const output = readOption(args, "--output") ?? "taxpayer-facts.json";
      const template = createTaxpayerFactsFile({
        taxYear: 2026,
        filingStatus: "single",
        income: {},
      });
      writePrivateJsonFile(output, template, args.includes("--force"));
      io.writeOut(`Created local TaxpayerFacts template at ${resolve(output)}.`);
      return 0;
    }

    assertKnownOptions(args, ["--output"], ["--force"]);
    const output = readOption(args, "--output") ?? "taxpayer-facts.json";
    const answers = await collectIntakeAnswers(io);
    const facts = buildTaxpayerFactsFromAnswers(answers);
    writePrivateJsonFile(output, facts, args.includes("--force"));
    io.writeOut(`Created local TaxpayerFacts file at ${resolve(output)}.`);
    io.writeOut("No model, network request, or telemetry was used.");
    return 0;
  } catch (error) {
    io.writeError(formatError(error));
    return 1;
  }
}
