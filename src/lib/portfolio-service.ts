import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { buildHistory, buildPortfolio, type AssetInput, type HistoryPoint, type PortfolioSummary } from "@/lib/pnl/portfolio";
import { computePosition } from "@/lib/pnl/positions";
import type { Tx } from "@/lib/pnl/types";
import { fx, getHistory, getQuotes, PriceSeries, type Category } from "@/lib/prices";
import { getSettings } from "@/lib/settings";

const DAY_MS = 86_400_000;
// Enough history to price the 1M timeframe even when the ledger is younger.
const MIN_HISTORY_DAYS = 40;

export const RANGE_DAYS = { "1M": 30, "3M": 90, "1Y": 365, ALL: null } as const;
export type HistoryRange = keyof typeof RANGE_DAYS;

interface DbTx {
  type: Tx["type"];
  date: Date;
  quantity: { toString(): string };
  price: { toString(): string };
  fee: { toString(): string };
}

export const toTx = (row: DbTx): Tx => ({
  type: row.type,
  date: row.date,
  quantity: new Decimal(row.quantity.toString()),
  price: new Decimal(row.price.toString()),
  fee: new Decimal(row.fee.toString()),
});

/** Throws InsufficientHoldingsError if the ledger ever goes negative. */
export function assertLedgerValid(txs: Tx[]) {
  computePosition(txs);
}

type LoadedInputs = { inputs: AssetInput[]; baseCurrency: string };
let inflight: Promise<LoadedInputs> | null = null;

/**
 * Loads every asset with its ledger, live quote, price history and FX data.
 * Requests that arrive while a load is running share it (the dashboard asks for
 * the summary and the chart at the same moment); nothing is cached afterwards,
 * so a change to the ledger is visible on the next request.
 */
export function loadAssetInputs(): Promise<LoadedInputs> {
  inflight ??= loadAssetInputsUncached().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function loadAssetInputsUncached(): Promise<LoadedInputs> {
  const [{ baseCurrency }, assets] = await Promise.all([
    getSettings(),
    db.asset.findMany({ include: { transactions: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] } }, orderBy: { createdAt: "asc" } }),
  ]);

  const historyFrom = (firstTx: Date | undefined) =>
    new Date(Math.min(firstTx?.getTime() ?? Date.now(), Date.now() - MIN_HISTORY_DAYS * DAY_MS) - 5 * DAY_MS);

  const idsOf = (category: Category) => assets.filter((a) => a.category === category).map((a) => a.providerId);
  const [cryptoQuotes, stockQuotes, fxQuotes] = await Promise.all([
    getQuotes("CRYPTO", idsOf("CRYPTO")),
    getQuotes("STOCK", idsOf("STOCK")),
    fx.quotes(assets.map((a) => a.currency), baseCurrency),
  ]);

  // One FX history per foreign currency, covering its earliest transaction.
  const fxStart = new Map<string, Date>();
  for (const asset of assets) {
    if (asset.currency === baseCurrency) continue;
    const from = historyFrom(asset.transactions[0]?.date);
    const current = fxStart.get(asset.currency);
    if (!current || from < current) fxStart.set(asset.currency, from);
  }
  const fxHistory = new Map<string, { series: PriceSeries; stale: boolean }>();
  await Promise.all(
    [...fxStart].map(async ([currency, from]) => {
      fxHistory.set(currency, await fx.history(currency, baseCurrency, from));
    }),
  );

  const empty = { series: new PriceSeries(), stale: false };
  const loadPriceHistory = (asset: (typeof assets)[number]) =>
    asset.category === "CASH"
      ? Promise.resolve(empty)
      : getHistory(asset.category, asset.providerId, historyFrom(asset.transactions[0]?.date));

  // Stocks in parallel; crypto one at a time to respect CoinGecko's public rate limit.
  const histories = new Map<string, { series: PriceSeries; stale: boolean }>();
  await Promise.all(
    assets.filter((a) => a.category !== "CRYPTO").map(async (a) => histories.set(a.id, await loadPriceHistory(a))),
  );
  for (const asset of assets.filter((a) => a.category === "CRYPTO")) {
    histories.set(asset.id, await loadPriceHistory(asset));
  }

  const inputs = assets.map<AssetInput>((asset) => {
    const quote =
      asset.category === "CRYPTO"
        ? cryptoQuotes[asset.providerId]
        : asset.category === "STOCK"
          ? stockQuotes[asset.providerId]
          : undefined;
    const history = histories.get(asset.id) ?? empty;
    const foreign = asset.currency !== baseCurrency;
    const fxQuote = fxQuotes[asset.currency];
    const fxSeries = foreign ? (fxHistory.get(asset.currency) ?? empty) : empty;
    const priceMissing = asset.category !== "CASH" && (!quote || quote.stale === true);
    const fxMissing = foreign && (!fxQuote || fxQuote.stale === true);

    return {
      id: asset.id,
      category: asset.category,
      symbol: asset.symbol,
      name: asset.name,
      currency: asset.currency,
      txs: asset.transactions.map(toTx),
      price: quote?.price ?? null,
      prevClose: quote?.prevClose ?? null,
      session: quote?.session,
      history: history.series,
      fx: foreign
        ? { rate: fxQuote?.price ?? null, prevClose: fxQuote?.prevClose ?? null, history: fxSeries.series }
        : { rate: 1, prevClose: 1, history: fxSeries.series },
      stale: priceMissing || fxMissing,
    };
  });

  return { inputs, baseCurrency };
}

export async function getPortfolio(): Promise<PortfolioSummary> {
  const { inputs, baseCurrency } = await loadAssetInputs();
  return buildPortfolio(inputs, baseCurrency);
}

export async function getPortfolioHistory(range: HistoryRange): Promise<HistoryPoint[]> {
  const { inputs } = await loadAssetInputs();
  const days = RANGE_DAYS[range];
  return buildHistory(inputs, days ? new Date(Date.now() - days * DAY_MS) : new Date(0));
}
