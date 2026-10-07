"use client";

import clsx from "clsx";
import { ArrowUp, MessageCircle, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";

const STARTERS = [
  "Як змінився мій портфель за тиждень?",
  "Який актив приніс найбільше?",
  "Чи не забагато в мене крипти?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [draft, setDraft] = useState("");
  const chat = useChat(everOpened);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const last = chat.messages[chat.messages.length - 1];
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [chat.messages.length, last?.content, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    setOpen((value) => !value);
    setEverOpened(true);
    if (!open) setTimeout(() => input.current?.focus(), 120);
  };

  const submit = (text: string) => {
    const message = text.trim();
    if (!message || chat.streaming) return;
    setDraft("");
    void chat.send(message);
  };

  return (
    // The wrapper ignores pointers so the closed panel's box never blocks the page under it.
    <div className="pointer-events-none fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40 flex flex-col items-end gap-3 md:right-8 lg:right-6 lg:bottom-6">
      <div
        role="dialog"
        aria-label="Чат з AI-аналітиком"
        aria-hidden={!open}
        data-open={open}
        className="chat-panel flex h-[min(34rem,calc(100dvh-11rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]"
      >
        <header className="flex items-center justify-between gap-2 border-b border-line py-2.5 pr-2 pl-4">
          <h2 className="text-lg font-semibold tracking-tight">Запитайте про портфель</h2>
          <div className="flex">
            {chat.messages.length > 0 && (
              <button
                type="button"
                onClick={() => void chat.clear()}
                disabled={chat.streaming}
                aria-label="Очистити розмову"
                className="pressable grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-40"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрити чат"
              className="pressable grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {chat.loading ? (
            <div className="skeleton h-16 w-3/4" />
          ) : chat.messages.length === 0 ? (
            <div className="flex h-full flex-col justify-end gap-2">
              <p className="mb-2 text-base text-muted">
                Аналітик бачить ваші активи та результати. Почніть з одного з питань або напишіть своє.
              </p>
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => submit(starter)}
                  className="pressable rounded-xl border border-line px-3.5 py-2.5 text-left text-base hover:bg-surface-2"
                >
                  {starter}
                </button>
              ))}
            </div>
          ) : (
            chat.messages.map((message) => {
              const pending = chat.streaming && message.id === last?.id && message.role === "assistant";
              return (
                <div
                  key={message.id}
                  className={clsx(
                    "fade-in max-w-[88%] rounded-2xl px-3.5 py-2.5 text-base leading-relaxed break-words whitespace-pre-wrap",
                    message.role === "user"
                      ? "ml-auto rounded-br-md bg-accent text-accent-ink"
                      : "rounded-bl-md bg-surface-2",
                    pending && "caret",
                  )}
                >
                  {message.content}
                </div>
              );
            })
          )}
        </div>

        <form
          className="flex items-end gap-2 border-t border-line p-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
        >
          <textarea
            ref={input}
            rows={1}
            value={draft}
            aria-label="Ваше питання"
            placeholder="Ваше питання…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(draft);
              }
            }}
            className="max-h-28 min-h-12 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-base placeholder:text-muted/70 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || chat.streaming}
            aria-label="Надіслати"
            className="pressable grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink disabled:opacity-40"
          >
            <ArrowUp size={18} />
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? "Закрити чат" : "Відкрити чат з AI-аналітиком"}
        className="pressable pointer-events-auto grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-[var(--shadow-pop)]"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
