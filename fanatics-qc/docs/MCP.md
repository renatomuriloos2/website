# MCP server (AI agents, Fanatics IT automations)

`mcp/server.mjs` is a **read-only** [Model Context Protocol](https://modelcontextprotocol.io)
server. It wraps the BI API, so it can only see what an API key can see and it can never
change data. Fanatics IT can use it with Claude Desktop, Claude Code or any MCP client to ask
questions such as *"Which Tegra lots are approved only with concession and why?"*.

## Tools

| Tool | Description |
| --- | --- |
| `get_kpis` | Global KPIs (RFT, approval rate, cycle time…) |
| `supplier_scorecard` | Scorecard per mill |
| `list_lots` | Lots filtered by status / supplier |
| `get_lot` | One lot with per-color verdicts and all readings |
| `failing_tests` | Readings below the Fanatics minimum |
| `get_protocol` | Test methods and default minimums |

## Setup

```bash
cd mcp
npm install
```

Claude Desktop → `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fanatics-qc-lab": {
      "command": "node",
      "args": ["/absolute/path/to/fanatics-qc/mcp/server.mjs"],
      "env": {
        "FXQC_URL": "https://your-app.vercel.app",
        "FXQC_API_KEY": "fxqc_…"
      }
    }
  }
}
```

Create a **dedicated API key** per agent/integration (BI & API) so it can be revoked
independently; every key shows its last-use time.
