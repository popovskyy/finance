import { describe, expect, it } from "vitest";
import { latestPrice } from "./yahoo";

// New York is UTC-4 in October: the regular session runs 13:30-20:00 UTC.
const yesterdayClose = {
  regularMarketPrice: 150,
  regularMarketTime: new Date("2026-10-06T20:00:00Z"),
  regularMarketPreviousClose: 145,
};

describe("latestPrice", () => {
  it("uses the regular session price when nothing traded after it", () => {
    expect(latestPrice(yesterdayClose)).toEqual({ price: 150, prevClose: 145 });
  });

  it("takes the after-hours price, measured from the close before the session", () => {
    const row = { ...yesterdayClose, postMarketPrice: 152, postMarketTime: new Date("2026-10-06T23:59:00Z") };
    expect(latestPrice(row)).toEqual({ price: 152, prevClose: 145, session: "POST" });
  });

  it("takes the pre-market price, measured from the last close", () => {
    const row = {
      ...yesterdayClose,
      postMarketPrice: 152,
      postMarketTime: new Date("2026-10-06T23:59:00Z"),
      preMarketPrice: 155,
      preMarketTime: new Date("2026-10-07T12:50:00Z"),
    };
    expect(latestPrice(row)).toEqual({ price: 155, prevClose: 150, session: "PRE" });
  });

  it("ignores extended-hours prices older than the last regular trade", () => {
    const row = {
      regularMarketPrice: 151,
      regularMarketTime: new Date("2026-10-07T15:00:00Z"),
      regularMarketPreviousClose: 150,
      preMarketPrice: 155,
      preMarketTime: new Date("2026-10-07T13:29:00Z"),
      postMarketPrice: 152,
      postMarketTime: new Date("2026-10-06T23:59:00Z"),
    };
    expect(latestPrice(row)).toEqual({ price: 151, prevClose: 150 });
  });

  it("keeps the regular price when the trade times are unknown", () => {
    const row = { regularMarketPrice: 150, regularMarketPreviousClose: 145, preMarketPrice: 155 };
    expect(latestPrice(row)).toEqual({ price: 150, prevClose: 145 });
  });

  it("returns null without a regular price", () => {
    expect(latestPrice({ preMarketPrice: 155, preMarketTime: new Date() })).toBeNull();
  });
});
