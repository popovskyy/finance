"use client";

import clsx from "clsx";
import { useState } from "react";
import { CATEGORY_COLOR } from "@/lib/labels";
import type { Category } from "@/lib/prices/types";

// Public logo CDNs keyed by ticker; a miss falls back to a monogram.
function logoUrl(category: Category, symbol: string): string | null {
  const s = symbol.toLowerCase();
  if (category === "CRYPTO") return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@0.18.1/svg/color/${s}.svg`;
  if (category === "STOCK") return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol.toUpperCase())}.png`;
  // Currency codes start with the issuing country's code (EUR → EU).
  return /^[a-z]{3}$/.test(s) ? `https://flagcdn.com/${s.slice(0, 2)}.svg` : null;
}

export function AssetAvatar({
  category,
  symbol,
  size = 36,
  className,
}: {
  category: Category;
  symbol: string;
  size?: number;
  className?: string;
}) {
  const url = logoUrl(category, symbol);
  const [failed, setFailed] = useState(false);
  const color = CATEGORY_COLOR[category];

  return (
    <span
      className={clsx("relative grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * (symbol.length >= 3 ? 0.3 : 0.38),
        color,
        background: `color-mix(in oklab, ${color} 16%, var(--surface))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 28%, transparent)`,
      }}
      aria-hidden
    >
      {symbol.slice(0, 3).toUpperCase()}
      {url && !failed && (
        // eslint-disable-next-line @next/next/no-img-element -- remote logos of unknown size, with a fallback
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className={clsx(
            "fade-in absolute inset-0 size-full",
            // Company logos are often dark on transparent, so they sit on white in both themes.
            category === "STOCK" ? "bg-white object-contain p-[16%]" : "bg-surface object-cover",
          )}
        />
      )}
    </span>
  );
}
