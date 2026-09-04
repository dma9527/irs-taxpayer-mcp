/**
 * End-to-end smoke test.
 * Spawns the actual MCP server process, sends real MCP protocol messages
 * via stdio, and verifies responses.
 */

import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";

interface McpResponse {
  jsonrpc: string;
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

function sendMcpMessage(proc: ReturnType<typeof spawn>, message: Record<string, unknown>): Promise<McpResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout waiting for MCP response")), 10000);
    let buffer = "";

    const onData = (chunk: Buffer): void => {
      buffer += chunk.toString();
      // MCP uses newline-delimited JSON
      const lines = buffer.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as McpResponse;
          if (parsed.id === (message as { id?: number }).id) {
            clearTimeout(timeout);
            proc.stdout?.off("data", onData);
            resolve(parsed);
            return;
          }
        } catch {
          // not valid JSON yet, keep buffering
        }
      }
    };

    proc.stdout?.on("data", onData);
    proc.stdin?.write(JSON.stringify(message) + "\n");
  });
}

describe("E2E Smoke Test", () => {
  it("server starts, initializes, lists tools, and calls a tool", async () => {
    const proc = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    try {
      // Step 1: Initialize
      const initResponse = await sendMcpMessage(proc, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "e2e-test", version: "1.0.0" },
        },
      });

      expect(initResponse.result).toBeDefined();
      const serverInfo = initResponse.result as { serverInfo?: { name: string } };
      expect(serverInfo.serverInfo?.name).toBe("irs-taxpayer-mcp");

      // Step 2: Send initialized notification
      proc.stdin?.write(JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }) + "\n");

      // Step 3: List tools
      const toolsResponse = await sendMcpMessage(proc, {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      });

      expect(toolsResponse.result).toBeDefined();
      const toolsResult = toolsResponse.result as {
        tools: Array<{
          name: string;
          outputSchema?: Record<string, unknown>;
          annotations?: {
            readOnlyHint?: boolean;
            destructiveHint?: boolean;
            idempotentHint?: boolean;
            openWorldHint?: boolean;
          };
        }>;
      };
      const toolNames = toolsResult.tools.map((tool) => tool.name);

      // Verify key tools exist
      expect(toolNames).toContain("calculate_federal_tax");
      expect(toolNames).toContain("generate_full_tax_report");
      expect(toolNames).toContain("simulate_tax_scenario");
      expect(toolNames).toContain("assess_audit_risk");
      expect(toolNames.length).toBe(43);
      for (const tool of toolsResult.tools) {
        expect(tool.outputSchema).toBeDefined();
        expect(tool.annotations).toEqual({
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        });
      }
      expect(toolsResult.tools).toMatchSnapshot("all tool contracts");

      // Step 4: Call a tool
      const callResponse = await sendMcpMessage(proc, {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "get_tax_brackets",
          arguments: { taxYear: 2024, filingStatus: "single" },
        },
      });

      expect(callResponse.result).toBeDefined();
      const callResult = callResponse.result as {
        content: Array<{ type: string; text: string }>;
        structuredContent?: { text?: string; isError?: boolean };
      };
      expect(callResult.content).toBeDefined();
      expect(callResult.content[0].type).toBe("text");
      expect(callResult.content[0].text).toContain("Tax Brackets");
      expect(callResult.content[0].text).toContain("10%");
      expect(callResult.content[0].text).toContain("37%");
      expect(callResult.structuredContent).toEqual({
        text: callResult.content[0].text,
        isError: false,
      });

      const errorResponse = await sendMcpMessage(proc, {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "calculate_federal_tax",
          arguments: {
            taxYear: 2020,
            filingStatus: "single",
            grossIncome: 50000,
          },
        },
      });
      const errorResult = errorResponse.result as {
        isError?: boolean;
        structuredContent?: {
          isError?: boolean;
          error?: { code?: string };
        };
      };
      expect(errorResult.isError).toBe(true);
      expect(errorResult.structuredContent?.isError).toBe(true);
      expect(errorResult.structuredContent?.error?.code).toBe("UNSUPPORTED_TAX_YEAR");

      const unavailableWorksheetResponse = await sendMcpMessage(proc, {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "calculate_federal_tax",
          arguments: {
            taxYear: 2025,
            filingStatus: "single",
            grossIncome: 40000,
            socialSecurityBenefits: 10000,
            hasForm2555: true,
          },
        },
      });
      const unavailableWorksheetResult = unavailableWorksheetResponse.result as {
        structuredContent?: { error?: { code?: string } };
      };
      expect(unavailableWorksheetResult.structuredContent?.error?.code)
        .toBe("CALCULATION_ERROR");

    } finally {
      proc.kill();
    }
  }, 15000);
});
