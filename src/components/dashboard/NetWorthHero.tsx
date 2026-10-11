"use client";

import clsx from "clsx";
import { Moon, TriangleAlert, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { AssetAvatar } from "@/components/ui/AssetAvatar";
import { Flash } from "@/components/ui/Flash";
import { PnlText } from "@/components/ui/PnlText";
import { Segmented } from "@/components/ui/Segmented";
import { useCountUp } from "@/hooks/useCountUp";
import { confetti } from "@/lib/confetti";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { TIMEFRAME_LABEL, TIMEFRAME_PHRASE } from "@/lib/labels";
import { TIMEFRAMES, type Holding, type PortfolioSummary, type Timeframe } from "@/lib/pnl/portfolio";
import type { Scrub } from "./NetWorthChart";

interface Props {
  portfolio: PortfolioSummary;
  timeframe: Timeframe;
  onTimeframe: (timeframe: Timeframe) => void;
  /** A point picked on the chart replaces the live figure while the pointer is there. */
  scrub?: Scrub | null;
}

const CELEBRATED_KEY = "record-celebrated";

export function NetWorthHero({ portfolio, timeframe, onTimeframe, scrub }: Props) {
  const netWorth = useCountUp(portfolio.netWorth, 0);
  const { baseCurrency: currency } = portfolio;
  const pnl = portfolio.pnl[timeframe];
  const shown = scrub ? scrub.value : netWorth;
  // Seven-digit sums get a smaller size so the figure always fits on one line.
  const long = formatMoney(scrub?.value ?? portfolio.netWorth, currency).length > 12;
  const record = portfolio.previousHigh !== null && portfolio.netWorth > portfolio.previousHigh;

  // A new all-time high gets confetti once a day.
  useEffect(() => {
    if (!record) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(CELEBRATED_KEY) === today) return;
    } catch {
      return;
    }
    // Marked only once it fires, so an effect re-run before the delay still celebrates.
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(CELEBRATED_KEY, today);
      } catch {}
      confetti(0.3, 0.25);
    }, 700);
    return () => clearTimeout(timer);
  }, [record]);

  const scrubChange = scrub ? scrub.value - scrub.start : 0;

  return (
    <div className="rise @container flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="max-w-full min-w-0">
        <p className="flex items-center gap-2 text-base text-muted">
          {scrub ? formatDate(scrub.date) : "Чисті статки"}
          {record && !scrub && (
            <span className="record-badge inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <Trophy size={12} aria-hidden />
              Новий рекорд
            </span>
          )}
        </p>
        <p
          className={clsx(
            "tabular font-display mt-1 leading-[1.05] font-medium tracking-[-0.03em] whitespace-nowrap",
            long ? "text-[clamp(1.75rem,9cqi,4.25rem)]" : "text-[clamp(2.25rem,12cqi,4.25rem)]",
          )}
          aria-label={formatMoney(scrub?.value ?? portfolio.netWorth, currency)}
        >
          <Flash value={portfolio.netWorth} className="rounded-lg">
            {formatMoney(shown, currency)}
          </Flash>
        </p>
        <p className="mt-3 flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1.5 text-base">
          {scrub ? (
            <>
              <PnlText
                abs={scrubChange}
                pct={scrub.start > 0 ? (scrubChange / scrub.start) * 100 : null}
                currency={currency}
                className="font-semibold"
              />
              <span className="text-muted">від початку графіка</span>
            </>
          ) : (
            <>
              <PnlText abs={pnl.abs} pct={pnl.pct} currency={currency} className="font-semibold" />
              <span className="text-muted">{TIMEFRAME_PHRASE[timeframe]}</span>
              {timeframe === "1D" && portfolio.marketClosed && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">
                  <Moon size={12} aria-hidden />
                  Ринки закриті
                </span>
              )}
              {portfolio.stale && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn">
                  <TriangleAlert size={12} aria-hidden />
                  Частина цін може бути застарілою
                </span>
              )}
            </>
          )}
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
        <Movers portfolio={portfolio} timeframe={timeframe} />
        <Segmented
          label="Період"
          layout="fill"
          className="sm:inline-flex sm:w-auto"
          value={timeframe}
          onChange={onTimeframe}
          options={TIMEFRAMES.map((value) => ({ value, label: TIMEFRAME_LABEL[value] }))}
        />
      </div>
    </div>
  );
}

/** The best and the worst open position over the selected period. */
function Movers({ portfolio, timeframe }: { portfolio: PortfolioSummary; timeframe: Timeframe }) {
  const ranked = portfolio.holdings
    .filter((h) => h.category !== "CASH" && h.quantity > 0 && h.pnl[timeframe].pct !== null)
    .filter((h) => !(timeframe === "1D" && h.marketClosed))
    .sort((a, b) => (b.pnl[timeframe].pct ?? 0) - (a.pnl[timeframe].pct ?? 0));
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const chips = [
    best && (best.pnl[timeframe].pct ?? 0) > 0 ? best : null,
    worst && worst !== best && (worst.pnl[timeframe].pct ?? 0) < 0 ? worst : null,
  ].filter((h): h is Holding => h !== null);
  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2 sm:justify-end" aria-label={`Найбільші зміни: ${TIMEFRAME_LABEL[timeframe].toLowerCase()}`}>
      {chips.map((h, i) => {
        const pct = h.pnl[timeframe].pct ?? 0;
        return (
          <li key={h.id} className="pop-in" style={{ animationDelay: `${300 + i * 90}ms` }}>
            <Link
              href={`/assets/${h.id}`}
              className={clsx(
                "pressable hover-lift flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm",
              )}
            >
              <AssetAvatar category={h.category} symbol={h.symbol} size={26} />
              <span className="font-semibold">{h.symbol}</span>
              <span className={clsx("tabular font-medium", pct > 0 ? "text-gain" : "text-loss")}>
                {formatPercent(pct)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SummaryStats({ portfolio }: { portfolio: PortfolioSummary }) {
  const { baseCurrency: currency } = portfolio;
  const items = [
    { label: "Вкладено", node: <span className="tabular">{formatMoney(portfolio.costBasis, currency)}</span> },
    {
      label: "Нереалізований результат",
      node: <PnlText abs={portfolio.unrealized.abs} pct={portfolio.unrealized.pct} currency={currency} />,
    },
    { label: "Зафіксований результат", node: <PnlText abs={portfolio.realized} currency={currency} /> },
  ];
  return (
    <dl className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4">
          <dt className="text-sm text-muted">{item.label}</dt>
          <dd className="mt-1 text-lg font-semibold">{item.node}</dd>
        </div>
      ))}
    </dl>
  );
}
