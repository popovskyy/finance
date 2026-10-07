import { NextResponse } from "next/server";
import { ai, loadAiContext } from "@/lib/ai";
import type { ChatTurn } from "@/lib/ai/types";
import { db } from "@/lib/db";
import { HttpError, handle } from "@/lib/http";
import { chatSchema } from "@/lib/validation";

const HISTORY_LIMIT = 20;

export const maxDuration = 60;

export const GET = handle(async () => {
  const latest = await db.chatMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json(latest.reverse());
});

export const DELETE = handle(async () => {
  await db.chatMessage.deleteMany();
  return new NextResponse(null, { status: 204 });
});

/** Streams the reply as plain text and stores both sides of the exchange. */
export const POST = handle(async (request: Request) => {
  const { message } = chatSchema.parse(await request.json());
  if (!process.env.GEMINI_API_KEY) {
    throw new HttpError(503, "Не задано GEMINI_API_KEY у файлі .env", "ai_not_configured");
  }

  const [{ context }, previous] = await Promise.all([
    loadAiContext(),
    db.chatMessage.findMany({ orderBy: { createdAt: "desc" }, take: HISTORY_LIMIT }),
  ]);
  await db.chatMessage.create({ data: { role: "user", content: message } });

  const history: ChatTurn[] = [
    ...previous.reverse().map((m) => ({ role: m.role as ChatTurn["role"], content: m.content })),
    { role: "user", content: message },
  ];
  // Gemini requires the conversation to open with a user turn.
  while (history[0]?.role === "assistant") history.shift();

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reply = "";
      try {
        for await (const chunk of ai.streamChat(context, history)) {
          reply += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        console.error("[ai] chat failed:", error);
        if (!reply) {
          reply = "Не вдалося отримати відповідь від AI. Спробуйте ще раз.";
          controller.enqueue(encoder.encode(reply));
        }
      } finally {
        if (reply) await db.chatMessage.create({ data: { role: "assistant", content: reply } });
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
});
