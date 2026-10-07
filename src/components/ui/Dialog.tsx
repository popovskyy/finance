"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Native <dialog>: focus trap, Esc and backdrop come from the browser. */
export function Dialog({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex items-center justify-between gap-4 px-5 pt-5 pb-3">
          <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="pressable -mr-1.5 grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
          >
            <X size={18} />
          </button>
        </header>
        <div className="@container overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </dialog>
  );
}
