import YahooFinance from "yahoo-finance2";
import { toDateKey, type DailyPrice, type PriceProvider, type Quote, type SearchResult } from "./types";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const SEARCHABLE = new Set(["EQUITY", "ETF", "MUTUALFUND", "INDEX"]);

// Some exchanges quote in minor units (London pence, Johannesburg cents, Tel Aviv agorot).
const MINOR_UNITS: Record<string, string> = { GBp: "GBP", GBX: "GBP", ZAc: "ZAR", ILA: "ILS" };

function normalize(price: number, currency: string) {
  const major = MINOR_UNITS[currency];
  return major ? { price: price / 100, currency: major } : { price, currency };
}

/** Stocks, ETFs and FX pairs from Yahoo Finance (unofficial, no key). */
export const yahoo: PriceProvider = {
  async search(query) {
    const data = await yf.search(query, { newsCount: 0, quotesCount: 10 });
    const results: SearchResult[] = [];
    for (const item of data.quotes as Record<string, unknown>[]) {
      if (typeof item.symbol !== "string" || !SEARCHABLE.has(String(item.quoteType))) continue;
      results.push({
        providerId: item.symbol,
        symbol: item.symbol,
        name: String(item.longname ?? item.shortname ?? item.symbol),
        hint: [item.typeDisp, item.exchDisp].filter(Boolean).join(" · ") || undefined,
      });
    }
    return results;
  },

  async getQuotes(ids) {
    if (ids.length === 0) return {};
    const rows = await yf.quote(ids);
    const quotes: Record<string, Quote> = {};
    for (const row of rows) {
      if (row.regularMarketPrice == null) continue;
      const currency = row.currency ?? "USD";
      const { price, currency: normalized } = normalize(row.regularMarketPrice, currency);
      const prev = row.regularMarketPreviousClose;
      quotes[row.symbol] = {
        price,
        prevClose: prev == null ? null : normalize(prev, currency).price,
        currency: normalized,
      };
    }
    return quotes;
  },

  async getHistory(id, from) {
    const data = await yf.chart(id, { period1: from, interval: "1d" });
    const currency = data.meta.currency ?? "USD";
    const points: DailyPrice[] = [];
    for (const row of data.quotes) {
      if (row.close == null) continue;
      points.push({ date: toDateKey(row.date), price: normalize(row.close, currency).price });
    }
    return points;
  },
};
