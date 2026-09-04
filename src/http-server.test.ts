import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  createHttpApp,
  isOriginAllowed,
  parseCliOptions,
} from "./http-server.js";

const activeServers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    activeServers.splice(0).map(
      (server) => new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      }),
    ),
  );
});

describe("parseCliOptions", () => {
  it("defaults to stdio and localhost", () => {
    expect(parseCliOptions([])).toEqual({
      transport: "stdio",
      host: "127.0.0.1",
      port: 3000,
      allowedOrigins: [],
    });
  });

  it("supports Streamable HTTP and the legacy SSE alias", () => {
    expect(parseCliOptions(["--http", "--port", "8080"]).transport).toBe("http");
    expect(parseCliOptions(["--sse"]).transport).toBe("http");
  });

  it("rejects non-loopback binding", () => {
    expect(() => parseCliOptions(["--http", "--host", "0.0.0.0"]))
      .toThrow("HTTP transport only supports loopback hosts");
  });

  it("rejects malformed allowed Origins", () => {
    expect(() => parseCliOptions(["--http", "--allowed-origin", "null"]))
      .toThrow("--allowed-origin must be an HTTP or HTTPS Origin");
    expect(() => parseCliOptions([
      "--http",
      "--allowed-origin",
      "https://trusted.example/path",
    ])).toThrow("--allowed-origin must not include a path, query, or fragment");
  });
});

describe("Origin validation", () => {
  it("allows requests without Origin and exact allowlisted origins", () => {
    const allowedOrigins = ["http://localhost:3000"];
    expect(isOriginAllowed(undefined, allowedOrigins)).toBe(true);
    expect(isOriginAllowed("http://localhost:3000", allowedOrigins)).toBe(true);
    expect(isOriginAllowed("https://attacker.example", allowedOrigins)).toBe(false);
  });

  it("returns dynamic health metadata and rejects untrusted origins", async () => {
    const app = createHttpApp({
      transport: "http",
      host: "127.0.0.1",
      port: 0,
      allowedOrigins: [],
    });
    const httpServer = app.listen(0, "127.0.0.1");
    activeServers.push(httpServer);
    await new Promise<void>((resolve) => httpServer.once("listening", resolve));

    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP server address");
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const healthResponse = await fetch(`${baseUrl}/health`);
    expect(healthResponse.status).toBe(200);
    expect(await healthResponse.json()).toEqual({
      status: "ok",
      tools: 43,
      transport: "streamable-http",
      host: "127.0.0.1",
    });

    const rejectedResponse = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "https://attacker.example" },
    });
    expect(rejectedResponse.status).toBe(403);
  });

  it("completes a Streamable HTTP handshake and lists all tools", async () => {
    const app = createHttpApp({
      transport: "http",
      host: "127.0.0.1",
      port: 0,
      allowedOrigins: [],
    });
    const httpServer = app.listen(0, "127.0.0.1");
    activeServers.push(httpServer);
    await new Promise<void>((resolve) => httpServer.once("listening", resolve));

    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP server address");
    }

    const client = new Client({ name: "http-test-client", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${address.port}/mcp`),
    );
    await client.connect(transport);
    const tools = await client.listTools();
    expect(tools.tools).toHaveLength(43);
    await client.close();
  });
});
