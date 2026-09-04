import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { describe, expect, it } from "vitest";

const GateResultSchema = z.object({
  decision: z.enum(["BLOCKED", "READY"]),
  unmet: z.array(z.string()),
});

function evaluate(metrics: Record<string, number | boolean>) {
  const directory = mkdtempSync(join(tmpdir(), "filing-gate-"));
  const metricsPath = join(directory, "metrics.json");
  writeFileSync(metricsPath, JSON.stringify(metrics));
  try {
    const execution = spawnSync(
      "node",
      ["scripts/evaluate-filing-gate.mjs", metricsPath],
      { encoding: "utf8" },
    );
    if (execution.error) throw execution.error;
    if (execution.status !== 0 && execution.status !== 1) {
      throw new Error(execution.stderr);
    }
    return {
      result: GateResultSchema.parse(JSON.parse(execution.stdout)),
      status: execution.status,
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("filing-engine investment gate", () => {
  it("stays blocked when paid demand or resources are missing", () => {
    const result = evaluate({
      paidDemandSignals: 4,
      discoveryInterviews: 3,
      domainPartners: 1,
      maintainerFte: 1,
      annualMaintenanceOwner: false,
      privacyIncidents: 0,
    });

    expect(result.status).toBe(1);
    expect(result.result.decision).toBe("BLOCKED");
    expect(result.result.unmet).toContain("paidDemandSignals");
    expect(result.result.unmet).toContain("maintainerFte");
    expect(result.result.unmet).toContain("annualMaintenanceOwner");
  });

  it("opens only when every investment condition is met", () => {
    const result = evaluate({
      paidDemandSignals: 5,
      discoveryInterviews: 3,
      domainPartners: 1,
      maintainerFte: 2,
      annualMaintenanceOwner: true,
      privacyIncidents: 0,
    });

    expect(result).toEqual({
      result: { decision: "READY", unmet: [] },
      status: 0,
    });
  });
});
