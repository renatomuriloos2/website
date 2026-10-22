import Link from "next/link";
import { MarkAllRead } from "@/components/AdminForms";
import { Icon } from "@/components/icons";
import { Card, Empty, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { ago } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const ctx = await requireUser();
  const { t } = getI18n();
  const list = await getRepo().listNotifications(ctx);
  return (
    <div>
      <PageHeader title={t.notif.title} actions={list.some((n) => !n.readAt) ? <MarkAllRead label={t.notif.markAll} /> : null} />
      {list.length === 0 ? (
        <Empty text={t.notif.none} />
      ) : (
        <Card bodyClass="p-0">
          <ul className="divide-y divide-fx-line">
            {list.map((n) => (
              <li key={n.id}>
                <Link href={n.href} className="flex items-start gap-4 px-5 py-4 hover:bg-fx-mist/40">
                  <div className={`mt-0.5 rounded-lg p-2 ${n.readAt ? "bg-fx-mist text-gray-400" : "bg-red-50 text-fx-red"}`}>
                    <Icon name="bell" className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm ${n.readAt ? "" : "font-bold"}`}>{n.title}</div>
                    <div className="truncate text-xs text-gray-500">{n.body}</div>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{ago(n.createdAt, t.common)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
