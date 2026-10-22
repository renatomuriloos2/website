"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "./Brand";
import { Icon } from "./icons";
import { cx } from "./ui";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}
export interface NavSection {
  title: string;
  items: NavItem[];
}

function NavLinks({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6">
      {sections.map((s) => (
        <div key={s.title}>
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{s.title}</div>
          <ul className="space-y-0.5">
            {s.items.map((i) => {
              const active = pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href));
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={onNavigate}
                    className={cx(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {active && <span className="absolute left-0 top-2 h-[calc(100%-16px)] w-[3px] rounded-r bg-fx-red" />}
                    <Icon name={i.icon} className={cx("h-[18px] w-[18px]", active ? "text-fx-red" : "")} />
                    <span className="flex-1">{i.label}</span>
                    {i.badge ? <span className="rounded-full bg-fx-red px-1.5 py-0.5 text-[10px] font-bold text-white">{i.badge}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ sections, footer }: { sections: NavSection[]; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <aside className="fx-stripes fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-fx-black px-4 py-6 lg:flex">
        <div className="mb-8 px-2">
          <Brand />
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <NavLinks sections={sections} />
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">{footer}</div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-fx-black px-4 py-3 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Menu">
          <Icon name="menu" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="fx-stripes absolute inset-y-0 left-0 flex w-72 flex-col bg-fx-black px-4 py-6">
            <div className="mb-8 flex items-center justify-between px-2">
              <Brand />
              <button onClick={() => setOpen(false)} className="text-white/60" aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks sections={sections} onNavigate={() => setOpen(false)} />
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">{footer}</div>
          </aside>
        </div>
      )}
    </>
  );
}
