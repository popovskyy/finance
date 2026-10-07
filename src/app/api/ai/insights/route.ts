import { NextResponse } from "next/server";
import { ai, loadAiContext } from "@/lib/ai";
import { AiNotConfiguredError, type StoredInsights } from "@/lib/ai/types";
import { db } from "@/lib/db";
import { HttpError, handle } from "@/lib/http";

const KEY = "ai:insights";

/** Last generated report, or null if none has been generated yet. */
export const maxDuration = 60;

export const GET = handle(async () => {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  return NextResponse.json(row ? (JSON.parse(row.value) as StoredInsights) : null);
});

export const POST = handle(async () => {
  const { context, empty } = await loadAiContext();
  if (empty) throw new HttpError(400, "Додайте хоча б один актив, щоб отримати аналіз", "empty_portfolio");

  let stored: StoredInsights;
  try {
    stored = { insights: await ai.generateInsights(context), generatedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      throw new HttpError(503, "Не задано GEMINI_API_KEY у файлі .env", "ai_not_configured");
    }
    console.error("[ai] insights failed:", error);
    throw new HttpError(502, "AI-сервіс не відповів. Спробуйте ще раз.", "ai_failed");
  }

  const value = JSON.stringify(stored);
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  return NextResponse.json(stored);
});
