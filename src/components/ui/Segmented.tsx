"use client";

import clsx from "clsx";
import { useLayoutEffect, useRef, useState } from "react";

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** Radio group drawn as a segmented control; the thumb slides to the active option. */
export function Segmented<T extends string>({ value, onChange, options, label, size = "md", className }: Props<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const [thumb, setThumb] = useState<{ x: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current.get(value);
      if (el) setThumb({ x: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, options.length]);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={clsx("relative inline-flex rounded-xl bg-line/60 p-1", className)}
    >
      {thumb && (
        <span
          aria-hidden
          className="seg-thumb absolute top-1 bottom-1 left-0 rounded-lg bg-surface shadow-sm"
          style={{ transform: `translateX(${thumb.x}px)`, width: thumb.width }}
        />
      )}
      {options.map((option) => (
        <button
          key={option.value}
          ref={(el) => {
            if (el) refs.current.set(option.value, el);
            else refs.current.delete(option.value);
          }}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={clsx(
            "relative z-10 flex-1 rounded-lg font-medium whitespace-nowrap transition-colors duration-150",
            size === "md" ? "h-9 px-3.5 text-sm" : "h-8 px-2.5 text-[13px]",
            option.value === value ? "text-ink" : "text-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
