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

const TH = "px-3 py-2.5 text-right text-xs font-medium text-muted first:pl-5 first:text-left last:pr-3";
const TD = "px-3 py-3 text-right first:pl-5 first:text-left last:pr-3";

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
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className={TH}>Дата</th>
              {showAsset && <th className={clsx(TH, "!text-left")}>Актив</th>}
              <th className={clsx(TH, "!text-left")}>Операція</th>
              <th className={TH}>Кількість</th>
              <th className={clsx(TH, "hidden sm:table-cell")}>Ціна</th>
              <th className={clsx(TH, "hidden md:table-cell")}>Комісія</th>
              <th className={clsx(TH, "hidden sm:table-cell")}>Сума</th>
              <th className={TH}>
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
              return (
                <tr key={tx.id} className="row-in border-b border-line/70 last:border-0" style={{ "--i": i } as CSSProperties}>
                  <td className={clsx(TD, "whitespace-nowrap text-muted")}>{formatDate(tx.date)}</td>
                  {showAsset && (
                    <td className={clsx(TD, "!text-left")}>
                      <Link href={`/assets/${tx.asset.id}`} className="font-semibold underline-offset-2 hover:underline">
                        {tx.asset.symbol}
                      </Link>
                    </td>
                  )}
                  <td className={clsx(TD, "!text-left")}>
                    <span
                      className={clsx(
                        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                        inflow ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss",
                      )}
                    >
                      {txTypeLabel(tx.type, tx.asset.category)}
                    </span>
                    {tx.note && <span className="mt-1 block max-w-[14rem] truncate text-xs text-muted">{tx.note}</span>}
                  </td>
                  <td className={clsx(TD, "tabular whitespace-nowrap")}>
                    {inflow ? "+" : "−"}
                    {formatQuantity(quantity)}
                  </td>
                  <td className={clsx(TD, "tabular hidden sm:table-cell")}>
                    {isCash ? "—" : formatMoney(price, tx.asset.currency)}
                  </td>
                  <td className={clsx(TD, "tabular hidden text-muted md:table-cell")}>
                    {fee ? formatMoney(fee, tx.asset.currency) : "—"}
                  </td>
                  <td className={clsx(TD, "tabular hidden font-medium sm:table-cell")}>
                    {formatMoney(quantity * price, tx.asset.currency)}
                  </td>
                  <td className={clsx(TD, "w-px whitespace-nowrap")}>
                    <span className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon" aria-label="Редагувати операцію" onClick={() => setEditing(tx)}>
                        <Pencil size={15} />
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
