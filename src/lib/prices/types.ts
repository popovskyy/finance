export type Category = "CRYPTO" | "STOCK" | "CASH";

/** Trading outside the regular session: before the open or after the close. */
export type ExtendedSession = "PRE" | "POST";

export interface Quote {
  price: number;
  /** Close the day's change is measured from (24h-ago price for crypto); null when unknown. */
  prevClose: number | null;
  currency: string;
  /** Set when `price` was traded outside the regular session. */
  session?: ExtendedSession;
  /** True when the provider failed and this is the last known value. */
  stale?: boolean;
}

export interface DailyPrice {
  /** YYYY-MM-DD (UTC) */
  date: string;
  price: number;
}

export interface SearchResult {
  providerId: string;
  symbol: string;
  name: string;
  /** Extra context shown in the picker, e.g. exchange or market-cap rank. */
  hint?: string;
}

/** A market-data source. Add a provider by implementing this interface. */
export interface PriceProvider {
  search(query: string): Promise<SearchResult[]>;
  getQuotes(ids: string[]): Promise<Record<string, Quote>>;
  getHistory(id: string, from: Date): Promise<DailyPrice[]>;
}

export const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
