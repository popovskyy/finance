"use client";

import { Card, ErrorNote } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { useSettings, useUpdateSettings } from "@/hooks/queries";
import { CURRENCIES } from "@/lib/prices/fx";

export default function SettingsPage() {
  const settings = useSettings();
  const update = useUpdateSettings();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-xl font-medium tracking-tight">Налаштування</h1>
      </header>

      <Card order={0} className="p-5">
        <h2 className="font-semibold">Основна валюта</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          У цій валюті показуються статки та результати. Активи в інших валютах перераховуються за поточним курсом.
        </p>
        {settings.isLoading ? (
          <div className="skeleton h-11 w-full sm:w-72" />
        ) : (
          <Select
            aria-label="Основна валюта"
            className="sm:w-72"
            value={settings.data?.baseCurrency ?? "USD"}
            disabled={update.isPending}
            onChange={(event) => update.mutate({ baseCurrency: event.target.value })}
          >
            {Object.entries(CURRENCIES).map(([code, name]) => (
              <option key={code} value={code}>
                {code} · {name}
              </option>
            ))}
          </Select>
        )}
        {update.error && (
          <div className="mt-3">
            <ErrorNote message={update.error.message} />
          </div>
        )}
      </Card>

      <Card order={1} className="p-5">
        <h2 className="font-semibold">Звідки беруться ціни</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>Криптовалюти: CoinGecko, ціни в доларах США.</li>
          <li>Акції та фонди: Yahoo Finance, у валюті біржі.</li>
          <li>Курси валют: Yahoo Finance.</li>
        </ul>
        <p className="mt-3 text-sm text-muted">Ціни оновлюються щохвилини, поки застосунок відкритий.</p>
      </Card>
    </div>
  );
}
