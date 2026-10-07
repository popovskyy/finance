import { db } from "@/lib/db";
import { coingecko } from "./coingecko";
import { fxPair, searchCurrencies } from "./fx";
import { PriceSeries } from "./series";
import { toDateKey, type Category, type DailyPrice, type PriceProvider, type Quote, type SearchResult } from "./types";
import { yahoo } from "./yahoo";

export { PriceSeries } from "./series";
export * from "./types";

const QUOTE_TTL_MS = 60_000;
const HISTORY_TTL_MS = 10 * 60_000;
// After a failed history download, wait before asking the provider again, so an
// outage or a rate limit is not made worse by a retry on every page load.
const HISTORY_RETRY_MS = 2 * 60_000;

const providers: Record<"CRYPTO" | "STOCK" | "FX", PriceProvider> = {
  CRYPTO: coingecko,
  STOCK: yahoo,
  FX: yahoo,
};

type Source = keyof typeof providers;

interface Caches {
  quotes: Map<string, { quote: Quote; at: number }>;
  history: Map<string, { points: DailyPrice[]; from: string; at: number; stale: boolean }>;
  inflight: Map<string, Promise<unknown>>;
  historyFailedAt: Map<string, number>;
}

// Kept on globalThis so the caches survive dev-server hot reloads.
const globalForPrices = globalThis as unknown as { priceCaches?: Caches };
const caches = (globalForPrices.priceCaches ??= {
  quotes: new Map(),
  history: new Map(),
  inflight: new Map(),
  historyFailedAt: new Map(),
});
caches.historyFailedAt ??= new Map(); // caches created before this field existed (dev hot reload)

function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = caches.inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = run().finally(() => caches.inflight.delete(key));
  caches.inflight.set(key, promise);
  return promise;
}

// FX pairs share the snapshot table with assets under the CASH category.
const snapshotCategory = (source: Source): Category => (source === "FX" ? "CASH" : source);

export async function searchAssets(category: Category, query: string): Promise<SearchResult[]> {
  if (category === "CASH") return searchCurrencies(query);
  if (!query.trim()) return [];
  return providers[category].search(query.trim());
}

/**
 * Live quotes for one source. Fresh values come from a 60-second memory cache;
 * if the provider fails, the last known quote is returned flagged `stale`.
 */
export async function getQuotes(source: Source, ids: string[]): Promise<Record<string, Quote>> {
  const unique = [...new Set(ids)];
  const result: Record<string, Quote> = {};
  const missing: string[] = [];
  const now = Date.now();

  for (const id of unique) {
    const cached = caches.quotes.get(`${source}:${id}`);
    if (cached && now - cached.at < QUOTE_TTL_MS) result[id] = cached.quote;
    else missing.push(id);
  }
  if (missing.length === 0) return result;

  const key = `quotes:${source}:${[...missing].sort().join(",")}`;
  let fetched: Record<string, Quote> = {};
  try {
    fetched = await dedupe(key, () => providers[source].getQuotes(missing));
  } catch (error) {
    console.warn(`[prices] ${source} quotes failed:`, (error as Error).message);
  }

  for (const id of missing) {
    const quote = fetched[id];
    if (quote) {
      caches.quotes.set(`${source}:${id}`, { quote, at: Date.now() });
      result[id] = quote;
      continue;
    }
    const last = caches.quotes.get(`${source}:${id}`);
    if (last) result[id] = { ...last.quote, stale: true };
  }
  return result;
}

interface HistoryMeta {
  from: string;
  fetchedOn: string;
}

async function readSnapshots(category: Category, providerId: string, from: string): Promise<DailyPrice[]> {
  const rows = await db.priceSnapshot.findMany({
    where: { category, providerId, date: { gte: from } },
    orderBy: { date: "asc" },
    select: { date: true, price: true },
  });
  return rows;
}

/**
 * Daily closes since `from`. Fetched from the provider at most once a day per
 * asset and persisted in PriceSnapshot; a provider failure falls back to
 * whatever is stored.
 */
export async function getHistory(
  source: Source,
  id: string,
  from: Date,
): Promise<{ series: PriceSeries; stale: boolean }> {
  const fromKey = toDateKey(from);
  const cacheKey = `${source}:${id}`;
  const cached = caches.history.get(cacheKey);
  if (cached && cached.from <= fromKey && Date.now() - cached.at < HISTORY_TTL_MS) {
    return { series: new PriceSeries(cached.points), stale: cached.stale };
  }

  return dedupe(`history:${cacheKey}:${fromKey}`, async () => {
    const category = snapshotCategory(source);
    const metaKey = `hist:${cacheKey}`;
    const today = toDateKey(new Date());
    const metaRow = await db.setting.findUnique({ where: { key: metaKey } });
    const meta = metaRow ? (JSON.parse(metaRow.value) as HistoryMeta) : null;

    let stale = false;
    const failedAt = caches.historyFailedAt.get(cacheKey);
    const coolingDown = failedAt !== undefined && Date.now() - failedAt < HISTORY_RETRY_MS;
    if (coolingDown) stale = true;
    else if (!meta || meta.from > fromKey || meta.fetchedOn !== today) {
      // Stored range already reaches back far enough: only top up the last few days.
      const covered = meta !== null && meta.from <= fromKey;
      const fetchFrom = covered ? new Date(Date.parse(`${meta.fetchedOn}T00:00:00Z`) - 3 * 86_400_000) : from;
      const nextMeta = JSON.stringify({ from: covered ? meta.from : fromKey, fetchedOn: today });
      try {
        const points = await providers[source].getHistory(id, fetchFrom);
        const currency = source === "CRYPTO" ? "USD" : "";
        await db.$transaction([
          db.priceSnapshot.deleteMany({
            where: { category, providerId: id, date: { in: points.map((p) => p.date) } },
          }),
          db.priceSnapshot.createMany({
            data: points.map((p) => ({ category, providerId: id, date: p.date, price: p.price, currency })),
          }),
          db.setting.upsert({
            where: { key: metaKey },
            create: { key: metaKey, value: nextMeta },
            update: { value: nextMeta },
          }),
        ]);
        caches.historyFailedAt.delete(cacheKey);
      } catch (error) {
        stale = true;
        caches.historyFailedAt.set(cacheKey, Date.now());
        console.warn(`[prices] ${source} history for ${id} failed:`, (error as Error).message);
      }
    }

    const points = await readSnapshots(category, id, fromKey);
    // A failed fetch is not cached, so the next request retries the provider.
    if (!stale) caches.history.set(cacheKey, { points, from: fromKey, at: Date.now(), stale });
    return { series: new PriceSeries(points), stale };
  });
}

export const fx = {
  pair: fxPair,
  async quotes(currencies: string[], base: string): Promise<Record<string, Quote>> {
    const needed = [...new Set(currencies)].filter((c) => c !== base);
    const quotes = await getQuotes("FX", needed.map((c) => fxPair(c, base)));
    const result: Record<string, Quote> = { [base]: { price: 1, prevClose: 1, currency: base } };
    for (const c of needed) {
      const quote = quotes[fxPair(c, base)];
      if (quote) result[c] = quote;
    }

    // Yahoo lacks some direct pairs (e.g. KZT→UAH): cross them through USD.
    const missing = needed.filter((c) => !result[c] && c !== "USD");
    if (missing.length > 0 && base !== "USD") {
      const legs = await getQuotes("FX", [...missing.map((c) => fxPair(c, "USD")), fxPair("USD", base)]);
      const usdToBase = legs[fxPair("USD", base)];
      for (const c of missing) {
        const toUsd = legs[fxPair(c, "USD")];
        if (!toUsd || !usdToBase) continue;
        result[c] = {
          price: toUsd.price * usdToBase.price,
          prevClose: toUsd.prevClose && usdToBase.prevClose ? toUsd.prevClose * usdToBase.prevClose : null,
          currency: base,
          stale: toUsd.stale || usdToBase.stale,
        };
      }
    }
    return result;
  },
  history(currency: string, base: string, from: Date) {
    return getHistory("FX", fxPair(currency, base), from);
  },
};
