"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { useQuote, useSaveTransaction, type TransactionDto } from "@/hooks/queries";
import type { Category } from "@/lib/prices/types";
import { emptyTxForm, readTxForm, TransactionFields, txFormFrom } from "./TransactionFields";

interface AssetRef {
  id: string;
  category: Category;
  symbol: string;
  currency: string;
  /** Present when the caller has the full asset; enables the market-price shortcut. */
  providerId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  asset: AssetRef;
  transaction?: TransactionDto;
}

export function TransactionDialog({ open, onClose, asset, transaction }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={transaction ? "Редагувати операцію" : `Нова операція: ${asset.symbol}`}>
      {open && <Form key={transaction?.id ?? "new"} asset={asset} transaction={transaction} onDone={onClose} />}
    </Dialog>
  );
}

function Form({ asset, transaction, onDone }: { asset: AssetRef; transaction?: TransactionDto; onDone: () => void }) {
  const [state, setState] = useState(() => (transaction ? txFormFrom(transaction) : emptyTxForm(asset.category)));
  const [problem, setProblem] = useState<string | null>(null);
  const save = useSaveTransaction();
  const quote = useQuote(asset.category, transaction ? undefined : asset.providerId);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const input = readTxForm(state, asset.category);
        if (typeof input === "string") return setProblem(input);
        setProblem(null);
        save.mutate({ ...input, id: transaction?.id, assetId: asset.id }, { onSuccess: onDone });
      }}
    >
      <TransactionFields
        state={state}
        onChange={setState}
        category={asset.category}
        currency={asset.currency}
        symbol={asset.symbol}
        marketPrice={quote.data?.price}
      />
      {(problem || save.error) && <ErrorNote message={problem ?? save.error!.message} />}
      <Button type="submit" variant="primary" className="w-full" disabled={save.isPending}>
        {save.isPending ? "Зберігаю…" : transaction ? "Зберегти зміни" : "Додати операцію"}
      </Button>
    </form>
  );
}
