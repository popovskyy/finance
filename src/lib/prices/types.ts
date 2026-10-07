export type Category = "CRYPTO" | "STOCK" | "CASH";

export interface Quote {
  price: number;
  /** Previous close (24h-ago price for crypto); null when unknown. */
  prevClose: number | null;
  currency: string;
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
