import { afterEach, describe, expect, it } from "vitest";
import { authToken, isAuthorized, safeEqual } from "./auth";

describe("auth", () => {
  afterEach(() => {
    delete process.env.APP_PASSWORD;
  });

  it("is open when no password is configured", async () => {
    expect(await isAuthorized(undefined)).toBe(true);
  });

  it("accepts only the token for the current password", async () => {
    process.env.APP_PASSWORD = "secret";
    expect(await isAuthorized(undefined)).toBe(false);
    expect(await isAuthorized(await authToken("wrong"))).toBe(false);
    expect(await isAuthorized(await authToken("secret"))).toBe(true);
  });

  it("compares strings of different length safely", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "a")).toBe(false);
  });
});
