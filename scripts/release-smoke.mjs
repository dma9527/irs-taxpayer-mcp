import { spawn } from "node:child_process";
import { z } from "zod";

const InitializeResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.literal(1),
  result: z.object({
    serverInfo: z.object({
      name: z.literal("irs-taxpayer-mcp"),
      version: z.string(),
    }),
  }),
});

const binary = process.argv[2];
const expectedVersion = process.argv[3];

if (!binary || !expectedVersion) {
  throw new Error("Usage: node scripts/release-smoke.mjs <binary> <version>");
}

const request = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: {
      name: "release-smoke",
      version: "1.0.0",
    },
  },
});

const child = spawn(binary, [], {
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";

await new Promise((resolve, reject) => {
  let settled = false;
  const finish = (callback) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    callback();
  };
  const timeout = setTimeout(() => {
    finish(() => reject(new Error(`Timed out waiting for MCP response: ${stderr}`)));
    child.kill("SIGTERM");
  }, 30_000);

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    const newlineIndex = stdout.indexOf("\n");
    if (newlineIndex < 0) return;
    const firstLine = stdout.slice(0, newlineIndex).trim();
    if (!firstLine) return;

    try {
      const response = InitializeResponseSchema.parse(JSON.parse(firstLine));
      if (response.result.serverInfo.version !== expectedVersion) {
        throw new Error(
          `Expected server version ${expectedVersion}, received ${response.result.serverInfo.version}`,
        );
      }
      finish(resolve);
      child.kill("SIGTERM");
    } catch (error) {
      finish(() => reject(error));
      child.kill("SIGTERM");
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.once("error", (error) => finish(() => reject(error)));
  child.once("close", (code) => {
    if (!settled) {
      finish(() => reject(new Error(`MCP server exited with ${code}: ${stderr}`)));
    }
  });

  child.stdin.end(`${request}\n`);
});

console.log(`release-smoke PASS: irs-taxpayer-mcp ${expectedVersion}`);
