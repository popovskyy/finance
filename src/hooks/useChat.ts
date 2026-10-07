"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";

export interface ChatMessageDto {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const KEY = ["chat"];

/** Chat history plus a `send` that streams the assistant's reply into the cache. */
export function useChat(enabled: boolean) {
  const client = useQueryClient();
  const history = useQuery({ queryKey: KEY, queryFn: () => api<ChatMessageDto[]>("/api/ai/chat"), enabled });
  const [streaming, setStreaming] = useState(false);

  const patch = (update: (messages: ChatMessageDto[]) => ChatMessageDto[]) =>
    client.setQueryData<ChatMessageDto[]>(KEY, (current) => update(current ?? []));

  async function send(message: string) {
    if (streaming) return;
    setStreaming(true);
    const replyId = `pending-${Date.now()}`;
    patch((m) => [...m, { id: `${replyId}-q`, role: "user", content: message }, { id: replyId, role: "assistant", content: "" }]);
    const setReply = (content: string) => patch((m) => m.map((x) => (x.id === replyId ? { ...x, content } : x)));

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Не вдалося отримати відповідь. Спробуйте ще раз.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setReply(text);
      }
    } catch (error) {
      setReply(error instanceof Error ? error.message : "Не вдалося отримати відповідь. Спробуйте ще раз.");
    } finally {
      setStreaming(false);
    }
  }

  async function clear() {
    await api<void>("/api/ai/chat", { method: "DELETE" });
    client.setQueryData(KEY, []);
  }

  return { messages: history.data ?? [], loading: history.isLoading, streaming, send, clear };
}
