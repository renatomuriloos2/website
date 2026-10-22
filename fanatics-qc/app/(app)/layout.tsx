import Link from "next/link";
import { Icon } from "@/components/icons";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Sidebar, type NavSection } from "@/components/Sidebar";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo, isStaff } from "@/lib/data";
import { signOutAction } from "@/lib/actions/session";
import { isDemo } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireUser();
  const { t } = getI18n();
  const repo = getRepo();
  const [notifs, lots, suppliers] = await Promise.all([repo.listNotifications(ctx), repo.listLots(ctx), repo.listSuppliers(ctx)]);
  const unread = notifs.filter((n) => !n.readAt).length;
  const staff = isStaff(ctx.user);
  const admin = ctx.user.role === "admin";
  const queue = lots.filter((l) => l.status === "submitted").length;
  const mySupplier = ctx.user.supplierId ? suppliers.find((s) => s.id === ctx.user.supplierId) : null;

  const sections: NavSection[] = [
    {
      title: t.nav.sectionOps,
      items: [
        { href: "/dashboard", label: t.nav.dashboard, icon: "dashboard" },
        { href: "/board", label: t.nav.board, icon: "board", badge: staff ? queue : undefined },
        { href: "/lots", label: t.nav.lots, icon: "lots" },
        { href: "/fabrics", label: t.nav.fabrics, icon: "fabric" },
        ...(staff ? [{ href: "/suppliers", label: t.nav.suppliers, icon: "supplier" }] : []),
      ],
    },
    { title: t.nav.sectionLibrary, items: [{ href: "/protocols", label: t.nav.protocols, icon: "protocol" }] },
    {
      title: t.nav.sectionAdmin,
      items: [
        ...(admin
          ? [
              { href: "/users", label: t.nav.users, icon: "users" },
              { href: "/audit", label: t.nav.audit, icon: "shield" },
              { href: "/integrations", label: t.nav.integrations, icon: "plug" },
            ]
          : []),
        { href: "/settings", label: t.nav.settings, icon: "settings" },
      ],
    },
  ];

  const roleLabel = ctx.user.role === "admin" ? t.users.roleAdmin : ctx.user.role === "reviewer" ? t.users.roleReviewer : mySupplier?.name ?? t.users.roleSupplier;

  const footer = (
    <div className="flex items-center gap-3 px-1">
      <Avatar name={ctx.user.fullName} src={mySupplier?.logoUrl} size={34} rounded="rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{ctx.user.fullName}</div>
        <div className="truncate text-[11px] text-white/45">{roleLabel}</div>
      </div>
      <form action={signOutAction}>
        <button className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white" title={t.nav.signOut} aria-label={t.nav.signOut}>
          <Icon name="logout" className="h-4 w-4" />
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="no-print">
        <Sidebar sections={sections} footer={footer} />
      </div>
      <div className="lg:pl-64">
        {isDemo() && (
          <div className="no-print bg-gradient-to-r from-amber-400 to-amber-300 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">{t.app.demo}</div>
        )}
        <header className="no-print sticky top-0 z-20 hidden items-center justify-end gap-3 border-b border-fx-line bg-[#f4f5f7]/85 px-8 py-3 backdrop-blur lg:flex">
          <LocaleSwitch />
          <Link href="/notifications" className="relative rounded-xl border border-fx-line bg-white p-2 text-gray-600 hover:text-fx-ink" aria-label={t.nav.notifications}>
            <Icon name="bell" className="h-[18px] w-[18px]" />
            {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-fx-red px-1 text-[10px] font-bold text-white">{unread}</span>}
          </Link>
        </header>
        <div className="no-print flex items-center justify-end gap-2 px-4 pt-3 lg:hidden">
          <LocaleSwitch />
          <Link href="/notifications" className="relative rounded-xl border border-fx-line bg-white p-2 text-gray-600">
            <Icon name="bell" className="h-4 w-4" />
            {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-fx-red px-1 text-[10px] font-bold text-white">{unread}</span>}
          </Link>
        </div>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
