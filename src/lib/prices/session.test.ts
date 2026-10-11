import { describe, expect, it } from "vitest";
import { sessionQuote, type SessionFields } from "./session";

// New York is UTC−4 in October 2026. Friday 9 Oct closed at 100 after 98 on Thursday.
const et = (day: number, time: string) => new Date(`2026-10-${String(day).padStart(2, "0")}T${time}:00-04:00`);
const friday: SessionFields = {
  regularMarketPrice: 100,
  regularMarketTime: et(9, "16:00"),
  regularMarketPreviousClose: 98,
  postMarketPrice: 101,
  postMarketTime: et(9, "19:59"),
  exchangeTimezoneName: "America/New_York",
};

describe("sessionQuote", () => {
  it("measures the regular session from the previous close", () => {
    const row = { ...friday, regularMarketTime: et(9, "11:00"), postMarketPrice: undefined, postMarketTime: undefined };
    expect(sessionQuote(row, et(9, "11:01"))).toEqual({ price: 100, prevClose: 98, closed: false });
  });

  it("keeps after-hours trades in the same day", () => {
    expect(sessionQuote(friday, et(9, "19:59"))).toEqual({ price: 101, prevClose: 98, closed: false });
  });

  it("shows no change on a weekend", () => {
    expect(sessionQuote(friday, et(11, "10:00"))).toEqual({ price: 101, prevClose: 101, closed: true });
    expect(sessionQuote(friday, et(10, "09:00"))).toEqual({ price: 101, prevClose: 101, closed: true });
  });

  it("starts Monday with the Sunday-evening overnight session, from Friday's close", () => {
    const row = { ...friday, postMarketPrice: 103, postMarketTime: et(11, "21:30") };
    expect(sessionQuote(row, et(11, "21:31"))).toEqual({ price: 103, prevClose: 100, closed: false });
    expect(sessionQuote(row, et(12, "02:00"))).toEqual({ price: 103, prevClose: 100, closed: false });
  });

  it("treats weekday overnight and pre-market as the next day", () => {
    const monday = { ...friday, regularMarketTime: et(12, "16:00"), postMarketTime: et(12, "21:00") };
    expect(sessionQuote(monday, et(12, "21:01")).prevClose).toBe(100);
    const pre = { ...monday, postMarketTime: et(12, "19:00"), preMarketPrice: 104, preMarketTime: et(13, "07:00") };
    expect(sessionQuote(pre, et(13, "07:01"))).toEqual({ price: 104, prevClose: 100, closed: false });
  });

  it("keeps yesterday's move on a weekday morning before trading resumes", () => {
    const monday = { ...friday, regularMarketTime: et(12, "16:00"), postMarketPrice: undefined, postMarketTime: undefined };
    expect(sessionQuote(monday, et(13, "03:00"))).toEqual({ price: 100, prevClose: 98, closed: false });
  });

  it("goes idle on a weekday holiday", () => {
    const row = { ...friday, regularMarketTime: et(12, "16:00"), postMarketTime: et(12, "18:00") };
    expect(sessionQuote(row, et(13, "15:00")).closed).toBe(true);
  });

  it("falls back to the plain quote without timestamps", () => {
    expect(sessionQuote({ regularMarketPrice: 5, regularMarketPreviousClose: 4 }, et(11, "10:00"))).toEqual({
      price: 5,
      prevClose: 4,
      closed: false,
    });
  });
});
