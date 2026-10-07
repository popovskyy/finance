import Decimal from "decimal.js";
import type { PriceSeries } from "@/lib/prices/series";
import { toDateKey, type Category } from "@/lib/prices/types";
import { combinePeriodPnl, periodPnl } from "./performance";
import { computePosition, quantityAt, sortTxs } from "./positions";
import type { PeriodPnl, Tx } from "./types";

export const TIMEFRAMES = ["1D", "1W", "1M", "ALL"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

const DAY_MS = 86_400_000;
const PERIOD_DAYS: Record<Exclude<Timeframe, "ALL">, number> = { "1D": 1, "1W": 7, "1M": 30 };

/** Everything needed to value one asset; prices are in the asset's own currency. */
export interface AssetInput {
  id: string;
  category: Category;
  symbol: string;
  name: string;
  currency: string;
  txs: Tx[];
  price: number | null;
  prevClose: number | null;
  history: PriceSeries;
  /** Conversion of one unit of `currency` into the base currency. */
  fx: { rate: number | null; prevClose: number | null; history: PriceSeries };
  stale: boolean;
}

export interface Pnl {
  abs: number;
  pct: number | null;
}

export interface Holding {
  id: string;
  category: Category;
  symbol: string;
  name: string;
  currency: string;
  quantity: number;
  /** Current unit price in the asset's currency. */
  price: number;
  /** Average buy price in the asset's currency. */
  avgCost: number;
  /** Figures below are in the base currency. */
  value: number;
  costBasis: number;
  unrealized: Pnl;
  realized: number;
  pnl: Record<Timeframe, Pnl>;
  allocationPct: number;
  stale: boolean;
}

export interface PortfolioSummary {
  baseCurrency: string;
  asOf: string;
  netWorth: number;
  costBasis: number;
  unrealized: Pnl;
  realized: number;
  pnl: Record<Timeframe, Pnl>;
  categories: { category: Category; value: number; allocationPct: number; pnl: Record<Timeframe, Pnl> }[];
  holdings: Holding[];
  stale: boolean;
}

export interface HistoryPoint {
  date: string;
  value: number;
}

const toPnl = (p: PeriodPnl): Pnl => ({ abs: p.abs.toNumber(), pct: p.pct ? p.pct.toNumber() : null });

function lastTxPrice(txs: Tx[], at: Date): number | null {
  let price: number | null = null;
  for (const tx of sortTxs(txs)) {
    if (price !== null && tx.date.getTime() > at.getTime()) break;
    price = new Decimal(tx.price).toNumber();
  }
  return price;
}

/** Unit price on a past date in the asset's currency, falling back to the ledger. */
function nativePriceAt(asset: AssetInput, at: Date): number {
  if (asset.category === "CASH") return 1;
  return asset.history.at(at) ?? lastTxPrice(asset.txs, at) ?? asset.history.first() ?? 0;
}

function fxAt(asset: AssetInput, at: Date): number {
  return asset.fx.history.at(at) ?? asset.fx.history.first() ?? asset.fx.rate ?? 1;
}

function currentNativePrice(asset: AssetInput, now: Date): number {
  if (asset.category === "CASH") return 1;
  return asset.price ?? asset.history.last() ?? lastTxPrice(asset.txs, now) ?? 0;
}

const currentFx = (asset: AssetInput) => asset.fx.rate ?? asset.fx.history.last() ?? 1;

/** Ledger restated in the base currency using the FX rate on each transaction date. */
function toBaseTxs(asset: AssetInput): Tx[] {
  return asset.txs.map((tx) => {
    const rate = fxAt(asset, tx.date);
    return {
      ...tx,
      price: new Decimal(tx.price).times(rate),
      fee: new Decimal(tx.fee ?? 0).times(rate),
    };
  });
}

function assetPeriods(asset: AssetInput, baseTxs: Tx[], endPrice: number, now: Date): Record<Timeframe, PeriodPnl> {
  const result = {} as Record<Timeframe, PeriodPnl>;
  for (const tf of TIMEFRAMES) {
    if (tf === "ALL") {
      result[tf] = periodPnl({ txs: baseTxs, start: null, startPrice: 0, endPrice, end: now });
      continue;
    }
    const start = new Date(now.getTime() - PERIOD_DAYS[tf] * DAY_MS);
    // For a single day the provider's previous close is more precise than daily history.
    const native =
      tf === "1D" && asset.category !== "CASH" && asset.prevClose != null
        ? asset.prevClose
        : nativePriceAt(asset, start);
    const rate = tf === "1D" && asset.fx.prevClose != null ? asset.fx.prevClose : fxAt(asset, start);
    result[tf] = periodPnl({ txs: baseTxs, start, startPrice: native * rate, endPrice, end: now });
  }
  return result;
}

export function buildPortfolio(assets: AssetInput[], baseCurrency: string, now = new Date()): PortfolioSummary {
  const rows = assets.map((asset) => {
    const nativePrice = currentNativePrice(asset, now);
    const basePrice = nativePrice * currentFx(asset);
    const baseTxs = toBaseTxs(asset);
    const native = computePosition(asset.txs, now);
    const base = computePosition(baseTxs, now);
    const value = base.quantity.times(basePrice);
    const unrealized = value.minus(base.costBasis);
    return { asset, nativePrice, native, base, value, unrealized, periods: assetPeriods(asset, baseTxs, basePrice, now) };
  });

  const netWorth = Decimal.sum(0, ...rows.map((r) => r.value));
  const costBasis = Decimal.sum(0, ...rows.map((r) => r.base.costBasis));
  const unrealized = netWorth.minus(costBasis);
  const share = (value: Decimal) => (netWorth.gt(0) ? value.div(netWorth).times(100).toNumber() : 0);

  const combine = (subset: typeof rows) => {
    const result = {} as Record<Timeframe, Pnl>;
    for (const tf of TIMEFRAMES) result[tf] = toPnl(combinePeriodPnl(subset.map((r) => r.periods[tf])));
    return result;
  };

  const holdings: Holding[] = rows
    .map((r) => ({
      id: r.asset.id,
      category: r.asset.category,
      symbol: r.asset.symbol,
      name: r.asset.name,
      currency: r.asset.currency,
      quantity: r.native.quantity.toNumber(),
      price: r.nativePrice,
      avgCost: r.native.avgCost.toNumber(),
      value: r.value.toNumber(),
      costBasis: r.base.costBasis.toNumber(),
      unrealized: {
        abs: r.unrealized.toNumber(),
        pct: r.base.costBasis.gt(0) ? r.unrealized.div(r.base.costBasis).times(100).toNumber() : null,
      },
      realized: r.base.realizedPnl.toNumber(),
      pnl: Object.fromEntries(TIMEFRAMES.map((tf) => [tf, toPnl(r.periods[tf])])) as Record<Timeframe, Pnl>,
      allocationPct: share(r.value),
      stale: r.asset.stale,
    }))
    .sort((a, b) => b.value - a.value);

  const order: Category[] = ["CRYPTO", "STOCK", "CASH"];
  const categories = order
    .map((category) => {
      const subset = rows.filter((r) => r.asset.category === category);
      return { category, subset, value: Decimal.sum(0, ...subset.map((r) => r.value)) };
    })
    .filter((c) => c.subset.length > 0)
    .map((c) => ({
      category: c.category,
      value: c.value.toNumber(),
      allocationPct: share(c.value),
      pnl: combine(c.subset),
    }));

  return {
    baseCurrency,
    asOf: now.toISOString(),
    netWorth: netWorth.toNumber(),
    costBasis: costBasis.toNumber(),
    unrealized: {
      abs: unrealized.toNumber(),
      pct: costBasis.gt(0) ? unrealized.div(costBasis).times(100).toNumber() : null,
    },
    realized: Decimal.sum(0, ...rows.map((r) => r.base.realizedPnl)).toNumber(),
    pnl: combine(rows),
    categories,
    holdings,
    stale: assets.some((a) => a.stale),
  };
}

/** Net worth in the base currency for each day from `from` to `now`. */
export function buildHistory(assets: AssetInput[], from: Date, now = new Date()): HistoryPoint[] {
  const firstTx = Math.min(...assets.flatMap((a) => a.txs.map((tx) => tx.date.getTime())));
  if (!Number.isFinite(firstTx)) return [];

  const startMs = Date.UTC(
    new Date(Math.max(from.getTime(), firstTx)).getUTCFullYear(),
    new Date(Math.max(from.getTime(), firstTx)).getUTCMonth(),
    new Date(Math.max(from.getTime(), firstTx)).getUTCDate(),
  );
  const todayKey = toDateKey(now);
  const totalDays = Math.floor((now.getTime() - startMs) / DAY_MS) + 1;
  const step = Math.max(1, Math.ceil(totalDays / 370));
  const points: HistoryPoint[] = [];

  const valueAt = (at: Date, live: boolean) => {
    let total = new Decimal(0);
    for (const asset of assets) {
      const quantity = quantityAt(asset.txs, at);
      if (quantity.isZero()) continue;
      const price = live ? currentNativePrice(asset, now) * currentFx(asset) : nativePriceAt(asset, at) * fxAt(asset, at);
      total = total.plus(quantity.times(price));
    }
    return total.toNumber();
  };

  for (let ms = startMs; ; ms += step * DAY_MS) {
    const endOfDay = new Date(ms + DAY_MS - 1);
    const key = toDateKey(endOfDay);
    if (key >= todayKey) break;
    points.push({ date: key, value: valueAt(endOfDay, false) });
  }
  points.push({ date: todayKey, value: valueAt(now, true) });
  return points;
}
