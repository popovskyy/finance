"use client";

import { Field, Input } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import type { TransactionInput } from "@/hooks/queries";
import { formatMoney } from "@/lib/format";
import { txTypeLabel } from "@/lib/labels";
import type { TxType } from "@/lib/pnl/types";
import type { Category } from "@/lib/prices/types";

export interface TxFormState {
  type: TxType;
  date: string;
  quantity: string;
  price: string;
  fee: string;
  note: string;
  /** Original timestamp when editing, so an unchanged date keeps its time. */
  originalDate?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function emptyTxForm(category: Category): TxFormState {
  return {
    type: category === "CASH" ? "DEPOSIT" : "BUY",
    date: toDateInput(new Date()),
    quantity: "",
    price: "",
    fee: "",
    note: "",
  };
}

export function txFormFrom(tx: { type: TxType; date: string; quantity: string; price: string; fee: string; note: string | null }): TxFormState {
  return {
    type: tx.type,
    date: toDateInput(new Date(tx.date)),
    quantity: String(Number(tx.quantity)),
    price: String(Number(tx.price)),
    fee: Number(tx.fee) ? String(Number(tx.fee)) : "",
    note: tx.note ?? "",
    originalDate: tx.date,
  };
}

const parse = (text: string) => Number(text.replace(/\s/g, "").replace(",", "."));

function resolveDate(state: TxFormState): string {
  if (state.originalDate && toDateInput(new Date(state.originalDate)) === state.date) return state.originalDate;
  // Today means "now"; a past day is recorded at noon to stay clear of timezone edges.
  if (state.date === toDateInput(new Date())) return new Date().toISOString();
  return new Date(`${state.date}T12:00:00`).toISOString();
}

/** Returns the API payload, or a message describing what is missing. */
export function readTxForm(state: TxFormState, category: Category): TransactionInput | string {
  const quantity = parse(state.quantity);
  const price = category === "CASH" ? 1 : parse(state.price);
  const fee = state.fee.trim() ? parse(state.fee) : 0;
  if (!Number.isFinite(quantity) || quantity <= 0) return category === "CASH" ? "Вкажіть суму" : "Вкажіть кількість";
  if (!Number.isFinite(price) || price < 0) return "Вкажіть ціну за одиницю";
  if (!Number.isFinite(fee) || fee < 0) return "Комісія має бути числом";
  if (!state.date) return "Вкажіть дату";
  return { type: state.type, date: resolveDate(state), quantity, price, fee, note: state.note.trim() || undefined };
}

interface Props {
  state: TxFormState;
  onChange: (state: TxFormState) => void;
  category: Category;
  /** Quote currency; null while it is still being looked up. */
  currency: string | null;
  symbol: string;
  /** Current market price, offered as a one-tap fill for the price field. */
  marketPrice?: number;
}

export function TransactionFields({ state, onChange, category, currency, symbol, marketPrice }: Props) {
  const code = currency ?? undefined;
  const set = (patch: Partial<TxFormState>) => onChange({ ...state, ...patch });
  const isCash = category === "CASH";
  const types: TxType[] = isCash ? ["DEPOSIT", "WITHDRAWAL"] : ["BUY", "SELL", "DEPOSIT", "WITHDRAWAL"];

  const quantity = parse(state.quantity);
  const price = parse(state.price);
  const fee = state.fee.trim() ? parse(state.fee) : 0;
  const inflow = state.type === "BUY" || state.type === "DEPOSIT";
  const total = quantity * price + (inflow ? fee : -fee);
  const showTotal = !isCash && Number.isFinite(total) && quantity > 0 && price > 0;

  return (
    <div className="space-y-4">
      <Segmented
        label="Тип операції"
        size="sm"
        className="flex w-full"
        value={state.type}
        onChange={(type) => set({ type })}
        options={types.map((type) => ({ value: type, label: txTypeLabel(type, category) }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label={isCash ? "Сума" : "Кількість"} hint={symbol}>
          <Input
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={state.quantity}
            onChange={(e) => set({ quantity: e.target.value })}
          />
        </Field>
        {isCash ? (
          <Field label="Дата">
            <Input type="date" value={state.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
        ) : (
          <Field label="Ціна за одиницю" hint={code}>
            <Input
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={state.price}
              onChange={(e) => set({ price: e.target.value })}
            />
          </Field>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {!isCash && (
          <Field label="Дата">
            <Input type="date" value={state.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
        )}
        <Field label="Комісія" hint={code}>
          <Input
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={state.fee}
            onChange={(e) => set({ fee: e.target.value })}
          />
        </Field>
      </div>
      {!isCash && marketPrice !== undefined && currency && (
        <button
          type="button"
          onClick={() => set({ price: String(marketPrice) })}
          className="pressable tabular -mt-1 text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          Підставити поточну ціну: {formatMoney(marketPrice, currency)}
        </button>
      )}
      <Field label="Нотатка" hint="необов'язково">
        <Input value={state.note} maxLength={500} onChange={(e) => set({ note: e.target.value })} />
      </Field>
      {showTotal && (
        <p className="tabular flex items-baseline justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
          <span className="text-muted">{inflow ? "Разом із комісією" : "Отримаєте після комісії"}</span>
          <span className="text-base font-semibold">{formatMoney(total, currency ?? "")}</span>
        </p>
      )}
    </div>
  );
}
