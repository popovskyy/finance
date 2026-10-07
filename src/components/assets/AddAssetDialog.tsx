"use client";

import { ArrowLeft, Search } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { emptyTxForm, readTxForm, TransactionFields } from "@/components/transactions/TransactionFields";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { useAssetSearch, useCreateAsset, useQuote } from "@/hooks/queries";
import { CATEGORY_LABEL } from "@/lib/labels";
import type { Category, SearchResult } from "@/lib/prices/types";

const PLACEHOLDER: Record<Category, string> = {
  CRYPTO: "Bitcoin, ETH, Solana…",
  STOCK: "Apple, VOO, TSLA…",
  CASH: "USD, євро, гривня…",
};

export function AddAssetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Додати актив">
      {open && <Content onDone={onClose} />}
    </Dialog>
  );
}

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function Content({ onDone }: { onDone: () => void }) {
  const [category, setCategory] = useState<Category>("CRYPTO");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [form, setForm] = useState(() => emptyTxForm("CRYPTO"));
  const [problem, setProblem] = useState<string | null>(null);
  const search = useAssetSearch(category, useDebounced(query));
  const create = useCreateAsset();
  const quote = useQuote(category, picked?.providerId);

  if (picked) {
    // Crypto is always quoted in USD; a stock's currency comes with its quote.
    const currency =
      category === "CASH" ? picked.providerId : category === "CRYPTO" ? "USD" : (quote.data?.currency ?? null);
    return (
      <form
        className="fade-in space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const transaction = readTxForm(form, category);
          if (typeof transaction === "string") return setProblem(transaction);
          setProblem(null);
          create.mutate(
            { category, providerId: picked.providerId, symbol: picked.symbol, name: picked.name, transaction },
            { onSuccess: onDone },
          );
        }}
      >
        <button
          type="button"
          onClick={() => setPicked(null)}
          className="pressable flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-left"
        >
          <ArrowLeft size={16} className="shrink-0 text-muted" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{picked.symbol}</span>
            <span className="block truncate text-sm text-muted">{picked.name}</span>
          </span>
          <span className="text-sm text-muted">Змінити</span>
        </button>
        <TransactionFields
          state={form}
          onChange={setForm}
          category={category}
          currency={currency}
          symbol={picked.symbol}
          marketPrice={quote.data?.price}
        />
        {(problem || create.error) && <ErrorNote message={problem ?? create.error!.message} />}
        <Button type="submit" variant="primary" className="w-full" disabled={create.isPending}>
          {create.isPending ? "Додаю…" : "Додати до портфеля"}
        </Button>
      </form>
    );
  }

  const results = search.data ?? [];
  const idle = category !== "CASH" && query.trim().length < 2;

  return (
    <div className="space-y-4">
      <Segmented
        label="Тип активу"
        layout="fill"
        value={category}
        onChange={(next) => {
          setCategory(next);
          setQuery("");
          setForm(emptyTxForm(next));
        }}
        options={(Object.keys(CATEGORY_LABEL) as Category[]).map((value) => ({ value, label: CATEGORY_LABEL[value] }))}
      />
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          autoFocus
          aria-label="Пошук активу"
          className="pl-10"
          placeholder={PLACEHOLDER[category]}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="min-h-64">
        {search.error ? (
          <ErrorNote message={search.error.message} onRetry={() => search.refetch()} />
        ) : idle ? (
          <p className="px-1 pt-6 text-center text-sm text-muted">Почніть вводити назву або тикер</p>
        ) : search.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-14" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="px-1 pt-6 text-center text-sm text-muted">Нічого не знайдено за запитом «{query.trim()}»</p>
        ) : (
          <ul key={`${category}:${search.dataUpdatedAt}`}>
            {results.map((result, i) => (
              <li key={result.providerId} className="row-in" style={{ "--i": i } as CSSProperties}>
                <button
                  type="button"
                  onClick={() => setPicked(result)}
                  className="hover-row pressable flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{result.symbol}</span>
                    <span className="block truncate text-sm text-muted">{result.name}</span>
                  </span>
                  {result.hint && <span className="shrink-0 text-xs text-muted">{result.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
