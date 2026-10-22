import { ApiKeyForm, RevokeKey } from "@/components/AdminForms";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { APP_URL } from "@/lib/env";
import { fmtDateTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "BI & API" };

const ENDPOINTS = [
  ["/api/v1/kpis", "KPI snapshot: RFT, approval rate, cycle time"],
  ["/api/v1/suppliers", "Supplier scorecard"],
  ["/api/v1/lots", "Lots with status, max safe temp, verdicts per method"],
  ["/api/v1/colors", "One row per lot × color with per-color verdicts"],
  ["/api/v1/results", "Flattened test readings with pass/fail (one row per reading)"],
  ["/api/v1/protocol", "Test methods, decoration methods and requirements"],
];

export default async function IntegrationsPage() {
  const ctx = await requireUser(["admin"]);
  const { t, locale } = getI18n();
  const keys = await getRepo().listApiKeys(ctx);
  return (
    <div className="space-y-6">
      <PageHeader kicker="Power BI · Excel · Snowflake · MCP" title={t.nav.integrations} subtitle={t.settings.apiHint} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t.settings.apiKeys}>
          <ApiKeyForm />
          <ul className="mt-5 divide-y divide-fx-line">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-semibold">{k.name}</div>
                  <div className="font-mono text-xs text-gray-500">{k.prefix}… · {fmtDateTime(k.createdAt, locale)} · last used {fmtDateTime(k.lastUsedAt, locale)}</div>
                </div>
                {k.revokedAt ? <Badge tone="neutral">revoked</Badge> : <RevokeKey id={k.id} label={t.settings.revoke} />}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t.settings.endpoints} subtitle="Authorization: Bearer fxqc_… · ?format=csv|json">
          <ul className="space-y-2">
            {ENDPOINTS.map(([path, desc]) => (
              <li key={path} className="rounded-xl bg-fx-mist p-3">
                <code className="text-xs font-bold">GET {APP_URL}{path}</code>
                <div className="text-xs text-gray-500">{desc}</div>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl bg-fx-ink p-4 font-mono text-[11px] leading-relaxed text-white/90">
            <div className="mb-1 text-white/50">{"// Power BI → Get data → Web → Advanced"}</div>
            URL: {APP_URL}/api/v1/lots?format=csv
            <br />
            Header: Authorization = Bearer fxqc_xxxxxxxx
            <div className="mb-1 mt-3 text-white/50">{"// or PostgreSQL connector → schema “bi” (read-only role bi_reader)"}</div>
            Views: bi.lots · bi.test_readings · bi.supplier_scorecard
          </div>
        </Card>
      </div>
    </div>
  );
}
