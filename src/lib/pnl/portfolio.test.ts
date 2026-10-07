import { describe, expect, it } from "vitest";
import { PriceSeries } from "@/lib/prices/series";
import { buildHistory, buildPortfolio, type AssetInput } from "./portfolio";

const now = new Date("2026-03-31T12:00:00Z");
const d = (iso: string) => new Date(`${iso}T12:00:00Z`);
const flatFx = { rate: 1, prevClose: 1, history: new PriceSeries() };

const stock: AssetInput = {
  id: "s",
  category: "STOCK",
  symbol: "ACME",
  name: "Acme",
  currency: "USD",
  txs: [{ type: "BUY", date: d("2026-01-10"), quantity: 10, price: 100 }],
  price: 150,
  prevClose: 145,
  history: new PriceSeries([
    { date: "2026-01-10", price: 100 },
    { date: "2026-03-01", price: 120 },
    { date: "2026-03-24", price: 140 },
    { date: "2026-03-30", price: 145 },
  ]),
  fx: flatFx,
  stale: false,
};

const euroCash: AssetInput = {
  id: "c",
  category: "CASH",
  symbol: "EUR",
  name: "Euro",
  currency: "EUR",
  txs: [{ type: "DEPOSIT", date: d("2026-01-10"), quantity: 1000, price: 1 }],
  price: null,
  prevClose: null,
  history: new PriceSeries(),
  fx: {
    rate: 1.2,
    prevClose: 1.19,
    history: new PriceSeries([
      { date: "2026-01-10", price: 1.1 },
      { date: "2026-03-01", price: 1.15 },
    ]),
  },
  stale: false,
};

describe("buildPortfolio", () => {
  it("returns an empty summary with no assets", () => {
    const p = buildPortfolio([], "USD", now);
    expect(p.netWorth).toBe(0);
    expect(p.holdings).toEqual([]);
    expect(p.pnl.ALL).toEqual({ abs: 0, pct: null });
  });

  it("values a stock and reports each timeframe", () => {
    const p = buildPortfolio([stock], "USD", now);
    const h = p.holdings[0];
    expect(h.value).toBe(1500);
    expect(h.avgCost).toBe(100);
    expect(h.unrealized).toEqual({ abs: 500, pct: 50 });
    expect(h.pnl["1D"].abs).toBe(50); // 150 vs previous close 145
    expect(h.pnl["1W"].abs).toBe(100); // 150 vs 140 a week ago
    expect(h.pnl["1M"].abs).toBe(300); // 150 vs 120 thirty days ago
    expect(h.pnl.ALL.abs).toBe(500);
    expect(h.allocationPct).toBe(100);
  });

  it("converts foreign cash and attributes its PnL to the FX move", () => {
    const p = buildPortfolio([euroCash], "USD", now);
    const h = p.holdings[0];
    expect(h.value).toBeCloseTo(1200, 8);
    expect(h.costBasis).toBeCloseTo(1100, 8);
    expect(h.unrealized.abs).toBeCloseTo(100, 8);
    expect(h.pnl["1D"].abs).toBeCloseTo(10, 8);
    expect(h.avgCost).toBe(1);
  });

  it("totals net worth, allocation and category breakdown", () => {
    const p = buildPortfolio([stock, euroCash], "USD", now);
    expect(p.netWorth).toBeCloseTo(2700, 8);
    expect(p.unrealized.abs).toBeCloseTo(600, 8);
    expect(p.pnl.ALL.abs).toBeCloseTo(600, 8);
    expect(p.categories.map((c) => c.category)).toEqual(["STOCK", "CASH"]);
    expect(p.categories[0].allocationPct).toBeCloseTo((1500 / 2700) * 100, 8);
    expect(p.holdings.reduce((sum, h) => sum + h.allocationPct, 0)).toBeCloseTo(100, 8);
  });

  it("falls back to the last transaction price when no market data exists", () => {
    const p = buildPortfolio([{ ...stock, price: null, prevClose: null, history: new PriceSeries() }], "USD", now);
    expect(p.holdings[0].price).toBe(100);
    expect(p.holdings[0].unrealized.abs).toBe(0);
  });
});

describe("buildHistory", () => {
  it("is empty without transactions", () => {
    expect(buildHistory([], d("2026-01-01"), now)).toEqual([]);
  });

  it("starts at the first transaction and ends on today's live value", () => {
    const points = buildHistory([stock, euroCash], d("2025-01-01"), now);
    expect(points[0]).toEqual({ date: "2026-01-10", value: 1000 + 1100 });
    const last = points[points.length - 1];
    expect(last.date).toBe("2026-03-31");
    expect(last.value).toBeCloseTo(2700, 8);
    const march2 = points.find((p) => p.date === "2026-03-02")!;
    expect(march2.value).toBeCloseTo(1200 + 1150, 8);
  });
});
