import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:opacity-90",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  ghost: "text-muted hover:text-ink hover:bg-surface-2",
  danger: "bg-loss-soft text-loss hover:opacity-85",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "icon";
}

export function Button({ variant = "secondary", size = "md", className, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={clsx(
        "pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" && "h-11 px-4 text-[15px]",
        size === "sm" && "h-9 px-3 text-sm",
        size === "icon" && "size-9",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
