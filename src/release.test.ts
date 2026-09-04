import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SERVER_VERSION } from "./tax-server.js";

const PackageMetadataSchema = z.object({
  version: z.string(),
  mcpName: z.string(),
});

const ServerMetadataSchema = z.object({
  name: z.string(),
  version: z.string(),
  packages: z.array(z.object({ version: z.string() })),
});

const PackEntrySchema = z.object({
  filename: z.string(),
  shasum: z.string(),
});

function parsePackResult(input: unknown) {
  const execution = spawnSync(
    "node",
    ["scripts/read-pack-result.mjs"],
    { input: JSON.stringify(input), encoding: "utf8" },
  );
  if (execution.error) throw execution.error;
  if (execution.status !== 0) throw new Error(execution.stderr);
  return PackEntrySchema.parse(JSON.parse(execution.stdout));
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("release metadata", () => {
  it("keeps package, server, and runtime versions aligned", () => {
    const packageMetadata = PackageMetadataSchema.parse(readJson("package.json"));
    const serverMetadata = ServerMetadataSchema.parse(readJson("server.json"));

    expect(serverMetadata.name).toBe(packageMetadata.mcpName);
    expect(serverMetadata.version).toBe(packageMetadata.version);
    expect(serverMetadata.packages).toHaveLength(1);
    expect(serverMetadata.packages[0]?.version).toBe(packageMetadata.version);
    expect(SERVER_VERSION).toBe(packageMetadata.version);
  });
});

describe("secure release workflow", () => {
  it("publishes all registries from a version tag with OIDC", () => {
    const workflow = readFileSync(".github/workflows/publish.yml", "utf8");

    expect(workflow).toContain("tags:");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("npm audit --omit=dev");
    expect(workflow).toContain("npm pack");
    expect(workflow).toContain("release-smoke");
    expect(workflow).toContain("npm publish");
    expect(workflow).toContain("mcp-publisher login github-oidc");
    expect(workflow).toContain("mcp-publisher publish");
    expect(workflow).toContain("gh release create");
    expect(workflow).not.toContain("NPM_TOKEN");
  });
});

describe("npm pack metadata", () => {
  const entry = {
    filename: "irs-taxpayer-mcp-1.0.0.tgz",
    shasum: "5c94de3d0c6bd76d554e7103f37b991beaa1c282",
  };

  it.each([
    { name: "npm 11 array", input: [entry] },
    { name: "npm 12 keyed object", input: { "irs-taxpayer-mcp": entry } },
  ])("parses $name output", ({ input }) => {
    expect(parsePackResult(input)).toEqual(entry);
  });
});
