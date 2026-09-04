import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const ThresholdsSchema = z.object({
  schemaVersion: z.literal(1),
  thresholds: z.object({
    paidDemandSignals: z.number().int().nonnegative(),
    discoveryInterviews: z.number().int().nonnegative(),
    domainPartners: z.number().int().nonnegative(),
    maintainerFte: z.number().nonnegative(),
    annualMaintenanceOwner: z.literal(true),
  }),
});

const MetricsSchema = z.object({
  paidDemandSignals: z.number().int().nonnegative(),
  discoveryInterviews: z.number().int().nonnegative(),
  domainPartners: z.number().int().nonnegative(),
  maintainerFte: z.number().nonnegative(),
  annualMaintenanceOwner: z.boolean(),
});

const metricsPath = process.argv[2];
if (!metricsPath) {
  throw new Error(
    "Usage: node scripts/evaluate-filing-gate.mjs <aggregate-metrics.json>",
  );
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const gatePath = join(
  scriptDirectory,
  "..",
  "feedback",
  "filing-engine-gate.json",
);
const gate = ThresholdsSchema.parse(
  JSON.parse(readFileSync(gatePath, "utf8")),
);
const metrics = MetricsSchema.parse(
  JSON.parse(readFileSync(metricsPath, "utf8")),
);

const unmet = [];
for (const field of [
  "paidDemandSignals",
  "discoveryInterviews",
  "domainPartners",
  "maintainerFte",
]) {
  if (metrics[field] < gate.thresholds[field]) unmet.push(field);
}
if (!metrics.annualMaintenanceOwner) unmet.push("annualMaintenanceOwner");

const decision = unmet.length === 0 ? "READY" : "BLOCKED";
console.log(JSON.stringify({ decision, unmet }));
if (decision === "BLOCKED") process.exitCode = 1;
