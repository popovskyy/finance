"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 700;
// cubic-bezier(0.23, 1, 0.32, 1) is close to a quintic ease-out
const easeOut = (t: number) => 1 - Math.pow(1 - t, 5);

/** Animates a number from its previous value (or `initial` on mount) to the new one. */
export function useCountUp(target: number, initial = target): number {
  const [display, setDisplay] = useState(initial);
  const from = useRef(initial);

  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    // With reduced motion the first frame lands directly on the target.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : DURATION_MS;
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration);
      const value = start + (target - start) * easeOut(t);
      from.current = value;
      setDisplay(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return display;
}
