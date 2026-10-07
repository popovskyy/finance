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
    <span className={clsx("tabular inline-flex items-center gap-1", TONE_CLASS[t], className)}>
      {t === "gain" && <ArrowUpRight size="1.1em" aria-hidden />}
      {t === "loss" && <ArrowDownRight size="1.1em" aria-hidden />}
      <span>{formatSignedMoney(abs, currency)}</span>
      {pct !== undefined && pct !== null && <span className="opacity-80">({formatPercent(pct)})</span>}
    </span>
  );
}
