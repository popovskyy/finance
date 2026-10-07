"use client";

import clsx from "clsx";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { useDeleteTransaction, type AssetDto, type TransactionDto } from "@/hooks/queries";
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import { txTypeLabel } from "@/lib/labels";
import { TransactionDialog } from "./TransactionDialog";

type AssetRef = Pick<AssetDto, "id" | "symbol" | "name" | "category" | "currency">;
export type TransactionRow = TransactionDto & { asset: AssetRef };

const TH = "py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted";
const TD = "py-3 text-left";

// Columns appear by the card's own width (container queries). In narrow cards the
// date and operation move under the first cell and the total under the quantity.
const COL = {
  date: "hidden pl-5 pr-3 @2xl:table-cell",
  first: "w-full max-w-0 pl-5 pr-3 @2xl:pl-3",
  operation: "hidden pl-3 pr-3 @lg:table-cell",
  quantity: "pl-3 pr-3 !text-right",
  price: "hidden pl-3 pr-3 !text-right @3xl:table-cell",
  fee: "hidden pl-3 pr-3 !text-right @4xl:table-cell",
  total: "hidden pl-3 pr-3 !text-right @3xl:table-cell",
  actions: "w-px pl-1 pr-3",
};

export function TransactionTable({ rows, showAsset = true }: { rows: TransactionRow[]; showAsset?: boolean }) {
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const remove = useDeleteTransaction();

  return (
    <>
      {remove.error && (
        <div className="px-5 pt-4">
          <ErrorNote message={remove.error.message} />
        </div>
      )}
      <div className="@container">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className={clsx(TH, COL.date)}>Дата</th>
              <th className={clsx(TH, COL.first)}>{showAsset ? "Актив" : "Операція"}</th>
              {showAsset && <th className={clsx(TH, COL.operation)}>Операція</th>}
              <th className={clsx(TH, COL.quantity)}>Кількість</th>
              <th className={clsx(TH, COL.price)}>Ціна</th>
              <th className={clsx(TH, COL.fee)}>Комісія</th>
              <th className={clsx(TH, COL.total)}>Сума</th>
              <th className={clsx(TH, COL.actions)}>
                <span className="sr-only">Дії</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx, i) => {
              const inflow = tx.type === "BUY" || tx.type === "DEPOSIT";
              const isCash = tx.asset.category === "CASH";
              const quantity = Number(tx.quantity);
              const price = Number(tx.price);
              const fee = Number(tx.fee);
              const label = txTypeLabel(tx.type, tx.asset.category);
              const badge = (
                <span
                  className={clsx(
                    "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                    inflow ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss",
                  )}
                >
                  {label}
                </span>
              );
              const note = tx.note && <span className="mt-1 block truncate text-xs text-muted">{tx.note}</span>;
              // Under the first cell the year is dropped for this year's operations.
              const shortDate = formatDate(tx.date, new Date(tx.date).getFullYear() !== new Date().getFullYear());

              return (
                <tr key={tx.id} className="row-in border-b border-line/70 last:border-0" style={{ "--i": i } as CSSProperties}>
                  <td className={clsx(TD, COL.date, "whitespace-nowrap text-muted")}>{formatDate(tx.date)}</td>
                  <td className={clsx(TD, COL.first)}>
                    {showAsset ? (
                      <>
                        <Link
                          href={`/assets/${tx.asset.id}`}
                          className="block truncate text-base font-semibold underline-offset-2 hover:underline"
                        >
                          {tx.asset.symbol}
                        </Link>
                        <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted @2xl:hidden">
                          <span className={clsx("font-medium @lg:hidden", inflow ? "text-gain" : "text-loss")}>{label}</span>
                          <span>{shortDate}</span>
                        </span>
                        {note}
                      </>
                    ) : (
                      <>
                        {badge}
                        <span className="mt-1 block text-xs text-muted @2xl:hidden">{shortDate}</span>
                        {note}
                      </>
                    )}
                  </td>
                  {showAsset && (
                    <td className={clsx(TD, COL.operation)}>{badge}</td>
                  )}
                  <td className={clsx(TD, COL.quantity, "tabular whitespace-nowrap")}>
                    {inflow ? "+" : "−"}
                    {formatQuantity(quantity)}
                    {!isCash && (
                      <span className="block text-xs text-muted @3xl:hidden">
                        {formatMoney(quantity * price, tx.asset.currency)}
                      </span>
                    )}
                  </td>
                  <td className={clsx(TD, COL.price, "tabular whitespace-nowrap")}>
                    {isCash ? "—" : formatMoney(price, tx.asset.currency)}
                  </td>
                  <td className={clsx(TD, COL.fee, "tabular whitespace-nowrap text-muted")}>
                    {fee ? formatMoney(fee, tx.asset.currency) : "—"}
                  </td>
                  <td className={clsx(TD, COL.total, "tabular font-medium whitespace-nowrap")}>
                    {formatMoney(quantity * price, tx.asset.currency)}
                  </td>
                  <td className={clsx(TD, COL.actions, "whitespace-nowrap")}>
                    <span className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon" aria-label="Редагувати операцію" onClick={() => setEditing(tx)}>
                        <Pencil size={16} />
                      </Button>
                      <ConfirmButton
                        compact
                        label="Видалити операцію"
                        confirmLabel="Видалити?"
                        disabled={remove.isPending}
                        onConfirm={() => remove.mutate(tx.id)}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <TransactionDialog open onClose={() => setEditing(null)} asset={editing.asset} transaction={editing} />
      )}
    </>
  );
}
