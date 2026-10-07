import { describe, expect, it } from "vitest";
import { combinePeriodPnl, periodPnl } from "./performance";
import { computePosition, InsufficientHoldingsError, quantityAt } from "./positions";
import type { Tx } from "./types";

const d = (iso: string) => new Date(`${iso}T12:00:00Z`);
const n = (v: { toNumber(): number }) => v.toNumber();

describe("computePosition", () => {
  it("returns zeros for an empty ledger", () => {
    const p = computePosition([]);
    expect(n(p.quantity)).toBe(0);
    expect(n(p.costBasis)).toBe(0);
    expect(n(p.avgCost)).toBe(0);
    expect(n(p.realizedPnl)).toBe(0);
  });

  it("averages buys made at different prices", () => {
    const p = computePosition([
      { type: "BUY", date: d("2026-01-01"), quantity: 1, price: 100 },
      { type: "BUY", date: d("2026-02-01"), quantity: 3, price: 200 },
    ]);
    expect(n(p.quantity)).toBe(4);
    expect(n(p.costBasis)).toBe(700);
    expect(n(p.avgCost)).toBe(175);
  });

  it("adds buy fees to the cost basis", () => {
    const p = computePosition([{ type: "BUY", date: d("2026-01-01"), quantity: 2, price: 100, fee: 10 }]);
    expect(n(p.costBasis)).toBe(210);
    expect(n(p.avgCost)).toBe(105);
    expect(n(p.totalFees)).toBe(10);
  });

  it("realizes PnL on a partial sell and keeps the average cost", () => {
    const p = computePosition([
      { type: "BUY", date: d("2026-01-01"), quantity: 10, price: 100 },
      { type: "SELL", date: d("2026-02-01"), quantity: 4, price: 150, fee: 5 },
    ]);
    // proceeds 600 − fee 5 − cost 400
    expect(n(p.realizedPnl)).toBe(195);
    expect(n(p.quantity)).toBe(6);
    expect(n(p.costBasis)).toBe(600);
    expect(n(p.avgCost)).toBe(100);
  });

  it("clears the position on a full sell, including at a loss", () => {
    const p = computePosition([
      { type: "BUY", date: d("2026-01-01"), quantity: 3, price: 100 },
      { type: "SELL", date: d("2026-02-01"), quantity: 3, price: 80 },
    ]);
    expect(n(p.quantity)).toBe(0);
    expect(n(p.costBasis)).toBe(0);
    expect(n(p.realizedPnl)).toBe(-60);
  });

  it("leaves no dust after selling a position built from awkward fractions", () => {
    const p = computePosition([
      { type: "BUY", date: d("2026-01-01"), quantity: "0.1", price: 3 },
      { type: "BUY", date: d("2026-01-02"), quantity: "0.2", price: 7 },
      { type: "SELL", date: d("2026-01-03"), quantity: "0.3", price: 10 },
    ]);
    expect(n(p.quantity)).toBe(0);
    expect(n(p.costBasis)).toBe(0);
    expect(n(p.realizedPnl)).toBeCloseTo(1.3, 10);
  });

  it("replays in date order regardless of input order", () => {
    const p = computePosition([
      { type: "SELL", date: d("2026-03-01"), quantity: 1, price: 300 },
      { type: "BUY", date: d("2026-01-01"), quantity: 2, price: 100 },
    ]);
    expect(n(p.quantity)).toBe(1);
    expect(n(p.realizedPnl)).toBe(200);
  });

  it("replays a buy before a sell that shares its timestamp", () => {
    const p = computePosition([
      { type: "SELL", date: d("2026-01-01"), quantity: 1, price: 120 },
      { type: "BUY", date: d("2026-01-01"), quantity: 1, price: 100 },
    ]);
    expect(n(p.quantity)).toBe(0);
    expect(n(p.realizedPnl)).toBe(20);
  });

  it("rejects selling more than is held", () => {
    expect(() =>
      computePosition([
        { type: "BUY", date: d("2026-01-01"), quantity: 1, price: 100 },
        { type: "SELL", date: d("2026-01-02"), quantity: 2, price: 100 },
      ]),
    ).toThrow(InsufficientHoldingsError);
  });

  it("rejects a sell dated before the buy that funds it", () => {
    expect(() =>
      computePosition([
        { type: "SELL", date: d("2026-01-01"), quantity: 1, price: 100 },
        { type: "BUY", date: d("2026-01-02"), quantity: 1, price: 100 },
      ]),
    ).toThrow(InsufficientHoldingsError);
  });

  it("treats cash deposits and withdrawals at price 1 with no gain", () => {
    const p = computePosition([
      { type: "DEPOSIT", date: d("2026-01-01"), quantity: 1000, price: 1 },
      { type: "WITHDRAWAL", date: d("2026-01-05"), quantity: 250, price: 1 },
    ]);
    expect(n(p.quantity)).toBe(750);
    expect(n(p.costBasis)).toBe(750);
    expect(n(p.realizedPnl)).toBe(0);
  });

  it("shows an FX gain on cash when ledger prices are converted to the base currency", () => {
    // 1000 EUR deposited at 1.10 USD, 400 EUR withdrawn at 1.20 USD
    const p = computePosition([
      { type: "DEPOSIT", date: d("2026-01-01"), quantity: 1000, price: "1.10" },
      { type: "WITHDRAWAL", date: d("2026-02-01"), quantity: 400, price: "1.20" },
    ]);
    expect(n(p.realizedPnl)).toBeCloseTo(40, 10);
    expect(n(p.costBasis)).toBeCloseTo(660, 10);
  });
});

describe("quantityAt", () => {
  const txs: Tx[] = [
    { type: "BUY", date: d("2026-01-01"), quantity: 5, price: 1 },
    { type: "SELL", date: d("2026-01-10"), quantity: 2, price: 1 },
  ];
  it("counts only transactions on or before the date", () => {
    expect(n(quantityAt(txs, d("2025-12-31")))).toBe(0);
    expect(n(quantityAt(txs, d("2026-01-05")))).toBe(5);
    expect(n(quantityAt(txs, d("2026-01-10")))).toBe(3);
  });
});

describe("periodPnl", () => {
  it("is zero with no capital for an empty ledger", () => {
    const r = periodPnl({ txs: [], start: d("2026-01-01"), startPrice: 10, endPrice: 20 });
    expect(n(r.abs)).toBe(0);
    expect(r.pct).toBeNull();
  });

  it("measures a pure price move on an existing holding", () => {
    const r = periodPnl({
      txs: [{ type: "BUY", date: d("2026-01-01"), quantity: 2, price: 100 }],
      start: d("2026-02-01"),
      startPrice: 150,
      endPrice: 180,
    });
    expect(n(r.abs)).toBe(60);
    expect(n(r.pct!)).toBe(20);
  });

  it("does not count a deposit made during the period as profit", () => {
    const r = periodPnl({
      txs: [
        { type: "BUY", date: d("2026-01-01"), quantity: 1, price: 100 },
        { type: "BUY", date: d("2026-02-10"), quantity: 1, price: 200 },
      ],
      start: d("2026-02-01"),
      startPrice: 200,
      endPrice: 200,
    });
    expect(n(r.abs)).toBe(0);
    expect(n(r.capital)).toBe(400);
  });

  it("counts fees paid during the period as a loss", () => {
    const r = periodPnl({
      txs: [{ type: "BUY", date: d("2026-02-10"), quantity: 1, price: 200, fee: 4 }],
      start: d("2026-02-01"),
      startPrice: 200,
      endPrice: 200,
    });
    expect(n(r.abs)).toBe(-4);
  });

  it("includes proceeds from a sale during the period", () => {
    const r = periodPnl({
      txs: [
        { type: "BUY", date: d("2026-01-01"), quantity: 2, price: 100 },
        { type: "SELL", date: d("2026-02-10"), quantity: 1, price: 130 },
      ],
      start: d("2026-02-01"),
      startPrice: 110,
      endPrice: 120,
    });
    // end 120 − start 220 + proceeds 130
    expect(n(r.abs)).toBe(30);
  });

  it("matches realized + unrealized over all time", () => {
    const txs: Tx[] = [
      { type: "BUY", date: d("2026-01-01"), quantity: 10, price: 100, fee: 3 },
      { type: "BUY", date: d("2026-01-15"), quantity: 5, price: 160, fee: 2 },
      { type: "SELL", date: d("2026-02-01"), quantity: 6, price: 150, fee: 5 },
    ];
    const endPrice = 170;
    const pos = computePosition(txs);
    const unrealized = pos.quantity.times(endPrice).minus(pos.costBasis);
    const all = periodPnl({ txs, start: null, startPrice: 0, endPrice });
    expect(n(all.abs)).toBeCloseTo(n(pos.realizedPnl.plus(unrealized)), 8);
  });
});

describe("combinePeriodPnl", () => {
  it("weights percentages by capital, including flat positions", () => {
    const a = periodPnl({
      txs: [{ type: "BUY", date: d("2026-01-01"), quantity: 1, price: 100 }],
      start: d("2026-02-01"),
      startPrice: 100,
      endPrice: 110,
    });
    const flat = periodPnl({
      txs: [{ type: "DEPOSIT", date: d("2026-01-01"), quantity: 900, price: 1 }],
      start: d("2026-02-01"),
      startPrice: 1,
      endPrice: 1,
    });
    const total = combinePeriodPnl([a, flat]);
    expect(n(total.abs)).toBe(10);
    expect(n(total.pct!)).toBe(1);
  });
});
