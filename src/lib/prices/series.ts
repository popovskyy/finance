import { toDateKey, type DailyPrice } from "./types";

/** Daily prices with "latest value on or before a date" lookup. */
export class PriceSeries {
  private readonly points: DailyPrice[];

  constructor(points: DailyPrice[] = []) {
    this.points = [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  get length() {
    return this.points.length;
  }

  first(): number | null {
    return this.points[0]?.price ?? null;
  }

  last(): number | null {
    return this.points[this.points.length - 1]?.price ?? null;
  }

  at(date: Date | string): number | null {
    const key = typeof date === "string" ? date : toDateKey(date);
    let lo = 0;
    let hi = this.points.length - 1;
    let found: number | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.points[mid].date <= key) {
        found = this.points[mid].price;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return found;
  }
}
