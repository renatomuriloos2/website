"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { moveLotAction } from "@/lib/actions/lots";
import { BOARD_COLUMNS, STATUS_MAP } from "@/lib/domain/catalog";
import type { LotStatus } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { TONE_HEX, cx } from "./ui";

export interface BoardCard {
  id: string;
  ref: string;
  status: LotStatus;
  supplier: string;
  supplierLogo: string | null;
  fabric: string;
  swatch: string | null;
  colorHex: string;
  program: string;
  methods: string[];
  completeness: number;
  suggested: LotStatus;
  maxSafe: number | null;
  isRetest: boolean;
  age: string;
}

export function KanbanBoard({ cards, canMove }: { cards: BoardCard[]; canMove: boolean }) {
  const { t, locale } = useI18n();
  const [pending, start] = useTransition();
  const [optimistic, move] = useOptimistic(cards, (state, { id, status }: { id: string; status: LotStatus }) => state.map((c) => (c.id === id ? { ...c, status } : c)));

  const drop = (id: string, status: LotStatus) => {
    const card = optimistic.find((c) => c.id === id);
    if (!card || card.status === status) return;
    start(async () => {
      move({ id, status });
      await moveLotAction(id, status);
    });
  };

  return (
    <div className={cx("scrollbar-thin -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8", pending && "cursor-progress")}>
      {BOARD_COLUMNS.map((col) => {
        const items = optimistic.filter((c) => c.status === col);
        const meta = STATUS_MAP[col];
        return (
          <section
            key={col}
            onDragOver={(e) => canMove && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              drop(e.dataTransfer.getData("text/plain"), col);
            }}
            className="flex w-[290px] shrink-0 flex-col rounded-2xl bg-white/60 ring-1 ring-fx-line"
          >
            <header className="flex items-center justify-between rounded-t-2xl px-4 py-3" style={{ borderTop: `3px solid ${TONE_HEX[meta.tone]}` }}>
              <h2 className="text-sm font-bold">{meta.label[locale]}</h2>
              <span className="rounded-full bg-fx-mist px-2 py-0.5 text-xs font-bold tabular-nums text-gray-600">{items.length}</span>
            </header>
            <div className="flex min-h-[200px] flex-1 flex-col gap-2.5 p-2.5">
              {items.map((c) => (
                <article
                  key={c.id}
                  draggable={canMove}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                  className={cx("group rounded-xl border border-fx-line bg-white p-3 shadow-sm transition hover:shadow-card", canMove && "cursor-grab active:cursor-grabbing")}
                >
                  <div className="flex gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.swatch ? <img src={c.swatch} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: c.colorHex }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/lots/${c.id}`} className="flex items-center gap-1.5 text-sm font-bold hover:text-fx-red">
                        {c.ref}
                        {c.isRetest && <span className="rounded bg-violet-100 px-1 text-[9px] font-bold text-violet-700">RETEST</span>}
                      </Link>
                      <div className="truncate text-xs text-gray-500">{c.fabric}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.supplierLogo && <img src={c.supplierLogo} alt="" className="h-4 w-4 rounded" />}
                    <span className="truncate font-medium text-gray-700">{c.supplier}</span>
                    <span className="ml-auto shrink-0">{c.age}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.methods.slice(0, 3).map((m) => (
                      <span key={m} className="rounded bg-fx-mist px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{m}</span>
                    ))}
                    {c.methods.length > 3 && <span className="text-[10px] text-gray-400">+{c.methods.length - 3}</span>}
                  </div>
                  <div className="mt-2.5">
                    <div className="mb-1 flex justify-between text-[10px] text-gray-500">
                      <span>{t.lots.progress}</span>
                      <span className="font-semibold tabular-nums">{c.completeness}%</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-fx-ink" style={{ width: `${c.completeness}%` }} />
                    </div>
                  </div>
                  {canMove && !["approved", "approved_concession", "rejected"].includes(c.status) && (
                    <div className="mt-2 flex items-center justify-between border-t border-dashed border-fx-line pt-2 text-[10px]">
                      <span className="text-gray-400">{t.lots.suggested}</span>
                      <span className="font-bold" style={{ color: TONE_HEX[STATUS_MAP[c.suggested].tone] }}>
                        {STATUS_MAP[c.suggested].label[locale]}
                        {c.maxSafe ? ` · ≤${c.maxSafe}°C` : ""}
                      </span>
                    </div>
                  )}
                  {canMove && (
                    <select
                      aria-label={t.board.moveTo}
                      className="mt-2 w-full rounded-lg border border-fx-line bg-fx-mist/50 px-2 py-1 text-[11px] lg:hidden"
                      value={c.status}
                      onChange={(e) => drop(c.id, e.target.value as LotStatus)}
                    >
                      {BOARD_COLUMNS.map((s) => (
                        <option key={s} value={s}>
                          {t.board.moveTo}: {STATUS_MAP[s].label[locale]}
                        </option>
                      ))}
                    </select>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
