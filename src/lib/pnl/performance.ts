import Decimal from "decimal.js";
import { quantityAt } from "./positions";
import { isInflow, type PeriodPnl, type Tx } from "./types";

export interface PeriodInput {
  txs: Tx[];
  /** Start of the period; null means since the first transaction. */
  start: Date | null;
  /** Unit price at the start of the period (ignored when start is null). */
  startPrice: Decimal.Value;
  /** Unit price now. */
  endPrice: Decimal.Value;
  end?: Date;
}

/**
 * Profit over a period, net of money moved in or out during it:
 *   end value − start value − inflows + outflows
 * so a fresh deposit never shows up as profit. The percentage is measured
 * against the capital at work: start value plus inflows during the period.
 */
export function periodPnl({ txs, start, startPrice, endPrice, end }: PeriodInput): PeriodPnl {
  const endDate = end ?? new Date(8.64e15);
  const startValue = start ? quantityAt(txs, start).times(startPrice) : new Decimal(0);
  const endValue = quantityAt(txs, endDate).times(endPrice);

  let inflows = new Decimal(0);
  let outflows = new Decimal(0);
  for (const tx of txs) {
    const t = tx.date.getTime();
    if (start && t <= start.getTime()) continue;
    if (t > endDate.getTime()) continue;
    const gross = new Decimal(tx.quantity).times(tx.price);
    const fee = new Decimal(tx.fee ?? 0);
    if (isInflow(tx.type)) inflows = inflows.plus(gross).plus(fee);
    else outflows = outflows.plus(gross).minus(fee);
  }

  const abs = endValue.minus(startValue).minus(inflows).plus(outflows);
  const capital = startValue.plus(inflows);
  return { abs, capital, pct: capital.gt(0) ? abs.div(capital).times(100) : null };
}

/** Combines per-asset results into one figure, weighting by capital at work. */
export function combinePeriodPnl(parts: PeriodPnl[]): PeriodPnl {
  let abs = new Decimal(0);
  let capital = new Decimal(0);
  for (const part of parts) {
    abs = abs.plus(part.abs);
    capital = capital.plus(part.capital);
  }
  return { abs, capital, pct: capital.gt(0) ? abs.div(capital).times(100) : null };
}
