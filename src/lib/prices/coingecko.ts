import { toDateKey, type DailyPrice, type PriceProvider, type Quote, type SearchResult } from "./types";

const BASE_URL = "https://api.coingecko.com/api/v3";
// The public/demo tier only serves the last 365 days of history.
const MAX_HISTORY_DAYS = 365;

async function request<T>(path: string): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (process.env.COINGECKO_API_KEY) headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  const res = await fetch(`${BASE_URL}${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

/** Crypto prices from CoinGecko, quoted in USD. */
export const coingecko: PriceProvider = {
  async search(query) {
    const data = await request<{
      coins: { id: string; name: string; symbol: string; market_cap_rank: number | null }[];
    }>(`/search?query=${encodeURIComponent(query)}`);
    return data.coins.slice(0, 10).map<SearchResult>((coin) => ({
      providerId: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      hint: coin.market_cap_rank ? `Rank #${coin.market_cap_rank}` : undefined,
    }));
  },

  async getQuotes(ids) {
    if (ids.length === 0) return {};
    const data = await request<Record<string, { usd?: number; usd_24h_change?: number | null }>>(
      `/simple/price?ids=${ids.map(encodeURIComponent).join(",")}&vs_currencies=usd&include_24hr_change=true`,
    );
    const quotes: Record<string, Quote> = {};
    for (const id of ids) {
      const row = data[id];
      if (row?.usd == null) continue;
      const change = row.usd_24h_change;
      quotes[id] = {
        price: row.usd,
        prevClose: change == null ? null : row.usd / (1 + change / 100),
        currency: "USD",
      };
    }
    return quotes;
  },

  async getHistory(id, from) {
    const wanted = Math.ceil((Date.now() - from.getTime()) / 86_400_000) + 1;
    const days = Math.max(2, Math.min(MAX_HISTORY_DAYS, wanted));
    const data = await request<{ prices: [number, number][] }>(
      `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
    );
    const byDate = new Map<string, number>();
    for (const [ms, price] of data.prices) byDate.set(toDateKey(new Date(ms)), price);
    return [...byDate].map<DailyPrice>(([date, price]) => ({ date, price }));
  },
};
