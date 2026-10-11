"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Briefly tints its content green or red when `value` moves, like a ticker. */
export function Flash({ value, children, className }: { value: number; children: ReactNode; className?: string }) {
  const previous = useRef(value);
  const [flash, setFlash] = useState<{ dir: "up" | "down"; n: number } | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    if (Math.abs(value - before) < 0.005) return;
    setFlash((f) => ({ dir: value > before ? "up" : "down", n: (f?.n ?? 0) + 1 }));
  }, [value]);

  return (
    <span key={flash?.n ?? 0} className={clsx(flash && `flash-${flash.dir}`, className)}>
      {children}
    </span>
  );
}
