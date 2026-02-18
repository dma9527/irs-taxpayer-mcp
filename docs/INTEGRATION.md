# Integration Guide

## Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "irs-taxpayer": {
      "command": "npx",
      "args": ["-y", "irs-taxpayer-mcp"]
    }
  }
}
```

## Kiro

Add to `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "irs-taxpayer": {
      "command": "npx",
      "args": ["-y", "irs-taxpayer-mcp"]
    }
  }
}
```

## Cursor

Add to Cursor MCP settings:

```json
{
  "mcpServers": {
    "irs-taxpayer": {
      "command": "npx",
      "args": ["-y", "irs-taxpayer-mcp"]
    }
  }
}
```

## Docker

```bash
docker build -t irs-taxpayer-mcp .
docker run -i irs-taxpayer-mcp
```

For MCP clients that support Docker:

```json
{
  "mcpServers": {
    "irs-taxpayer": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "irs-taxpayer-mcp"]
    }
  }
}
```

## From Source

```bash
git clone https://github.com/dma9527/irs-taxpayer-mcp.git
cd irs-taxpayer-mcp
npm install
npm run build
node dist/index.js
```
