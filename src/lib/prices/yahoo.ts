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

interface SessionPrices {
  regularMarketPrice?: number;
  regularMarketTime?: Date;
  regularMarketPreviousClose?: number;
  preMarketPrice?: number;
  preMarketTime?: Date;
  postMarketPrice?: number;
  postMarketTime?: Date;
}

type SessionQuote = Pick<Quote, "price" | "prevClose" | "session">;

/**
 * The most recent trade, extended hours included, as brokers show it. A
 * pre-market price moves from the last close; an after-hours one from the close
 * before it, so the day's change covers the whole trading day. An extended
 * price only counts when it is newer than the last regular trade.
 */
export function latestPrice(row: SessionPrices): SessionQuote | null {
  if (row.regularMarketPrice == null) return null;
  const prevClose = row.regularMarketPreviousClose ?? null;
  let latest: SessionQuote = { price: row.regularMarketPrice, prevClose };
  if (!row.regularMarketTime) return latest;

  let at = row.regularMarketTime.getTime();
  if (row.postMarketPrice != null && row.postMarketTime && row.postMarketTime.getTime() > at) {
    latest = { price: row.postMarketPrice, prevClose, session: "POST" };
    at = row.postMarketTime.getTime();
  }
  if (row.preMarketPrice != null && row.preMarketTime && row.preMarketTime.getTime() > at) {
    latest = { price: row.preMarketPrice, prevClose: row.regularMarketPrice, session: "PRE" };
  }
  return latest;
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
      // ECN quotes are typed as a bare index signature, which TS won't match without a cast.
      const latest = latestPrice(row as SessionPrices);
      if (!latest) continue;
      const currency = row.currency ?? "USD";
      const { price, currency: normalized } = normalize(latest.price, currency);
      quotes[row.symbol] = {
        price,
        prevClose: latest.prevClose == null ? null : normalize(latest.prevClose, currency).price,
        currency: normalized,
        session: latest.session,
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
