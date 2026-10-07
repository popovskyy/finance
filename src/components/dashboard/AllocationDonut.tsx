"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatMoney, formatPercent } from "@/lib/format";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/labels";
import type { PortfolioSummary } from "@/lib/pnl/portfolio";

export function AllocationDonut({ portfolio }: { portfolio: PortfolioSummary }) {
  const data = portfolio.categories.filter((c) => c.value > 0);
  const largest = [...data].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="flex h-full flex-col p-5">
      <h2 className="font-semibold">Розподіл</h2>
      {data.length === 0 ? (
        <p className="grid flex-1 place-items-center py-10 text-sm text-muted">Поки що нічого розподіляти</p>
      ) : (
        <>
          <div className="relative mx-auto mt-3 aspect-square w-full max-w-52">
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
                <span className="text-sm text-muted">{CATEGORY_LABEL[largest.category]}</span>
              </div>
            )}
          </div>
          <ul className="mt-5 space-y-2.5">
            {data.map((c) => (
              <li key={c.category} className="flex items-center gap-2.5 text-sm">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[c.category] }} />
                <span className="flex-1">{CATEGORY_LABEL[c.category]}</span>
                <span className="tabular text-muted">{formatPercent(c.allocationPct, false)}</span>
                <span className="tabular w-24 text-right font-medium">
                  {formatMoney(c.value, portfolio.baseCurrency, { digits: 0 })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
