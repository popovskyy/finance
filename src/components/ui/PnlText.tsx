import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatPercent, formatSignedMoney, tone } from "@/lib/format";

const TONE_CLASS = { gain: "text-gain", loss: "text-loss", flat: "text-muted" } as const;

interface Props {
  abs: number;
  pct?: number | null;
  currency: string;
  /** "stack" puts the percentage under the amount (table cells). */
  layout?: "inline" | "stack";
  className?: string;
}

/** Profit or loss: green up, red down, with the sign spelled out as well as colored. */
export function PnlText({ abs, pct, currency, layout = "inline", className }: Props) {
  const t = tone(abs);
  if (layout === "stack") {
    return (
      <span className={clsx("tabular flex flex-col items-end leading-tight", TONE_CLASS[t], className)}>
        <span>{formatSignedMoney(abs, currency)}</span>
        {pct !== undefined && <span className="text-xs opacity-80">{formatPercent(pct)}</span>}
      </span>
    );
  }
  return (
    // Wraps the percentage onto its own line when the pair doesn't fit (half-width stat cells on phones)
    <span className={clsx("tabular inline-flex flex-wrap items-center gap-x-1", TONE_CLASS[t], className)}>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        {t === "gain" && <ArrowUpRight size="1.1em" aria-hidden />}
        {t === "loss" && <ArrowDownRight size="1.1em" aria-hidden />}
        {formatSignedMoney(abs, currency)}
      </span>
      {pct !== undefined && pct !== null && <span className="whitespace-nowrap opacity-80">({formatPercent(pct)})</span>}
    </span>
  );
}
