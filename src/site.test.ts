import { existsSync, readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { TaxpayerFactsSchema } from "./facts/taxpayer-facts.js";
import { buildTaxPlan } from "./services/tax-plan-service.js";
import { createTaxServer } from "./tax-server.js";

const SITE_URL = "https://dma9527.github.io/irs-taxpayer-mcp/";
const SITE_PAGE = "site/index.html";

const PlanFacts = TaxpayerFactsSchema.parse({
  taxYear: 2026,
  filingStatus: "married_filing_jointly",
  income: { w2: 185000, longTermCapitalGain: 12000 },
  family: { qualifyingChildrenForCtc: 2, qualifyingChildrenForEitc: 2 },
});

const PLAN_LABELS = [
  "Adjusted gross income",
  "Taxable income",
  "Federal tax after refundable credits",
  "Employee FICA",
  "State tax",
  "Total modeled tax",
  "Take-home income",
];

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function stripTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const README_PLAN_LABELS = PLAN_LABELS.filter((label) => label !== "State tax");

function planLines(labels: readonly string[] = PLAN_LABELS): Map<string, string> {
  const { text } = buildTaxPlan(PlanFacts, { modelInvoked: false });
  const lines = new Map<string, string>();
  for (const label of labels) {
    const match = new RegExp(`^${label}: (.+)$`, "m").exec(text);
    if (!match?.[1]) throw new Error(`Plan output has no line for ${label}`);
    lines.set(label, match[1]);
  }
  return lines;
}

async function callTaxTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createTaxServer().connect(serverTransport);
  const client = new Client({ name: "site-test", version: "1.0.0" });
  await client.connect(clientTransport);
  const result = await client.callTool({ name, arguments: args });
  await client.close();
  const content = z.array(z.object({ text: z.string().optional() }).passthrough())
    .parse(result.content);
  return content.map((item) => item.text ?? "").join("\n");
}

const OVERCLAIMS = [
  /runs entirely on your machine/i,
  /never leaves? your (machine|device|computer)/i,
  /data never leaves/i,
];

function expectNoForbiddenStyle(content: string): void {
  expect(content).not.toMatch(/[\u2013\u2014\u2190-\u21FF]/);
  expect(content).not.toMatch(/comprehensive/i);
}

describe("landing page", () => {
  it("exists and is a complete, accessible HTML document", () => {
    expect(existsSync(SITE_PAGE)).toBe(true);
    const html = readText(SITE_PAGE);

    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('<html lang="en"');
    expect(html).toMatch(/<title>[^<]{10,}<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]{50,}"/);
    expect(html).toContain('name="viewport"');
    expect(html).toMatch(/<h1[ >]/);
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}">`);
    expect(html).toContain('property="og:image"');
    expect(existsSync("site/og.png")).toBe(true);
  });

  it("makes no third-party requests and runs no scripts", () => {
    const html = readText(SITE_PAGE);

    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<iframe/i);
    expect(html).not.toMatch(/@import/i);
    expect(html).not.toMatch(/url\(\s*['"]?https?:/i);
    expect(html).not.toMatch(/<img[^>]+src=["']https?:/i);
    expect(html).not.toMatch(/http:\/\//);

    const linkTags = [...html.matchAll(/<link\b[^>]*>/g)].map((match) => match[0]);
    for (const tag of linkTags) {
      const href = /href="([^"]*)"/.exec(tag)?.[1] ?? "";
      expect(href.startsWith("data:") || href === SITE_URL).toBe(true);
    }
  });

  it("restricts what the browser may load with a content security policy", () => {
    const html = readText(SITE_PAGE);
    const policy = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1];

    expect(policy).toBeDefined();
    expect(policy).toContain("default-src 'none'");
    expect(policy).not.toMatch(/script-src/);
    expect(policy).not.toContain("*");
  });

  it("shows the exact numbers the engine produces for the example household", () => {
    const text = stripTags(readText(SITE_PAGE));

    for (const [label, value] of planLines()) {
      const start = text.indexOf(label);
      expect(start, `${label} missing from page`).toBeGreaterThanOrEqual(0);
      expect(
        text.slice(start, start + label.length + 80),
        `${label} should be followed by ${value}`,
      ).toContain(value);
    }
  });

  it("shows the Roth conversion example the tool actually calculates", async () => {
    const text = stripTags(readText(SITE_PAGE));
    const scenario = await callTaxTool("simulate_tax_scenario", {
      taxYear: 2026,
      filingStatus: "married_filing_jointly",
      currentIncome: 150000,
      whatIfRothConversion: 30000,
    });

    expect(scenario).toContain("$15,340");
    expect(scenario).toContain("$21,940");
    expect(scenario).toContain("Tax cost of conversion: $6,600");
    for (const figure of ["$15,340", "$21,940", "$6,600"]) {
      expect(text).toContain(figure);
    }
  });

  it("states the privacy boundary honestly", () => {
    const text = stripTags(readText(SITE_PAGE));

    for (const overclaim of OVERCLAIMS) {
      expect(text).not.toMatch(overclaim);
    }
    expect(text).toContain("modelInvoked");
    expect(text).toMatch(/prompts and tool arguments/i);
    expect(text).toMatch(/not (tax preparation or )?filing software/i);
    expect(text).toContain("45");
  });

  it("links to the source and the package over HTTPS", () => {
    const html = readText(SITE_PAGE);

    expect(html).toContain('href="https://github.com/dma9527/irs-taxpayer-mcp"');
    expect(html).toContain('href="https://www.npmjs.com/package/irs-taxpayer-mcp"');
  });

  it("avoids forbidden punctuation and words", () => {
    expectNoForbiddenStyle(readText(SITE_PAGE));
  });

  it("is not shipped inside the npm package", () => {
    const packageFiles = z.object({ files: z.array(z.string()) })
      .parse(JSON.parse(readText("package.json"))).files;

    expect(packageFiles.some((entry) => entry.startsWith("site"))).toBe(false);
  });
});

describe("pages deployment workflow", () => {
  it("publishes only the site directory with least privilege", () => {
    const workflow = readText(".github/workflows/pages.yml");

    expect(workflow).toContain("path: site");
    expect(workflow).not.toMatch(/path:\s*\.\s*$/m);
    expect(workflow).toMatch(/pages: write/);
    expect(workflow).toMatch(/id-token: write/);
    expect(workflow).toMatch(/contents: read/);
    expect(workflow).not.toMatch(/contents: write/);
    expect(workflow).toContain("actions/deploy-pages@");
    expect(workflow).toContain("environment:");
  });
});

describe("localized READMEs", () => {
  const LOCALIZED = ["docs/README_zh.md", "docs/README_es.md", "docs/README_ja.md"];

  it("leads the English README with the live site and the verified example", () => {
    const readme = readText("README.md");

    expect(readme).toContain(SITE_URL);
    for (const value of planLines(README_PLAN_LABELS).values()) {
      expect(readme).toContain(value);
    }
  });

  it.each(LOCALIZED)("%s follows the new structure with verified numbers", (path) => {
    const readme = readText(path);

    expect(readme).toContain("npm install --global irs-taxpayer-mcp");
    expect(readme).toContain("irs-taxpayer-mcp intake --output taxpayer-facts.json");
    expect(readme).toContain("irs-taxpayer-mcp plan --facts taxpayer-facts.json");
    expect(readme).toContain("modelInvoked");
    expect(readme).toContain(SITE_URL);
    for (const value of planLines(README_PLAN_LABELS).values()) {
      expect(readme).toContain(value);
    }
    expect(readme).toContain("$6,600");
    expect(readme).toContain("45");
    expect(readme).toContain("TY2026");
    expect(readme).toContain("(../README.md)");
  });

  it.each(LOCALIZED)("%s avoids privacy overclaims and forbidden style", (path) => {
    const readme = readText(path);

    for (const overclaim of OVERCLAIMS) {
      expect(readme).not.toMatch(overclaim);
    }
    expectNoForbiddenStyle(readme);
  });
});
