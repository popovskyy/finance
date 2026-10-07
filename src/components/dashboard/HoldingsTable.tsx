"use client";

import clsx from "clsx";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { PnlText } from "@/components/ui/PnlText";
import { formatMoney, formatPercent, formatQuantity } from "@/lib/format";
import { CATEGORY_COLOR, CATEGORY_LABEL, TIMEFRAME_LABEL } from "@/lib/labels";
import type { PortfolioSummary, Timeframe } from "@/lib/pnl/portfolio";

const TH = "px-3 py-2.5 text-right text-xs font-medium text-muted first:pl-5 first:text-left last:pr-5";
const TD = "px-3 py-3 text-right first:pl-5 first:text-left last:pr-5";

export function HoldingsTable({ portfolio, timeframe }: { portfolio: PortfolioSummary; timeframe: Timeframe }) {
  const { baseCurrency: currency } = portfolio;
  let rowIndex = 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th className={TH}>Актив</th>
            <th className={clsx(TH, "hidden sm:table-cell")}>Ціна</th>
            <th className={clsx(TH, "hidden md:table-cell")}>Кількість</th>
            <th className={clsx(TH, "hidden xl:table-cell")}>Середня ціна</th>
            <th className={TH}>Вартість</th>
            <th className={TH}>{TIMEFRAME_LABEL[timeframe]}</th>
            <th className={clsx(TH, "hidden lg:table-cell")}>Нереалізований</th>
            <th className={clsx(TH, "hidden lg:table-cell")}>Частка</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.categories.map((group) => (
            <Fragment key={group.category}>
              <tr className="bg-surface-2/70">
                <th colSpan={8} scope="rowgroup" className="px-5 py-2 text-left font-medium">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: CATEGORY_COLOR[group.category] }} />
                    {CATEGORY_LABEL[group.category]}
                    <span className="tabular ml-auto font-normal text-muted">
                      {formatMoney(group.value, currency)}
                    </span>
                  </span>
                </th>
              </tr>
              {portfolio.holdings
                .filter((h) => h.category === group.category)
                .map((h) => {
                  const closed = h.quantity === 0;
                  return (
                    <tr
                      key={h.id}
                      className={clsx("row-in hover-row relative border-b border-line/70 last:border-0", closed && "opacity-55")}
                      style={{ "--i": rowIndex++ } as CSSProperties}
                    >
                      <td className={TD}>
                        {/* The link stretches over the row so the whole line is clickable. */}
                        <Link href={`/assets/${h.id}`} className="block after:absolute after:inset-0">
                          <span className="flex items-center gap-1.5 font-semibold">
                            {h.symbol}
                            {h.stale && <TriangleAlert size={13} className="text-warn" aria-label="Ціна може бути застарілою" />}
                          </span>
                          <span className="block max-w-[11rem] truncate text-xs text-muted sm:max-w-[16rem]">
                            {closed ? "Позицію закрито" : h.name}
                          </span>
                        </Link>
                      </td>
                      <td className={clsx(TD, "tabular hidden sm:table-cell")}>
                        {h.category === "CASH" ? "—" : formatMoney(h.price, h.currency)}
                      </td>
                      <td className={clsx(TD, "tabular hidden md:table-cell")}>{formatQuantity(h.quantity)}</td>
                      <td className={clsx(TD, "tabular hidden text-muted xl:table-cell")}>
                        {h.category === "CASH" || closed ? "—" : formatMoney(h.avgCost, h.currency)}
                      </td>
                      <td className={clsx(TD, "tabular font-medium")}>{formatMoney(h.value, currency)}</td>
                      <td className={TD}>
                        <PnlText layout="stack" abs={h.pnl[timeframe].abs} pct={h.pnl[timeframe].pct} currency={currency} />
                      </td>
                      <td className={clsx(TD, "hidden lg:table-cell")}>
                        <PnlText layout="stack" abs={h.unrealized.abs} pct={h.unrealized.pct} currency={currency} />
                      </td>
                      <td className={clsx(TD, "hidden lg:table-cell")}>
                        <span className="tabular flex items-center justify-end gap-2 text-muted">
                          <span className="block h-1.5 w-12 overflow-hidden rounded-full bg-line">
                            <span
                              className="grow-x block h-full rounded-full"
                              style={{ width: `${Math.min(100, h.allocationPct)}%`, background: CATEGORY_COLOR[h.category] }}
                            />
                          </span>
                          <span className="w-12">{formatPercent(h.allocationPct, false)}</span>
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
