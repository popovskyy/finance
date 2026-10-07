import type { Timeframe } from "@/lib/pnl/portfolio";
import type { TxType } from "@/lib/pnl/types";
import type { Category, ExtendedSession } from "@/lib/prices/types";

export const CATEGORY_LABEL: Record<Category, string> = { CRYPTO: "Крипто", STOCK: "Акції", CASH: "Готівка" };

export const CATEGORY_COLOR: Record<Category, string> = {
  CRYPTO: "var(--crypto)",
  STOCK: "var(--stock)",
  CASH: "var(--cash)",
};

export const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  "1D": "День",
  "1W": "Тиждень",
  "1M": "Місяць",
  ALL: "Увесь час",
};

export const TIMEFRAME_PHRASE: Record<Timeframe, string> = {
  "1D": "за добу",
  "1W": "за тиждень",
  "1M": "за місяць",
  ALL: "за весь час",
};

/** Follows a stock price traded outside the regular session. */
export const SESSION_PHRASE: Record<ExtendedSession, string> = { PRE: "на премаркеті", POST: "після закриття" };

export function txTypeLabel(type: TxType, category: Category): string {
  if (category === "CASH") return type === "DEPOSIT" || type === "BUY" ? "Поповнення" : "Зняття";
  return { BUY: "Купівля", SELL: "Продаж", DEPOSIT: "Надходження", WITHDRAWAL: "Виведення" }[type];
}
