"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./Button";

interface Props {
  onConfirm: () => void;
  label: string;
  confirmLabel?: string;
  disabled?: boolean;
  /** Icon-only until armed; used in dense table rows. */
  compact?: boolean;
}

/** Destructive action that asks once more in place instead of opening a dialog. */
export function ConfirmButton({ onConfirm, label, confirmLabel = "Точно видалити?", disabled, compact }: Props) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);

  if (armed) {
    return (
      <Button variant="danger" size="sm" disabled={disabled} onClick={onConfirm} onBlur={() => setArmed(false)} autoFocus>
        {confirmLabel}
      </Button>
    );
  }
  return compact ? (
    <Button variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={() => setArmed(true)}>
      <Trash2 size={16} />
    </Button>
  ) : (
    <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setArmed(true)}>
      <Trash2 size={15} aria-hidden />
      {label}
    </Button>
  );
}
