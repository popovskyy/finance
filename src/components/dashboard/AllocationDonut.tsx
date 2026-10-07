"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatMoney, formatPercent } from "@/lib/format";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/labels";
import type { PortfolioSummary } from "@/lib/pnl/portfolio";

export function AllocationDonut({ portfolio }: { portfolio: PortfolioSummary }) {
  const data = portfolio.categories.filter((c) => c.value > 0);
  const largest = [...data].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="@container flex h-full flex-col p-5">
      <h2 className="text-lg font-semibold tracking-tight">Розподіл</h2>
      {data.length === 0 ? (
        <p className="grid flex-1 place-items-center py-10 text-sm text-muted">Поки що нічого розподіляти</p>
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-center gap-5 @md:flex-row @md:gap-10">
          <div className="relative aspect-square w-full max-w-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="category"
                  innerRadius="72%"
                  outerRadius="100%"
                  paddingAngle={data.length > 1 ? 3 : 0}
                  cornerRadius={6}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {data.map((c) => (
                    <Cell key={c.category} fill={CATEGORY_COLOR[c.category]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {largest && (
              <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                <span className="tabular font-display text-2xl font-medium">
                  {formatPercent(largest.allocationPct, false)}
                </span>
                <span className="text-base text-muted">{CATEGORY_LABEL[largest.category]}</span>
              </div>
            )}
          </div>
          <ul className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2.5 text-sm @xs:text-base">
            {data.map((c) => (
              <li key={c.category} className="col-span-4 grid grid-cols-subgrid items-center">
                <span className="size-2.5 rounded-full" style={{ background: CATEGORY_COLOR[c.category] }} />
                <span className="min-w-0 truncate">{CATEGORY_LABEL[c.category]}</span>
                <span className="tabular text-right text-muted">{formatPercent(c.allocationPct, false)}</span>
                <span className="tabular text-right font-medium">
                  {formatMoney(c.value, portfolio.baseCurrency, { digits: 0 })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
