"use client";

import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { api } from "@/lib/api";

/** Only same-origin paths are allowed as the return target. */
function returnPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next) return "/";
  const url = new URL(next, window.location.origin);
  return url.origin === window.location.origin ? url.pathname + url.search : "/";
}

export default function UnlockPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <form
        className="rise w-full max-w-sm space-y-5 text-center"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          try {
            await api<void>("/api/unlock", { method: "POST", json: { password } });
            window.location.replace(returnPath());
          } catch (e) {
            setError(e instanceof Error ? e.message : "Не вдалося увійти");
            setPending(false);
          }
        }}
      >
        <div className="flex justify-center">
          <Logo size={56} />
        </div>
        <h1 className="font-display text-2xl font-medium tracking-tight">Статки</h1>
        <Input
          type="password"
          autoFocus
          autoComplete="current-password"
          aria-label="Пароль"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <ErrorNote message={error} />}
        <Button type="submit" variant="primary" className="w-full" disabled={pending || !password}>
          {pending ? "Перевіряю…" : "Відкрити"}
        </Button>
      </form>
    </div>
  );
}
