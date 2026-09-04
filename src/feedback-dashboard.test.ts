import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { z } from "zod";
import { describe, expect, it } from "vitest";

const DashboardResultSchema = z.object({
  dashboard: z.string(),
  snapshot: z.object({
    gate: z.object({
      decision: z.enum(["BLOCKED", "READY"]),
      unmet: z.array(z.string()),
    }),
    feedback: z.object({
      total: z.number(),
      uniqueContributors: z.number(),
      reviewedPaidDemand: z.number(),
      reviewedDomainPartners: z.number(),
      medianResolutionDays: z.number().nullable(),
    }),
  }),
});

function runFixture(fixture: unknown) {
  const directory = mkdtempSync(join(tmpdir(), "feedback-dashboard-"));
  const path = join(directory, "fixture.json");
  writeFileSync(path, JSON.stringify(fixture));
  try {
    const execution = spawnSync(
      "node",
      ["scripts/build-feedback-dashboard.mjs", "--fixture", path, "--dry-run"],
      { encoding: "utf8" },
    );
    if (execution.error) throw execution.error;
    if (execution.status !== 0) throw new Error(execution.stderr);
    return DashboardResultSchema.parse(JSON.parse(execution.stdout));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function issue(
  number: number,
  login: string,
  labels: string[],
  createdAt: string,
  closedAt: string | null = null,
) {
  return {
    number,
    state: closedAt ? "closed" : "open",
    user: { login },
    labels: labels.map((name) => ({ name })),
    created_at: createdAt,
    closed_at: closedAt,
    body: `PRIVATE TAX FACTS FOR ISSUE ${number}`,
  };
}

describe("monthly planner feedback dashboard", () => {
  it("aggregates reviewed labels without exposing issue bodies", () => {
    const result = runFixture({
      now: "2026-09-04T16:00:00Z",
      issues: [
        issue(1, "alice", ["planner-feedback", "paid-interest"], "2026-09-01T00:00:00Z"),
        issue(2, "alice", ["planner-feedback", "paid-interest"], "2026-08-01T00:00:00Z", "2026-08-03T00:00:00Z"),
        issue(3, "bob", ["planner-feedback", "domain-partner"], "2026-08-01T00:00:00Z", "2026-08-05T00:00:00Z"),
        issue(4, "charlie", ["bug"], "2026-09-02T00:00:00Z"),
        issue(5, "dana", ["data-error"], "2026-09-03T00:00:00Z"),
      ],
      downloads: { lastWeek: 12, lastMonth: 40 },
      metrics: {
        discoveryInterviews: 2,
        maintainerFte: 1,
        annualMaintenanceOwner: false,
        privacyIncidents: 0,
      },
    });

    expect(result.snapshot.feedback).toEqual({
      total: 3,
      uniqueContributors: 2,
      reviewedPaidDemand: 1,
      reviewedDomainPartners: 1,
      medianResolutionDays: 3,
    });
    expect(result.snapshot.gate.decision).toBe("BLOCKED");
    expect(result.snapshot.gate.unmet).toContain("paidDemandSignals");
    expect(result.dashboard).not.toContain("PRIVATE TAX FACTS");
    expect(result.dashboard).toContain("Privacy incidents | 0");
  });

  it("reports READY only when reviewed demand and aggregate resources pass", () => {
    const paidIssues = Array.from({ length: 5 }, (_, index) =>
      issue(
        index + 1,
        `paid-user-${index + 1}`,
        ["planner-feedback", "paid-interest"],
        "2026-09-01T00:00:00Z",
      ));
    const result = runFixture({
      now: "2026-09-04T16:00:00Z",
      issues: [
        ...paidIssues,
        issue(10, "tax-partner", ["planner-feedback", "domain-partner"], "2026-09-01T00:00:00Z"),
      ],
      downloads: { lastWeek: 50, lastMonth: 150 },
      metrics: {
        discoveryInterviews: 3,
        maintainerFte: 2,
        annualMaintenanceOwner: true,
        privacyIncidents: 0,
      },
    });

    expect(result.snapshot.gate).toEqual({ decision: "READY", unmet: [] });
    expect(result.dashboard).toContain("Filing Engine Gate: READY");
  });
});

describe("feedback dashboard workflow", () => {
  it("runs monthly and manually with aggregate-only configuration", () => {
    const workflow = readFileSync(
      ".github/workflows/feedback-dashboard.yml",
      "utf8",
    );

    expect(workflow).toContain('cron: "0 14 1 * *"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("issues: write");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("build-feedback-dashboard.mjs");
    expect(workflow).toContain("DISCOVERY_INTERVIEWS");
    expect(workflow).toContain("PRIVACY_INCIDENTS");
    expect(workflow).not.toContain("issues: read-all");
  });
});
