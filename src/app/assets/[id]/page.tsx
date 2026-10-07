"use client";

import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { Button } from "@/components/ui/Button";
import { Card, ErrorNote } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PnlText } from "@/components/ui/PnlText";
import { useAsset, useDeleteAsset, usePortfolio } from "@/hooks/queries";
import { formatMoney, formatPercent, formatQuantity } from "@/lib/format";
import { CATEGORY_LABEL, TIMEFRAME_LABEL } from "@/lib/labels";
import { TIMEFRAMES } from "@/lib/pnl/portfolio";

export default function AssetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const asset = useAsset(id);
  const portfolio = usePortfolio();
  const remove = useDeleteAsset();
  const [adding, setAdding] = useState(false);

  const back = (
    <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <ArrowLeft size={16} aria-hidden />
      Огляд
    </Link>
  );

  if (asset.isLoading) {
    return (
      <div className="space-y-6">
        {back}
        <div className="skeleton h-12 w-64" />
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }
  if (asset.error || !asset.data) {
    return (
      <div className="space-y-6">
        {back}
        <ErrorNote message={asset.error?.message ?? "Актив не знайдено"} />
      </div>
    );
  }

  const data = asset.data;
  const holding = portfolio.data?.holdings.find((h) => h.id === id);
  const base = portfolio.data?.baseCurrency ?? data.currency;
  const isCash = data.category === "CASH";

  return (
    <div className="space-y-6">
      {back}
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">{CATEGORY_LABEL[data.category]}</p>
          <h1 className="font-display text-3xl font-medium tracking-tight">{data.symbol}</h1>
          <p className="truncate text-muted">{data.name}</p>
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus size={18} aria-hidden />
          Нова операція
        </Button>
      </header>

      {holding ? (
        <Card order={1} className="@container">
          {/* One column in narrow cards, so long sums never squeeze into half a phone screen. */}
          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-t-2xl bg-line @sm:grid-cols-2 @3xl:grid-cols-4">
            <Stat label="Вартість" value={formatMoney(holding.value, base)} sub={`${formatPercent(holding.allocationPct, false)} портфеля`} />
            <Stat
              label={isCash ? "Залишок" : "Кількість"}
              value={isCash ? formatMoney(holding.quantity, data.currency) : formatQuantity(holding.quantity)}
              sub={isCash ? undefined : `Ціна ${formatMoney(holding.price, data.currency)}`}
            />
            <Stat
              label="Нереалізований результат"
              value={<PnlText abs={holding.unrealized.abs} pct={holding.unrealized.pct} currency={base} />}
              sub={isCash ? "Через зміну курсу" : `Середня ціна ${formatMoney(holding.avgCost, data.currency)}`}
            />
            <Stat label="Зафіксований результат" value={<PnlText abs={holding.realized} currency={base} />} />
          </dl>
          <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-line px-5 py-4">
            {TIMEFRAMES.map((tf) => (
              <div key={tf}>
                <dt className="text-xs text-muted">{TIMEFRAME_LABEL[tf]}</dt>
                <dd className="mt-0.5 text-sm font-medium">
                  <PnlText abs={holding.pnl[tf].abs} pct={holding.pnl[tf].pct} currency={base} />
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : (
        portfolio.isLoading && <div className="skeleton h-40 rounded-2xl" />
      )}

      <Card order={2} className="overflow-hidden">
        <h2 className="px-5 pt-5 pb-2 text-lg font-semibold tracking-tight">Операції</h2>
        {data.transactions.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-muted">Для цього активу ще немає операцій.</p>
        ) : (
          <TransactionTable showAsset={false} rows={data.transactions.map((tx) => ({ ...tx, asset: data }))} />
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Видалення активу прибирає і всі його операції.</p>
        <ConfirmButton
          label="Видалити актив"
          disabled={remove.isPending}
          onConfirm={() => remove.mutate(id, { onSuccess: () => router.push("/") })}
        />
      </div>
      {remove.error && <ErrorNote message={remove.error.message} />}

      <TransactionDialog open={adding} onClose={() => setAdding(false)} asset={data} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="min-w-0 bg-surface px-5 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="tabular mt-1 text-lg font-semibold">{value}</dd>
      {sub && <dd className="tabular mt-0.5 text-xs text-muted">{sub}</dd>}
    </div>
  );
}
