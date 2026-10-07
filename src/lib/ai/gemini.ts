import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { chatPrompt, insightsPrompt } from "./prompts";
import { AiNotConfiguredError, insightsSchema, type AiProvider } from "./types";

const model = () => process.env.GEMINI_MODEL || "gemini-flash-latest";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();
  return new GoogleGenAI({ apiKey });
}

export const gemini: AiProvider = {
  async generateInsights(context) {
    const response = await client().models.generateContent({
      model: model(),
      contents: insightsPrompt(context),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(insightsSchema),
        temperature: 0.4,
      },
    });
    return insightsSchema.parse(JSON.parse(response.text ?? ""));
  },

  async *streamChat(context, history) {
    const stream = await client().models.generateContentStream({
      model: model(),
      contents: history.map((turn) => ({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.content }],
      })),
      config: { systemInstruction: chatPrompt(context), temperature: 0.5 },
    });
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  },
};
