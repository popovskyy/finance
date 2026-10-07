import { z } from "zod";

export const insightsSchema = z.object({
  summary: z.string().describe("2-3 речення: загальний стан портфеля"),
  performance: z.object({
    daily: z.string().describe("Що сталося за останню добу і чому це важливо"),
    weekly: z.string().describe("Динаміка за тиждень та місяць"),
  }),
  risk: z.object({
    level: z.enum(["low", "medium", "high"]),
    assessment: z.string().describe("Оцінка ризику портфеля: волатильність, диверсифікація, валютний ризик"),
  }),
  concentrationWarnings: z
    .array(z.object({ asset: z.string(), message: z.string() }))
    .describe("Попередження про надмірну концентрацію; порожній масив, якщо їх немає"),
  suggestions: z.array(z.string()).describe("2-4 конкретні спостереження або ідеї для роздумів"),
});

export type Insights = z.infer<typeof insightsSchema>;

export interface StoredInsights {
  insights: Insights;
  generatedAt: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** An LLM backend. Swap Gemini for another vendor by implementing this. */
export interface AiProvider {
  generateInsights(context: string): Promise<Insights>;
  streamChat(context: string, history: ChatTurn[]): AsyncIterable<string>;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set");
  }
}
