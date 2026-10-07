import Decimal from "decimal.js";
import { isInflow, type Position, type Tx } from "./types";

export class InsufficientHoldingsError extends Error {
  constructor(public readonly date: Date) {
    super("Transaction would sell or withdraw more than is held at that date");
    this.name = "InsufficientHoldingsError";
  }
}

// Dust left over from decimal division when a position is fully closed.
const EPSILON = new Decimal("1e-12");

/** Date order; on the same timestamp inflows come first so a same-day sell is always covered. */
export function sortTxs<T extends Pick<Tx, "date" | "type">>(txs: T[]): T[] {
  return [...txs].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || Number(!isInflow(a.type)) - Number(!isInflow(b.type)),
  );
}

/**
 * Replays a ledger using the average-cost method.
 * BUY/DEPOSIT add units (fees join the cost basis); SELL/WITHDRAWAL remove
 * units at the running average cost and realize the difference to proceeds.
 */
export function computePosition(txs: Tx[], until?: Date): Position {
  let quantity = new Decimal(0);
  let costBasis = new Decimal(0);
  let realizedPnl = new Decimal(0);
  let totalFees = new Decimal(0);

  for (const tx of sortTxs(txs)) {
    if (until && tx.date.getTime() > until.getTime()) break;
    const qty = new Decimal(tx.quantity);
    const price = new Decimal(tx.price);
    const fee = new Decimal(tx.fee ?? 0);
    totalFees = totalFees.plus(fee);

    if (isInflow(tx.type)) {
      quantity = quantity.plus(qty);
      costBasis = costBasis.plus(qty.times(price)).plus(fee);
      continue;
    }

    if (qty.minus(quantity).gt(EPSILON)) throw new InsufficientHoldingsError(tx.date);
    const avgCost = quantity.isZero() ? new Decimal(0) : costBasis.div(quantity);
    const removedCost = avgCost.times(qty);
    realizedPnl = realizedPnl.plus(qty.times(price)).minus(fee).minus(removedCost);
    quantity = quantity.minus(qty);
    costBasis = costBasis.minus(removedCost);
    if (quantity.abs().lte(EPSILON)) {
      quantity = new Decimal(0);
      costBasis = new Decimal(0);
    }
  }

  return {
    quantity,
    costBasis,
    avgCost: quantity.isZero() ? new Decimal(0) : costBasis.div(quantity),
    realizedPnl,
    totalFees,
  };
}

/** Units held at a point in time. */
export function quantityAt(txs: Tx[], at: Date): Decimal {
  let quantity = new Decimal(0);
  for (const tx of txs) {
    if (tx.date.getTime() > at.getTime()) continue;
    const qty = new Decimal(tx.quantity);
    quantity = isInflow(tx.type) ? quantity.plus(qty) : quantity.minus(qty);
  }
  return quantity;
}
