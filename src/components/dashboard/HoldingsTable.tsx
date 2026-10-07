"use client";

import clsx from "clsx";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { PnlText } from "@/components/ui/PnlText";
import { formatMoney, formatPercent, formatQuantity } from "@/lib/format";
import { CATEGORY_COLOR, CATEGORY_LABEL, SESSION_PHRASE, TIMEFRAME_LABEL } from "@/lib/labels";
import type { PortfolioSummary, Timeframe } from "@/lib/pnl/portfolio";

const TH = "py-2.5 text-right text-xs font-medium whitespace-nowrap text-muted";
const TD = "py-3 text-right";

// Columns appear by the card's own width (container queries), so the table fits
// with or without the sidebar. The cell that is last on screen gets the wide
// right padding, which is why some columns switch it off at the next step.
const COL = {
  price: "hidden pl-3 pr-3 @xl:table-cell",
  quantity: "hidden pl-3 pr-3 @2xl:table-cell",
  avgCost: "hidden pl-3 pr-3 @6xl:table-cell",
  value: "pl-3 pr-5 @md:pr-3",
  period: "hidden pl-3 pr-5 @md:table-cell @3xl:pr-3",
  unrealized: "hidden pl-3 pr-5 @3xl:table-cell @5xl:pr-3",
  share: "hidden pl-3 pr-5 @5xl:table-cell",
};

export function HoldingsTable({ portfolio, timeframe }: { portfolio: PortfolioSummary; timeframe: Timeframe }) {
  const { baseCurrency: currency } = portfolio;
  let rowIndex = 0;

  return (
    <div className="@container">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className={clsx(TH, "pr-3 pl-5 !text-left")}>Актив</th>
            <th className={clsx(TH, COL.price)}>Ціна</th>
            <th className={clsx(TH, COL.quantity)}>Кількість</th>
            <th className={clsx(TH, COL.avgCost)}>Середня ціна</th>
            <th className={clsx(TH, COL.value)}>Вартість</th>
            <th className={clsx(TH, COL.period)}>{TIMEFRAME_LABEL[timeframe]}</th>
            <th className={clsx(TH, COL.unrealized)}>Нереалізований</th>
            <th className={clsx(TH, COL.share)}>Частка</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.categories.map((group) => (
            <Fragment key={group.category}>
              <tr className="bg-surface-2/70">
                <th colSpan={8} scope="rowgroup" className="px-5 py-2 text-left font-medium">
                  <span className="flex items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[group.category] }} />
                    {CATEGORY_LABEL[group.category]}
                    <span className="tabular ml-auto font-normal whitespace-nowrap text-muted">
                      {formatMoney(group.value, currency)}
                    </span>
                  </span>
                </th>
              </tr>
              {portfolio.holdings
                .filter((h) => h.category === group.category)
                .map((h) => {
                  const closed = h.quantity === 0;
                  const isCash = h.category === "CASH";
                  return (
                    <tr
                      key={h.id}
                      className={clsx("row-in hover-row relative border-b border-line/70 last:border-0", closed && "opacity-55")}
                      style={{ "--i": rowIndex++ } as CSSProperties}
                    >
                      {/* Takes the leftover width and truncates, so long names never widen the table. */}
                      <td className={clsx(TD, "w-full max-w-0 pr-3 pl-5 !text-left")}>
                        {/* The link stretches over the row so the whole line is clickable. */}
                        <Link href={`/assets/${h.id}`} className="block after:absolute after:inset-0">
                          <span className="flex items-center gap-1.5 text-base font-semibold">
                            <span className="truncate">{h.symbol}</span>
                            {h.stale && (
                              <TriangleAlert size={14} className="shrink-0 text-warn" aria-label="Ціна може бути застарілою" />
                            )}
                          </span>
                          <span className="block truncate text-xs text-muted">{closed ? "Позицію закрито" : h.name}</span>
                        </Link>
                      </td>
                      <td className={clsx(TD, COL.price, "tabular whitespace-nowrap")}>
                        {isCash ? "—" : formatMoney(h.price, h.currency)}
                        {h.session && <span className="block text-xs text-muted">{SESSION_PHRASE[h.session]}</span>}
                      </td>
                      <td className={clsx(TD, COL.quantity, "tabular whitespace-nowrap")}>{formatQuantity(h.quantity)}</td>
                      <td className={clsx(TD, COL.avgCost, "tabular whitespace-nowrap text-muted")}>
                        {isCash || closed ? "—" : formatMoney(h.avgCost, h.currency)}
                      </td>
                      <td className={clsx(TD, COL.value)}>
                        <span className="tabular block font-medium whitespace-nowrap">{formatMoney(h.value, currency)}</span>
                        {/* Narrow cards have no period column: its figure sits under the value. */}
                        <PnlText
                          abs={h.pnl[timeframe].abs}
                          pct={h.pnl[timeframe].pct}
                          currency={currency}
                          className="justify-end text-xs @md:hidden"
                        />
                      </td>
                      <td className={clsx(TD, COL.period)}>
                        <PnlText layout="stack" abs={h.pnl[timeframe].abs} pct={h.pnl[timeframe].pct} currency={currency} />
                      </td>
                      <td className={clsx(TD, COL.unrealized)}>
                        <PnlText layout="stack" abs={h.unrealized.abs} pct={h.unrealized.pct} currency={currency} />
                      </td>
                      <td className={clsx(TD, COL.share)}>
                        <span className="tabular flex items-center justify-end gap-2 text-muted">
                          <span className="block h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-line">
                            <span
                              className="grow-x block h-full rounded-full"
                              style={{ width: `${Math.min(100, h.allocationPct)}%`, background: CATEGORY_COLOR[h.category] }}
                            />
                          </span>
                          <span className="min-w-14 whitespace-nowrap">{formatPercent(h.allocationPct, false)}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
