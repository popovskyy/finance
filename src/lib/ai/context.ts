import type { PortfolioSummary } from "@/lib/pnl/portfolio";

export const CONCENTRATION_ASSET_PCT = 25;
export const CONCENTRATION_CATEGORY_PCT = 70;

const CATEGORY_LABEL = { CRYPTO: "Крипто", STOCK: "Акції", CASH: "Готівка" } as const;

export interface ConcentrationFlag {
  asset: string;
  allocationPct: number;
  kind: "asset" | "category";
}

/** Rule-based concentration check, so warnings never depend on the model alone. */
export function findConcentration(portfolio: PortfolioSummary): ConcentrationFlag[] {
  const flags: ConcentrationFlag[] = [];
  for (const h of portfolio.holdings) {
    // Cash in the base currency is not a concentration risk in the usual sense.
    if (h.category === "CASH" && h.currency === portfolio.baseCurrency) continue;
    if (h.allocationPct > CONCENTRATION_ASSET_PCT) {
      flags.push({ asset: h.symbol, allocationPct: h.allocationPct, kind: "asset" });
    }
  }
  for (const c of portfolio.categories) {
    if (c.category !== "CASH" && c.allocationPct > CONCENTRATION_CATEGORY_PCT) {
      flags.push({ asset: CATEGORY_LABEL[c.category], allocationPct: c.allocationPct, kind: "category" });
    }
  }
  return flags;
}

const round = (value: number | null, digits = 2) => (value == null ? null : Number(value.toFixed(digits)));

export interface RecentTransaction {
  date: Date;
  type: string;
  symbol: string;
  quantity: number;
  price: number;
  currency: string;
}

/** Compact JSON snapshot of the portfolio sent to the model. */
export function buildAiContext(portfolio: PortfolioSummary, recent: RecentTransaction[]): string {
  const pnl = (p: PortfolioSummary["pnl"]) => ({
    "1D": { abs: round(p["1D"].abs), pct: round(p["1D"].pct) },
    "1W": { abs: round(p["1W"].abs), pct: round(p["1W"].pct) },
    "1M": { abs: round(p["1M"].abs), pct: round(p["1M"].pct) },
    allTime: { abs: round(p.ALL.abs), pct: round(p.ALL.pct) },
  });

  return JSON.stringify({
    asOf: portfolio.asOf,
    baseCurrency: portfolio.baseCurrency,
    netWorth: round(portfolio.netWorth),
    costBasis: round(portfolio.costBasis),
    unrealizedPnl: { abs: round(portfolio.unrealized.abs), pct: round(portfolio.unrealized.pct) },
    realizedPnl: round(portfolio.realized),
    pnl: pnl(portfolio.pnl),
    allocationByCategory: portfolio.categories.map((c) => ({
      category: c.category,
      value: round(c.value),
      allocationPct: round(c.allocationPct),
      pnl: pnl(c.pnl),
    })),
    holdings: portfolio.holdings
      .filter((h) => h.quantity > 0)
      .map((h) => ({
        symbol: h.symbol,
        name: h.name,
        category: h.category,
        currency: h.currency,
        quantity: round(h.quantity, 8),
        price: round(h.price, 6),
        avgBuyPrice: round(h.avgCost, 6),
        valueInBase: round(h.value),
        allocationPct: round(h.allocationPct),
        unrealizedPnl: { abs: round(h.unrealized.abs), pct: round(h.unrealized.pct) },
        realizedPnl: round(h.realized),
        pnl: pnl(h.pnl),
      })),
    concentrationFlags: findConcentration(portfolio).map((f) => ({ ...f, allocationPct: round(f.allocationPct) })),
    recentTransactions: recent.map((t) => ({
      date: t.date.toISOString().slice(0, 10),
      type: t.type,
      symbol: t.symbol,
      quantity: round(t.quantity, 8),
      price: round(t.price, 6),
      currency: t.currency,
    })),
    pricesMayBeStale: portfolio.stale,
  });
}
