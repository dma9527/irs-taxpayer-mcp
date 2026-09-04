import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const GateConfigSchema = z.object({
  schemaVersion: z.literal(1),
  thresholds: z.object({
    paidDemandSignals: z.number().int().nonnegative(),
    discoveryInterviews: z.number().int().nonnegative(),
    domainPartners: z.number().int().nonnegative(),
    maintainerFte: z.number().nonnegative(),
    annualMaintenanceOwner: z.literal(true),
    privacyIncidentsMax: z.number().int().nonnegative(),
  }),
});

export const GateMetricsSchema = z.object({
  paidDemandSignals: z.number().int().nonnegative(),
  discoveryInterviews: z.number().int().nonnegative(),
  domainPartners: z.number().int().nonnegative(),
  maintainerFte: z.number().nonnegative(),
  annualMaintenanceOwner: z.boolean(),
  privacyIncidents: z.number().int().nonnegative(),
});

export function loadFilingEngineGate() {
  const libraryDirectory = dirname(fileURLToPath(import.meta.url));
  const gatePath = join(
    libraryDirectory,
    "..",
    "..",
    "feedback",
    "filing-engine-gate.json",
  );
  return GateConfigSchema.parse(
    JSON.parse(readFileSync(gatePath, "utf8")),
  );
}

export function evaluateFilingEngineGate(metricsInput) {
  const gate = loadFilingEngineGate();
  const metrics = GateMetricsSchema.parse(metricsInput);
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
  if (metrics.privacyIncidents > gate.thresholds.privacyIncidentsMax) {
    unmet.push("privacyIncidents");
  }
  return {
    decision: unmet.length === 0 ? "READY" : "BLOCKED",
    unmet,
    metrics,
    thresholds: gate.thresholds,
  };
}
