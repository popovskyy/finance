"use client";

import Link from "next/link";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { Card, ErrorNote } from "@/components/ui/Card";
import { useTransactions } from "@/hooks/queries";

export default function TransactionsPage() {
  const transactions = useTransactions();
  const rows = transactions.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-xl font-medium tracking-tight">Операції</h1>
        <p className="mt-1 text-sm text-muted">Усі купівлі, продажі, поповнення та зняття в одному журналі</p>
      </header>

      {transactions.isLoading ? (
        <div className="skeleton h-96 rounded-2xl" />
      ) : transactions.error ? (
        <ErrorNote message={transactions.error.message} onRetry={() => transactions.refetch()} />
      ) : rows.length === 0 ? (
        <Card order={0} className="px-6 py-14 text-center">
          <h2 className="font-display text-xl font-medium">Операцій ще немає</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Операції з&apos;являються, коли ви додаєте актив або записуєте купівлю чи продаж на його сторінці.
          </p>
          <Link href="/" className="mt-5 inline-block font-medium text-accent underline underline-offset-4">
            Перейти до огляду
          </Link>
        </Card>
      ) : (
        <Card order={0} className="overflow-hidden">
          <TransactionTable rows={rows} />
        </Card>
      )}
    </div>
  );
}
