import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { evaluateFilingEngineGate } from "./lib/filing-engine-gate.mjs";

const IssueSchema = z.object({
  number: z.number().int().positive(),
  state: z.enum(["open", "closed"]),
  user: z.object({ login: z.string() }).nullable(),
  labels: z.array(z.union([
    z.string(),
    z.object({ name: z.string() }),
  ])),
  created_at: z.string(),
  closed_at: z.string().nullable(),
  pull_request: z.unknown().optional(),
});

const ResourceMetricsSchema = z.object({
  discoveryInterviews: z.number().int().nonnegative(),
  maintainerFte: z.number().nonnegative(),
  annualMaintenanceOwner: z.boolean(),
  privacyIncidents: z.number().int().nonnegative(),
});

const DownloadsSchema = z.object({
  lastWeek: z.number().int().nonnegative().nullable(),
  lastMonth: z.number().int().nonnegative().nullable(),
});

const FixtureSchema = z.object({
  now: z.string(),
  issues: z.array(IssueSchema),
  downloads: DownloadsSchema,
  metrics: ResourceMetricsSchema,
});

function labelsFor(issue) {
  return new Set(issue.labels.map((label) =>
    typeof label === "string" ? label : label.name));
}

function uniqueAuthors(issues) {
  return new Set(
    issues
      .map((issue) => issue.user?.login)
      .filter((login) => typeof login === "string"),
  ).size;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatMetric(value) {
  return value === null ? "Unavailable" : String(value);
}

function aggregateDashboard(input) {
  const now = new Date(input.now);
  if (Number.isNaN(now.getTime())) throw new Error("Invalid dashboard timestamp");
  const issues = input.issues.filter((issue) => issue.pull_request === undefined);
  const plannerFeedback = issues.filter((issue) =>
    labelsFor(issue).has("planner-feedback"));
  const reviewedPaidIssues = plannerFeedback.filter((issue) =>
    labelsFor(issue).has("paid-interest"));
  const reviewedPartnerIssues = plannerFeedback.filter((issue) =>
    labelsFor(issue).has("domain-partner"));
  const recentBoundary = new Date(now);
  recentBoundary.setUTCDate(recentBoundary.getUTCDate() - 30);
  const recentFeedback = plannerFeedback.filter((issue) =>
    new Date(issue.created_at) >= recentBoundary);
  const closedResolutionDays = plannerFeedback
    .filter((issue) => issue.closed_at !== null)
    .map((issue) => {
      const created = new Date(issue.created_at).getTime();
      const closed = new Date(issue.closed_at).getTime();
      return (closed - created) / 86_400_000;
    })
    .filter((days) => Number.isFinite(days) && days >= 0);

  const feedback = {
    total: plannerFeedback.length,
    uniqueContributors: uniqueAuthors(plannerFeedback),
    reviewedPaidDemand: uniqueAuthors(reviewedPaidIssues),
    reviewedDomainPartners: uniqueAuthors(reviewedPartnerIssues),
    medianResolutionDays: median(closedResolutionDays),
  };
  const gate = evaluateFilingEngineGate({
    paidDemandSignals: feedback.reviewedPaidDemand,
    discoveryInterviews: input.metrics.discoveryInterviews,
    domainPartners: feedback.reviewedDomainPartners,
    maintainerFte: input.metrics.maintainerFte,
    annualMaintenanceOwner: input.metrics.annualMaintenanceOwner,
    privacyIncidents: input.metrics.privacyIncidents,
  });
  const quality = {
    bugs: issues.filter((issue) => labelsFor(issue).has("bug")).length,
    dataErrors: issues.filter((issue) => labelsFor(issue).has("data-error")).length,
    openPlannerFeedback: plannerFeedback.filter((issue) => issue.state === "open").length,
    closedPlannerFeedback: plannerFeedback.filter((issue) => issue.state === "closed").length,
  };
  const snapshot = {
    generatedAt: now.toISOString(),
    month: now.toISOString().slice(0, 7),
    gate: { decision: gate.decision, unmet: gate.unmet },
    feedback,
    adoption: {
      recent30Days: recentFeedback.length,
      npmDownloadsLastWeek: input.downloads.lastWeek,
      npmDownloadsLastMonth: input.downloads.lastMonth,
    },
    resources: input.metrics,
    quality,
  };

  const ownerStatus = input.metrics.annualMaintenanceOwner ? "Yes" : "No";
  const resolution = feedback.medianResolutionDays === null
    ? "Unavailable"
    : feedback.medianResolutionDays.toFixed(1);
  const unmet = gate.unmet.length === 0 ? "None" : gate.unmet.join(", ");
  const dashboard = [
    "# Planner Feedback Dashboard",
    "",
    `Updated: ${now.toISOString()}`,
    "",
    `## Filing Engine Gate: ${gate.decision}`,
    "",
    "| Signal | Current | Required |",
    "| --- | ---: | ---: |",
    `| Reviewed paid demand | ${feedback.reviewedPaidDemand} | ${gate.thresholds.paidDemandSignals} |`,
    `| Discovery interviews | ${input.metrics.discoveryInterviews} | ${gate.thresholds.discoveryInterviews} |`,
    `| Reviewed tax-domain partners | ${feedback.reviewedDomainPartners} | ${gate.thresholds.domainPartners} |`,
    `| Engineering capacity | ${input.metrics.maintainerFte} FTE | ${gate.thresholds.maintainerFte} FTE |`,
    `| Annual maintenance owner | ${ownerStatus} | Required |`,
    `| Privacy incidents | ${input.metrics.privacyIncidents} | ${gate.thresholds.privacyIncidentsMax} |`,
    "",
    `Unmet conditions: ${unmet}`,
    "",
    "## Adoption",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Planner feedback issues | ${feedback.total} |`,
    `| Unique contributors | ${feedback.uniqueContributors} |`,
    `| New feedback in 30 days | ${recentFeedback.length} |`,
    `| npm downloads, last week | ${formatMetric(input.downloads.lastWeek)} |`,
    `| npm downloads, last month | ${formatMetric(input.downloads.lastMonth)} |`,
    "",
    "## Quality",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Open planner feedback | ${quality.openPlannerFeedback} |`,
    `| Closed planner feedback | ${quality.closedPlannerFeedback} |`,
    `| Median feedback resolution, days | ${resolution} |`,
    `| Bug issues | ${quality.bugs} |`,
    `| Data-error issues | ${quality.dataErrors} |`,
    "",
    "## Privacy",
    "",
    "This dashboard uses issue labels, unique author handles, timestamps, public npm download totals, and aggregate repository variables. It does not read or reproduce issue bodies or taxpayer facts.",
    "",
    "Paid-demand and domain-partner counts include only maintainer-reviewed labels. The filing-engine gate remains BLOCKED when any required condition is unmet.",
    "",
    "<!-- generated:planner-feedback-dashboard -->",
  ].join("\n");

  return { dashboard, snapshot };
}

async function githubRequest(path, options = {}) {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error("GH_TOKEN is required");
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${path}`);
  }
  return response.status === 204 ? null : response.json();
}

async function fetchAllIssues(repository) {
  const issues = [];
  for (let page = 1; page <= 20; page += 1) {
    const batch = z.array(IssueSchema).parse(await githubRequest(
      `/repos/${repository}/issues?state=all&per_page=100&page=${page}`,
    ));
    issues.push(...batch);
    if (batch.length < 100) break;
    if (page === 20) {
      throw new Error("Issue pagination exceeded the 2,000-item dashboard limit");
    }
  }
  return issues;
}

async function fetchDownloadCount(period) {
  try {
    const response = await fetch(
      `https://api.npmjs.org/downloads/point/${period}/irs-taxpayer-mcp`,
    );
    if (!response.ok) return null;
    const data = z.object({ downloads: z.number().int().nonnegative() })
      .parse(await response.json());
    return data.downloads;
  } catch {
    return null;
  }
}

function nonnegativeNumber(name) {
  const value = Number(process.env[name] ?? "0");
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a nonnegative number`);
  }
  return value;
}

async function loadLiveInput() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) {
    throw new Error("GITHUB_REPOSITORY must be owner/repository");
  }
  const [issues, lastWeek, lastMonth] = await Promise.all([
    fetchAllIssues(repository),
    fetchDownloadCount("last-week"),
    fetchDownloadCount("last-month"),
  ]);
  return {
    now: new Date().toISOString(),
    issues,
    downloads: { lastWeek, lastMonth },
    metrics: {
      discoveryInterviews: nonnegativeNumber("DISCOVERY_INTERVIEWS"),
      maintainerFte: nonnegativeNumber("MAINTAINER_FTE"),
      annualMaintenanceOwner:
        (process.env.ANNUAL_MAINTENANCE_OWNER ?? "false").toLowerCase() === "true",
      privacyIncidents: nonnegativeNumber("PRIVACY_INCIDENTS"),
    },
  };
}

async function updateDashboardIssue(result, issues) {
  const repository = process.env.GITHUB_REPOSITORY;
  const dashboardIssue = issues.find((issue) =>
    labelsFor(issue).has("metrics-dashboard") && issue.state === "open");
  let issueNumber;
  if (dashboardIssue) {
    issueNumber = dashboardIssue.number;
    await githubRequest(`/repos/${repository}/issues/${issueNumber}`, {
      method: "PATCH",
      body: JSON.stringify({ body: result.dashboard }),
    });
  } else {
    const created = z.object({ number: z.number().int().positive() }).parse(
      await githubRequest(`/repos/${repository}/issues`, {
        method: "POST",
        body: JSON.stringify({
          title: "[Metrics] Planner Adoption and Filing-Engine Gate",
          body: result.dashboard,
          labels: ["metrics-dashboard"],
        }),
      }),
    );
    issueNumber = created.number;
  }

  const comments = z.array(z.object({ body: z.string().nullable() })).parse(
    await githubRequest(
      `/repos/${repository}/issues/${issueNumber}/comments?per_page=100&sort=created&direction=desc`,
    ),
  );
  const marker = `<!-- planner-feedback-snapshot:${result.snapshot.month} -->`;
  if (!comments.some((comment) => comment.body?.includes(marker))) {
    await githubRequest(`/repos/${repository}/issues/${issueNumber}/comments`, {
      method: "POST",
      body: JSON.stringify({
        body: `${marker}\n${result.dashboard}`,
      }),
    });
  }

  return issueNumber;
}

const fixtureIndex = process.argv.indexOf("--fixture");
const dryRun = process.argv.includes("--dry-run") || fixtureIndex >= 0;
let input;
if (fixtureIndex >= 0) {
  const fixturePath = process.argv[fixtureIndex + 1];
  if (!fixturePath) throw new Error("--fixture requires a path");
  input = FixtureSchema.parse(JSON.parse(readFileSync(fixturePath, "utf8")));
} else {
  input = FixtureSchema.parse(await loadLiveInput());
}
const result = aggregateDashboard(input);

if (dryRun) {
  console.log(JSON.stringify(result));
} else {
  const issueNumber = await updateDashboardIssue(result, input.issues);
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) appendFileSync(summaryPath, `${result.dashboard}\n`);
  const snapshotPath = process.env.DASHBOARD_SNAPSHOT_PATH;
  if (snapshotPath) {
    writeFileSync(snapshotPath, `${JSON.stringify(result.snapshot, null, 2)}\n`);
  }
  console.log(`Updated planner feedback dashboard issue #${issueNumber}`);
}
