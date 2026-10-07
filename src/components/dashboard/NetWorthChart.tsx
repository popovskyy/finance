"use client";

import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Segmented } from "@/components/ui/Segmented";
import { usePortfolioHistory, type HistoryRange } from "@/hooks/queries";
import { formatDate, formatMoney } from "@/lib/format";

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: "1M", label: "1 міс" },
  { value: "3M", label: "3 міс" },
  { value: "1Y", label: "Рік" },
  { value: "ALL", label: "Усе" },
];

export function NetWorthChart({ currency }: { currency: string }) {
  const [range, setRange] = useState<HistoryRange>("3M");
  const history = usePortfolioHistory(range);
  const points = history.data ?? [];

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Динаміка статків</h2>
        <Segmented label="Проміжок графіка" size="sm" value={range} onChange={setRange} options={RANGES} />
      </div>
      <div className="mt-4 h-64 min-h-0 flex-1">
        {history.isLoading ? (
          <div className="skeleton h-full" />
        ) : history.error ? (
          <p className="grid h-full place-items-center text-sm text-muted">Не вдалося завантажити графік</p>
        ) : points.length < 2 ? (
          <p className="grid h-full place-items-center px-6 text-center text-sm text-muted">
            Графік з&apos;явиться, щойно в портфелі буде історія хоча б за два дні
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="net-worth-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(date: string) => formatDate(date, false)}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                minTickGap={48}
                tickMargin={8}
              />
              <YAxis
                orientation="right"
                width={56}
                domain={[(min: number) => min * 0.98, (max: number) => max * 1.02]}
                tickFormatter={(value: number) => formatMoney(value, currency, { compact: true })}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickCount={4}
              />
              <Tooltip
                cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const point = active ? payload?.[0]?.payload : null;
                  if (!point) return null;
                  return (
                    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-lg">
                      <p className="text-xs text-muted">{formatDate(point.date)}</p>
                      <p className="tabular font-semibold">{formatMoney(point.value, currency)}</p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#net-worth-fill)"
                animationDuration={900}
                animationEasing="ease-out"
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--accent)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
