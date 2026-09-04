import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Server } from "node:http";
import { createTaxServer, TOOL_COUNT } from "./tax-server.js";

export interface CliOptions {
  transport: "stdio" | "http";
  host: "127.0.0.1" | "localhost" | "::1";
  port: number;
  allowedOrigins: string[];
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function isLoopbackHost(value: string): value is CliOptions["host"] {
  return LOOPBACK_HOSTS.has(value);
}

function validateAllowedOrigin(value: string): string {
  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(value);
  } catch {
    throw new Error("--allowed-origin must be an HTTP or HTTPS Origin");
  }

  if (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") {
    throw new Error("--allowed-origin must be an HTTP or HTTPS Origin");
  }
  if (parsedOrigin.origin !== value) {
    throw new Error("--allowed-origin must not include a path, query, or fragment");
  }
  return value;
}

function readOptionValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

export function parseCliOptions(args: string[]): CliOptions {
  let transport: CliOptions["transport"] = "stdio";
  let host: CliOptions["host"] = "127.0.0.1";
  let port = 3000;
  const allowedOrigins: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--http" || argument === "--sse") {
      transport = "http";
      continue;
    }
    if (argument === "--port") {
      const value = readOptionValue(args, index, argument);
      port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("--port must be an integer from 1 to 65535");
      }
      index += 1;
      continue;
    }
    if (argument === "--host") {
      const value = readOptionValue(args, index, argument);
      if (!isLoopbackHost(value)) {
        throw new Error(
          "HTTP transport only supports loopback hosts: 127.0.0.1, localhost, or ::1",
        );
      }
      host = value;
      index += 1;
      continue;
    }
    if (argument === "--allowed-origin") {
      const value = readOptionValue(args, index, argument);
      allowedOrigins.push(validateAllowedOrigin(value));
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }

  return { transport, host, port, allowedOrigins };
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  return origin === undefined || allowedOrigins.includes(origin);
}

function getAllowedOrigins(options: CliOptions): string[] {
  const defaultOrigins = [
    `http://127.0.0.1:${options.port}`,
    `http://localhost:${options.port}`,
    `http://[::1]:${options.port}`,
  ];
  return [...new Set([...defaultOrigins, ...options.allowedOrigins])];
}

export function createHttpApp(options: CliOptions) {
  const allowedOrigins = getAllowedOrigins(options);
  const app = createMcpExpressApp({ host: options.host });

  app.use((request, response, next) => {
    const origin = request.headers.origin;
    if (!isOriginAllowed(origin, allowedOrigins)) {
      response.status(403).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Origin is not allowed" },
        id: null,
      });
      return;
    }

    response.setHeader("Vary", "Origin");
    if (origin) {
      response.setHeader("Access-Control-Allow-Origin", origin);
    }
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
    );
    next();
  });

  app.options("/mcp", (_request, response) => {
    response.status(204).end();
  });

  app.post("/mcp", async (request, response) => {
    const requestServer = createTaxServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    let closed = false;
    const closeResources = async (): Promise<void> => {
      if (closed) return;
      closed = true;
      await transport.close();
      await requestServer.close();
    };

    response.on("close", () => {
      void closeResources();
    });

    try {
      await requestServer.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error: unknown) {
      console.error("Streamable HTTP request failed:", error);
      if (!response.headersSent) {
        response.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
      await closeResources();
    }
  });

  const methodNotAllowed = (_request: unknown, response: {
    status: (statusCode: number) => {
      json: (body: object) => void;
    };
  }): void => {
    response.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed" },
      id: null,
    });
  };
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      tools: TOOL_COUNT,
      transport: "streamable-http",
      host: options.host,
    });
  });

  app.use((_request, response) => {
    response.status(404).json({
      error: "Not found. Use POST /mcp for MCP requests or GET /health for status.",
    });
  });

  return app;
}

export async function startHttpServer(options: CliOptions): Promise<Server> {
  const app = createHttpApp(options);
  return await new Promise<Server>((resolve, reject) => {
    const httpServer = app.listen(options.port, options.host, () => resolve(httpServer));
    httpServer.once("error", reject);
  });
}
