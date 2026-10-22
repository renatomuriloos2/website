#!/usr/bin/env node
// Fanatics QC Lab — MCP server (stdio). Read-only: it can only call the BI API
// with a key created by an admin in "BI & API". Configure with env vars:
//   FXQC_URL      https://qc.yourdomain.com
//   FXQC_API_KEY  fxqc_…
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.FXQC_URL || "").replace(/\/$/, "");
const KEY = process.env.FXQC_API_KEY || "";
if (!BASE || !/^fxqc_[a-f0-9]{48}$/.test(KEY)) {
  console.error("Set FXQC_URL and FXQC_API_KEY (fxqc_…) environment variables.");
  process.exit(1);
}

async function get(dataset) {
  const res = await fetch(`${BASE}/api/v1/${dataset}`, { headers: { Authorization: `Bearer ${KEY}` } });
  if (!res.ok) throw new Error(`API ${dataset}: HTTP ${res.status}`);
  return (await res.json()).data;
}
const out = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });

const server = new McpServer({ name: "fanatics-qc-lab", version: "0.1.0" });

server.tool("get_kpis", "Global QC KPIs: lots, pipeline, approved, concessions, rejected, Right First Time %, approval %, cycle time, avg grade.", {}, async () => out(await get("kpis")));

server.tool("supplier_scorecard", "Scorecard per mill/supplier (lots, RFT %, approvals, rejections, cycle time).", {}, async () => out(await get("suppliers")));

server.tool(
  "list_lots",
  "List fabric lots with status, max safe decoration temperature and verdict per decoration method.",
  { status: z.string().optional().describe("approved | approved_concession | rejected | retest | in_review | submitted | on_hold"), supplier_code: z.string().optional(), limit: z.number().int().min(1).max(500).optional() },
  async ({ status, supplier_code, limit }) => {
    let rows = await get("lots");
    if (status) rows = rows.filter((r) => r.status === status);
    if (supplier_code) rows = rows.filter((r) => String(r.supplier_code).toLowerCase() === supplier_code.toLowerCase());
    return out(rows.slice(0, limit ?? 100));
  }
);

server.tool("get_lot", "Full detail of one lot by reference (e.g. QC-2026-0142): lot row, per-color verdicts and all readings.", { lot_ref: z.string() }, async ({ lot_ref }) => {
  const [lots, colors, results] = await Promise.all([get("lots"), get("colors"), get("results")]);
  const lot = lots.find((l) => l.lot_ref === lot_ref);
  if (!lot) return out({ error: "not_found" });
  return out({ lot, colors: colors.filter((c) => c.lot_ref === lot_ref), readings: results.filter((r) => r.lot_ref === lot_ref) });
});

server.tool("failing_tests", "Readings that failed the Fanatics minimum, optionally for one supplier.", { supplier_code: z.string().optional() }, async ({ supplier_code }) => {
  let rows = (await get("results")).filter((r) => r.pass === false);
  if (supplier_code) rows = rows.filter((r) => String(r.supplier_code).toLowerCase() === supplier_code.toLowerCase());
  return out(rows.slice(0, 300));
});

server.tool("get_protocol", "Test methods (AATCC/ISO/ASTM/Fanatics), readings and default minimums, and which decoration methods require them.", {}, async () => out(await get("protocol")));

await server.connect(new StdioServerTransport());
