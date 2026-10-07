import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  /** Position in the page-load cascade. */
  order?: number;
}

export function Card({ children, className, order }: Props) {
  return (
    <section
      className={clsx("rounded-2xl border border-line bg-surface", order !== undefined && "rise", className)}
      style={order !== undefined ? ({ "--i": order } as CSSProperties) : undefined}
    >
      {children}
    </section>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="fade-in flex flex-wrap items-center gap-3 rounded-xl bg-loss-soft px-4 py-3 text-sm text-loss">
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="pressable font-medium underline underline-offset-2">
          Спробувати ще раз
        </button>
      )}
    </div>
  );
}
