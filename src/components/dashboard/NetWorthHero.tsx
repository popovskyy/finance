"use client";

import { TriangleAlert } from "lucide-react";
import { PnlText } from "@/components/ui/PnlText";
import { Segmented } from "@/components/ui/Segmented";
import { useCountUp } from "@/hooks/useCountUp";
import { formatMoney } from "@/lib/format";
import { TIMEFRAME_LABEL, TIMEFRAME_PHRASE } from "@/lib/labels";
import { TIMEFRAMES, type PortfolioSummary, type Timeframe } from "@/lib/pnl/portfolio";

interface Props {
  portfolio: PortfolioSummary;
  timeframe: Timeframe;
  onTimeframe: (timeframe: Timeframe) => void;
}

export function NetWorthHero({ portfolio, timeframe, onTimeframe }: Props) {
  const netWorth = useCountUp(portfolio.netWorth, 0);
  const { baseCurrency: currency } = portfolio;
  const pnl = portfolio.pnl[timeframe];

  return (
    <div className="rise flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm text-muted">Чисті статки</p>
        <p
          className="tabular font-display mt-1 text-[clamp(2rem,8.5vw,3.75rem)] leading-[1.05] font-medium tracking-[-0.03em] break-words"
          aria-label={formatMoney(portfolio.netWorth, currency)}
        >
          {formatMoney(netWorth, currency)}
        </p>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
          <PnlText abs={pnl.abs} pct={pnl.pct} currency={currency} className="font-semibold" />
          <span className="text-muted">{TIMEFRAME_PHRASE[timeframe]}</span>
          {portfolio.stale && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn">
              <TriangleAlert size={12} aria-hidden />
              Частина цін може бути застарілою
            </span>
          )}
        </p>
      </div>
      <Segmented
        label="Період"
        className="self-start lg:self-auto"
        value={timeframe}
        onChange={onTimeframe}
        options={TIMEFRAMES.map((value) => ({ value, label: TIMEFRAME_LABEL[value] }))}
      />
    </div>
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
