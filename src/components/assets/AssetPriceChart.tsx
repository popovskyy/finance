"use client";

import clsx from "clsx";
import { useState } from "react";
import { Area, AreaChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Segmented } from "@/components/ui/Segmented";
import { useAssetHistory, type HistoryRange, type TransactionDto } from "@/hooks/queries";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: "1M", label: "1 міс" },
  { value: "3M", label: "3 міс" },
  { value: "1Y", label: "Рік" },
  { value: "ALL", label: "Усе" },
];

interface Props {
  assetId: string;
  title: string;
  /** Currency the prices are quoted in. */
  currency: string;
  /** Average buy price, drawn as a dashed line; omitted for cash. */
  avgCost?: number;
  transactions?: TransactionDto[];
}

/** Price over time with the ledger on top: buys and sells as dots, the average cost as a line. */
export function AssetPriceChart({ assetId, title, currency, avgCost, transactions = [] }: Props) {
  const [range, setRange] = useState<HistoryRange>("3M");
  const history = useAssetHistory(assetId, range);
  const points = history.data ?? [];
  const last = points.length - 1;
  const change = points.length > 1 ? points[last].price - points[0].price : 0;
  const trend = change < 0 ? "loss" : "gain";
  const color = `var(--${trend})`;

  // Each trade sits on the chart's last date on or before it.
  const first = points[0]?.date;
  const markers = transactions
    .filter((tx) => (tx.type === "BUY" || tx.type === "SELL") && first && tx.date.slice(0, 10) >= first)
    .map((tx) => {
      const key = tx.date.slice(0, 10);
      const at = [...points].reverse().find((p) => p.date <= key);
      return at ? { id: tx.id, date: at.date, price: Number(tx.price), buy: tx.type === "BUY" } : null;
    })
    .filter((m) => m !== null);

  const values = [...points.map((p) => p.price), ...markers.map((m) => m.price), ...(avgCost ? [avgCost] : [])];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.08 || max * 0.02;

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {points.length > 1 && (
            <p className={clsx("tabular text-sm font-medium", change < 0 ? "text-loss" : "text-gain")}>
              {formatPercent(points[0].price > 0 ? (change / points[0].price) * 100 : null)} за проміжок
            </p>
          )}
        </div>
        <Segmented label="Проміжок графіка" size="sm" value={range} onChange={setRange} options={RANGES} />
      </div>
      <div className="mt-4 h-64 md:h-72">
        {history.isLoading ? (
          <div className="skeleton h-full" />
        ) : history.error ? (
          <p className="grid h-full place-items-center text-sm text-muted">Не вдалося завантажити графік</p>
        ) : points.length < 2 ? (
          <p className="grid h-full place-items-center text-sm text-muted">Поки замало історії для графіка</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 10, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`asset-fill-${trend}`} x1="0" y1="0" x2="0" y2="1">
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
                domain={[Math.max(0, min - pad), max + pad]}
                tickFormatter={(value: number) => formatMoney(value, currency, { compact: true })}
                tick={{ fill: "var(--muted)", fontSize: 13 }}
                tickLine={false}
                axisLine={false}
                tickCount={4}
              />
              {avgCost !== undefined && avgCost > 0 && (
                <ReferenceLine
                  y={avgCost}
                  stroke="var(--muted)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Середня ${formatMoney(avgCost, currency, { compact: true })}`,
                    position: "insideTopLeft",
                    fill: "var(--muted)",
                    fontSize: 12,
                  }}
                />
              )}
              <Tooltip
                cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
                isAnimationActive={false}
                content={({ active, payload }) => {
                  const point = active ? payload?.[0]?.payload : null;
                  if (!point) return null;
                  const trades = markers.filter((m) => m.date === point.date);
                  return (
                    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-lg">
                      <p className="text-sm text-muted">{formatDate(point.date)}</p>
                      <p className="tabular font-semibold">{formatMoney(point.price, currency)}</p>
                      {trades.map((t) => (
                        <p key={t.id} className={clsx("tabular text-xs", t.buy ? "text-gain" : "text-loss")}>
                          {t.buy ? "Купівля" : "Продаж"} по {formatMoney(t.price, currency)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill={`url(#asset-fill-${trend})`}
                animationDuration={1100}
                animationEasing="ease-out"
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)", fill: color }}
              />
              {markers.map((m) => (
                <ReferenceDot
                  key={m.id}
                  x={m.date}
                  y={m.price}
                  r={6}
                  fill={m.buy ? "var(--gain)" : "var(--loss)"}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  className="pop-in"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {markers.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-gain" /> Купівля
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-loss" /> Продаж
          </span>
          {avgCost !== undefined && avgCost > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-muted" /> Середня ціна
            </span>
          )}
        </p>
      )}
    </div>
  );
}
