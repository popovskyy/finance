"use client";

import clsx from "clsx";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Segmented } from "@/components/ui/Segmented";
import { usePortfolioHistory, type HistoryRange } from "@/hooks/queries";
import { formatDate, formatMoney, formatSignedMoney, tone } from "@/lib/format";

const TONE_TEXT = { gain: "text-gain", loss: "text-loss", flat: "text-muted" } as const;

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: "1M", label: "1 міс" },
  { value: "3M", label: "3 міс" },
  { value: "1Y", label: "Рік" },
  { value: "ALL", label: "Усе" },
];

export interface Scrub {
  date: string;
  value: number;
  /** Net worth at the start of the visible range. */
  start: number;
}

interface Props {
  currency: string;
  /** Called with the point under the pointer, and null when it leaves the chart. */
  onScrub?: (scrub: Scrub | null) => void;
}

export function NetWorthChart({ currency, onScrub }: Props) {
  const [range, setRange] = useState<HistoryRange>("3M");
  const history = usePortfolioHistory(range);
  const points = history.data ?? [];
  const last = points.length - 1;
  // The line takes the color of the result over the visible range.
  const trend = points.length > 1 && points[last].value < points[0].value ? "loss" : "gain";
  const color = `var(--${trend})`;

  const scrub = (state: { activeTooltipIndex?: number | string | null }) => {
    const point = points[Number(state.activeTooltipIndex)];
    onScrub?.(point && state.activeTooltipIndex != null ? { ...point, start: points[0].value } : null);
  };
  const release = () => onScrub?.(null);

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Динаміка статків</h2>
        <Segmented label="Проміжок графіка" size="sm" value={range} onChange={setRange} options={RANGES} />
      </div>
      <div className="mt-4 h-64 xl:h-auto xl:min-h-64 xl:flex-1">
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
            <AreaChart
              data={points}
              margin={{ top: 10, right: 4, bottom: 0, left: 4 }}
              onMouseMove={scrub}
              onTouchMove={scrub}
              onMouseLeave={release}
              onTouchEnd={release}
            >
              <defs>
                <linearGradient id={`net-worth-fill-${trend}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(date: string) => formatDate(date, false)}
                tick={{ fill: "var(--muted)", fontSize: 13 }}
                tickLine={false}
                axisLine={false}
                minTickGap={48}
                tickMargin={8}
              />
              <YAxis
                orientation="right"
                width="auto"
                domain={[(min: number) => min * 0.98, (max: number) => max * 1.02]}
                tickFormatter={(value: number) => formatMoney(value, currency, { compact: true })}
                tick={{ fill: "var(--muted)", fontSize: 13 }}
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
                  const change = point.value - points[0].value;
                  return (
                    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-lg">
                      <p className="text-sm text-muted">{formatDate(point.date)}</p>
                      <p className="tabular font-semibold">{formatMoney(point.value, currency)}</p>
                      <p className={clsx("tabular text-xs", TONE_TEXT[tone(change)])}>
                        {formatSignedMoney(change, currency)} від початку
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#net-worth-fill-${trend})`}
                animationDuration={1100}
                animationEasing="ease-out"
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)", fill: color }}
                dot={({ index, cx, cy }: { index: number; cx?: number; cy?: number }) =>
                  index === last && cx != null && cy != null ? (
                    <g key="now">
                      <circle cx={cx} cy={cy} r={4} fill={color} className="pulse-ring" />
                      <circle cx={cx} cy={cy} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
                    </g>
                  ) : (
                    <g key={index} />
                  )
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
