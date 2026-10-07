import type Decimal from "decimal.js";

export type TxType = "BUY" | "SELL" | "DEPOSIT" | "WITHDRAWAL";

/** A ledger entry. `price` and `fee` are in one consistent currency. */
export interface Tx {
  type: TxType;
  date: Date;
  quantity: Decimal.Value;
  price: Decimal.Value;
  fee?: Decimal.Value;
}

export interface Position {
  quantity: Decimal;
  /** Cost of the units still held (fees on acquisition included). */
  costBasis: Decimal;
  /** costBasis / quantity, or 0 when nothing is held. */
  avgCost: Decimal;
  realizedPnl: Decimal;
  totalFees: Decimal;
}

export interface PeriodPnl {
  abs: Decimal;
  /** Capital at work in the period: start value plus inflows. */
  capital: Decimal;
  /** Percentage return, or null when there is no capital to measure against. */
  pct: Decimal | null;
}

export const isInflow = (type: TxType) => type === "BUY" || type === "DEPOSIT";
