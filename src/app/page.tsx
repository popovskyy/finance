"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { InsightsCard } from "@/components/ai/InsightsCard";
import { AddAssetDialog } from "@/components/assets/AddAssetDialog";
import { AllocationDonut } from "@/components/dashboard/AllocationDonut";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import { NetWorthChart } from "@/components/dashboard/NetWorthChart";
import { NetWorthHero, SummaryStats } from "@/components/dashboard/NetWorthHero";
import { Button } from "@/components/ui/Button";
import { Card, ErrorNote } from "@/components/ui/Card";
import { Logo } from "@/components/layout/Logo";
import { usePortfolio } from "@/hooks/queries";
import type { Timeframe } from "@/lib/pnl/portfolio";

export default function DashboardPage() {
  const portfolio = usePortfolio();
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [adding, setAdding] = useState(false);
  const data = portfolio.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="lg:hidden">
            <Logo size={30} />
          </span>
          <h1 className="font-display text-2xl font-medium tracking-tight">Огляд</h1>
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus size={18} aria-hidden />
          Додати актив
        </Button>
      </header>

      {portfolio.isLoading ? (
        <DashboardSkeleton />
      ) : portfolio.error || !data ? (
        <ErrorNote
          message={portfolio.error?.message ?? "Не вдалося завантажити портфель"}
          onRetry={() => portfolio.refetch()}
        />
      ) : data.holdings.length === 0 ? (
        <Card order={0} className="px-6 py-14 text-center">
          <h2 className="font-display text-2xl font-medium tracking-tight">Портфель поки порожній</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Додайте першу криптовалюту, акцію чи готівковий залишок, і тут з&apos;являться ваші статки, графік та
            результати.
          </p>
          <Button variant="primary" className="mt-6" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden />
            Додати перший актив
          </Button>
        </Card>
      ) : (
        <>
          <NetWorthHero portfolio={data} timeframe={timeframe} onTimeframe={setTimeframe} />
          <Card order={1}>
            <SummaryStats portfolio={data} />
          </Card>
          <div className="grid gap-6 xl:grid-cols-3">
            <Card order={2} className="xl:col-span-2">
              <NetWorthChart currency={data.baseCurrency} />
            </Card>
            <Card order={3}>
              <AllocationDonut portfolio={data} />
            </Card>
          </div>
          <Card order={4} className="overflow-hidden">
            <h2 className="px-5 pt-5 pb-2 text-lg font-semibold tracking-tight">Активи</h2>
            <HoldingsTable portfolio={data} timeframe={timeframe} />
          </Card>
          <Card order={5}>
            <InsightsCard />
          </Card>
        </>
      )}

      <AddAssetDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Завантаження портфеля">
      <div className="space-y-3">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton h-14 w-72 max-w-full" />
        <div className="skeleton h-4 w-44" />
      </div>
      <div className="skeleton h-20 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="skeleton h-80 rounded-2xl lg:col-span-2" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
      <div className="skeleton h-72 rounded-2xl" />
    </div>
  );
}
