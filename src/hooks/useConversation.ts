import { useState, useEffect, useCallback } from "react";
import { Message } from "../types";
import { createChatCompletion } from "../services/openai";
import {
  DEFAULT_THREAD_ID,
  saveMessages,
  loadMessages,
  clearMessages as clearStorageMessages,
} from "../storage/conversation";

export function useConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // マウント時に LocalStorage から会話を復元
  useEffect(() => {
    loadMessages(DEFAULT_THREAD_ID).then((restored) => {
      setMessages(restored);
    });
  }, []);

  // メッセージ送信
  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        threadId: DEFAULT_THREAD_ID,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      // ローカル変数で確定した配列を以降の処理で一貫して使用
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setIsLoading(true);

      try {
        const responseContent = await createChatCompletion(nextMessages);

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          threadId: DEFAULT_THREAD_ID,
          role: "assistant",
          content: responseContent,
          createdAt: new Date().toISOString(),
        };

        const finalMessages = [...nextMessages, assistantMessage];
        setMessages(finalMessages);
        await saveMessages(DEFAULT_THREAD_ID, finalMessages);
      } finally {
        setIsLoading(false);
      }
    },
    [messages],
  );

  // 会話クリア（ストレージと state の両方）
  const clearConversation = useCallback(async () => {
    await clearStorageMessages(DEFAULT_THREAD_ID);
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages: clearConversation };
}
