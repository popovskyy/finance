/** The Yahoo quote fields that describe trading sessions. */
export interface SessionFields {
  regularMarketPrice: number;
  regularMarketTime?: Date;
  regularMarketPreviousClose?: number;
  preMarketPrice?: number;
  preMarketTime?: Date;
  /** After hours, and Yahoo also reports the overnight (Blue Ocean, 8 PM–4 AM ET) session here. */
  postMarketPrice?: number;
  postMarketTime?: Date;
  exchangeTimezoneName?: string;
}

export interface SessionQuote {
  price: number;
  prevClose: number | null;
  /** No trading today: the day's change is zero and the UI shows it as idle. */
  closed: boolean;
}

const HOUR_MS = 3_600_000;
// On a weekday the last trade can be this old and still count as the latest session,
// so the previous day's move stays on screen until the next session opens.
const WEEKDAY_IDLE_MS = 18 * HOUR_MS;
// After-hours ends at 8 PM exchange time; a later trade is the overnight session of the next day.
const OVERNIGHT_FROM_HOUR = 20;

function local(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    weekend: parts.weekday === "Sat" || parts.weekday === "Sun",
  };
}

/**
 * Current price and the day's baseline across the regular, pre-market, after-hours
 * and overnight sessions. Pre-market and overnight trades start a new day, measured
 * from the last regular close; after-hours extends the regular day. On a weekend or
 * holiday without trades the quote is `closed`, with no change for the day.
 */
export function sessionQuote(row: SessionFields, now: Date): SessionQuote {
  const regular = { price: row.regularMarketPrice, time: row.regularMarketTime };
  const fallback = { price: regular.price, prevClose: row.regularMarketPreviousClose ?? null, closed: false };
  if (!regular.time) return fallback;

  let tz = row.exchangeTimezoneName ?? "America/New_York";
  try {
    local(now, tz);
  } catch {
    tz = "UTC";
  }
  const regularDay = local(regular.time, tz).day;

  let latest: { price: number; time: Date; newDay: boolean } = { ...regular, time: regular.time, newDay: false };
  if (row.postMarketPrice != null && row.postMarketTime && row.postMarketTime > latest.time) {
    const at = local(row.postMarketTime, tz);
    const overnight = at.day !== regularDay || at.hour >= OVERNIGHT_FROM_HOUR;
    latest = { price: row.postMarketPrice, time: row.postMarketTime, newDay: overnight };
  }
  if (row.preMarketPrice != null && row.preMarketTime && row.preMarketTime > latest.time) {
    latest = { price: row.preMarketPrice, time: row.preMarketTime, newDay: true };
  }

  const today = local(now, tz);
  const tradedToday = local(latest.time, tz).day === today.day;
  const idle = today.weekend || now.getTime() - latest.time.getTime() > WEEKDAY_IDLE_MS;
  if (!tradedToday && idle) return { price: latest.price, prevClose: latest.price, closed: true };

  return {
    price: latest.price,
    prevClose: latest.newDay ? regular.price : (row.regularMarketPreviousClose ?? null),
    closed: false,
  };
}
