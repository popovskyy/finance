"use client";

import clsx from "clsx";
import { useLayoutEffect, useRef, useState } from "react";

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  size?: "sm" | "md";
  /**
   * inline: as wide as its options. fill: stretches to the parent width.
   * grid: two per row in narrow containers, one row from 24rem up.
   */
  layout?: "inline" | "fill" | "grid";
  className?: string;
}

const LAYOUT = {
  inline: "inline-flex",
  fill: "flex w-full",
  grid: "grid w-full grid-cols-2 @sm:flex",
};

/** Radio group drawn as a segmented control; the thumb slides to the active option. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  layout = "inline",
  className,
}: Props<T>) {
  const root = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const [thumb, setThumb] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current.get(value);
      if (el) setThumb({ x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    };
    measure();
    // Re-measure whenever any option changes size: web font swap, container query, rotation.
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    refs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [value, options.length]);

  return (
    <div
      ref={root}
      role="radiogroup"
      aria-label={label}
      className={clsx("relative gap-0.5 rounded-xl bg-line/60 p-1", LAYOUT[layout], className)}
    >
      {thumb && (
        <span
          aria-hidden
          className="seg-thumb absolute top-0 left-0 rounded-lg bg-surface shadow-sm"
          style={{
            transform: `translate(${thumb.x}px, ${thumb.y}px)`,
            width: thumb.width,
            height: thumb.height,
          }}
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
            "relative z-10 flex-auto rounded-lg font-medium whitespace-nowrap transition-colors duration-150",
            size === "md" ? "h-10 px-2.5 text-sm sm:px-3.5" : "h-8 px-2.5 text-sm",
            option.value === value ? "text-ink" : "text-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
