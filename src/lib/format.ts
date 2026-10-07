const LOCALE = "uk-UA";

export function formatMoney(value: number, currency: string, opts: { compact?: boolean; digits?: number } = {}) {
  const abs = Math.abs(value);
  const digits = opts.digits ?? (abs !== 0 && abs < 1 ? 4 : 2);
  const fraction = {
    notation: opts.compact ? ("compact" as const) : ("standard" as const),
    minimumFractionDigits: opts.compact ? 0 : Math.min(digits, 2),
    maximumFractionDigits: opts.compact ? 1 : digits,
  };
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      ...fraction,
    }).format(value);
  } catch {
    // Not an ISO currency code: show the number with the code as given.
    return `${new Intl.NumberFormat(LOCALE, fraction).format(value)} ${currency}`.trim();
  }
}

/** Money with an explicit sign, for profit and loss. */
export function formatSignedMoney(value: number, currency: string) {
  const text = formatMoney(Math.abs(value), currency);
  if (Math.abs(value) < 0.005) return text;
  return `${value > 0 ? "+" : "−"}${text}`;
}

export function formatPercent(value: number | null, signed = true) {
  if (value == null) return "—";
  const text = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value));
  if (!signed || Math.abs(value) < 0.005) return `${text}%`;
  return `${value > 0 ? "+" : "−"}${text}%`;
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: Math.abs(value) < 1 ? 8 : 4 }).format(value);
}

export function formatDate(value: string | Date, withYear = true) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}

/** Tone for a profit/loss figure; tiny values count as flat. */
export function tone(value: number): "gain" | "loss" | "flat" {
  if (value > 0.005) return "gain";
  if (value < -0.005) return "loss";
  return "flat";
}
