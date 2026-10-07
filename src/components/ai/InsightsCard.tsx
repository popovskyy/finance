"use client";

import { RefreshCw, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/Card";
import { useGenerateInsights, useInsights } from "@/hooks/queries";
import { formatDateTime } from "@/lib/format";

const RISK = {
  low: { label: "Низький ризик", className: "bg-gain-soft text-gain" },
  medium: { label: "Помірний ризик", className: "bg-warn-soft text-warn" },
  high: { label: "Високий ризик", className: "bg-loss-soft text-loss" },
} as const;

export function InsightsCard() {
  const stored = useInsights();
  const generate = useGenerateInsights();
  const data = stored.data;

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
            <Sparkles size={16} aria-hidden />
          </span>
          <div>
            <h2 className="text-lg leading-tight font-semibold tracking-tight">AI-аналітик</h2>
            {data && <p className="text-xs text-muted">Оновлено {formatDateTime(data.generatedAt)}</p>}
          </div>
        </div>
        {data && (
          <Button size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
            <RefreshCw size={14} className={generate.isPending ? "animate-spin" : undefined} aria-hidden />
            {generate.isPending ? "Аналізую…" : "Оновити аналіз"}
          </Button>
        )}
      </div>

      {generate.error && (
        <div className="mt-4">
          <ErrorNote message={generate.error.message} />
        </div>
      )}

      {stored.isLoading ? (
        <div className="mt-4 space-y-2">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-4/5" />
        </div>
      ) : !data ? (
        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-prose text-base text-muted">
            Отримайте підсумок результатів, оцінку ризику та попередження про концентрацію активів. Дані портфеля
            надсилаються до Google Gemini.
          </p>
          <Button variant="primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
            <Sparkles size={16} aria-hidden />
            {generate.isPending ? "Аналізую…" : "Проаналізувати портфель"}
          </Button>
        </div>
      ) : (
        <div key={data.generatedAt} className="fade-in mt-4 space-y-5">
          <p className="max-w-[68ch] text-base leading-relaxed">{data.insights.summary}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-surface-2 p-4">
              <h3 className="text-sm font-medium text-muted">За добу</h3>
              <p className="mt-1.5 text-base leading-relaxed">{data.insights.performance.daily}</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-4">
              <h3 className="text-sm font-medium text-muted">За тиждень і місяць</h3>
              <p className="mt-1.5 text-base leading-relaxed">{data.insights.performance.weekly}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-muted" aria-hidden />
              <h3 className="font-medium">Оцінка ризику</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK[data.insights.risk.level].className}`}>
                {RISK[data.insights.risk.level].label}
              </span>
            </div>
            <p className="mt-2 max-w-[68ch] text-base leading-relaxed">{data.insights.risk.assessment}</p>
          </div>

          {data.insights.concentrationWarnings.length > 0 && (
            <ul className="space-y-2">
              {data.insights.concentrationWarnings.map((warning, i) => (
                <li key={i} className="flex gap-3 rounded-xl bg-warn-soft px-4 py-3 text-base">
                  <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />
                  <span>
                    <strong className="font-semibold">{warning.asset}.</strong> {warning.message}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {data.insights.suggestions.length > 0 && (
            <div>
              <h3 className="font-medium">На що звернути увагу</h3>
              <ul className="mt-2 max-w-[68ch] list-disc space-y-1.5 pl-5 text-base leading-relaxed marker:text-muted">
                {data.insights.suggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
