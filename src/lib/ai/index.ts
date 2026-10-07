import { db } from "@/lib/db";
import { getPortfolio } from "@/lib/portfolio-service";
import { buildAiContext } from "./context";
import { gemini } from "./gemini";
import type { AiProvider } from "./types";

export const ai: AiProvider = gemini;

export async function loadAiContext(): Promise<{ context: string; empty: boolean }> {
  const [portfolio, recent] = await Promise.all([
    getPortfolio(),
    db.transaction.findMany({
      orderBy: { date: "desc" },
      take: 15,
      include: { asset: { select: { symbol: true, currency: true } } },
    }),
  ]);
  const context = buildAiContext(
    portfolio,
    recent.map((t) => ({
      date: t.date,
      type: t.type,
      symbol: t.asset.symbol,
      quantity: Number(t.quantity),
      price: Number(t.price),
      currency: t.asset.currency,
    })),
  );
  return { context, empty: portfolio.holdings.length === 0 };
}
