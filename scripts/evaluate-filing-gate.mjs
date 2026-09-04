import { readFileSync } from "node:fs";
import { evaluateFilingEngineGate } from "./lib/filing-engine-gate.mjs";

const metricsPath = process.argv[2];
if (!metricsPath) {
  throw new Error(
    "Usage: node scripts/evaluate-filing-gate.mjs <aggregate-metrics.json>",
  );
}

const evaluation = evaluateFilingEngineGate(
  JSON.parse(readFileSync(metricsPath, "utf8")),
);
const result = {
  decision: evaluation.decision,
  unmet: evaluation.unmet,
};
console.log(JSON.stringify(result));
if (evaluation.decision === "BLOCKED") process.exitCode = 1;
