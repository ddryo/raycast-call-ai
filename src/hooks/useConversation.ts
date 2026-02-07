import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
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
  const [isLoading, setIsLoading] = useState(true);

  // マウント時に LocalStorage から会話を復元
  useEffect(() => {
    loadMessages(DEFAULT_THREAD_ID)
      .then((restored) => {
        setMessages(restored);
      })
      .catch(async () => {
        await showToast({
          style: Toast.Style.Failure,
          title: "会話の復元に失敗しました",
          message: "新しい会話として開始します",
        });
      })
      .finally(() => {
        setIsLoading(false);
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

        // 保存処理（失敗時は Toast で通知するが、state は維持する）
        try {
          await saveMessages(DEFAULT_THREAD_ID, finalMessages);
        } catch {
          await showToast({
            style: Toast.Style.Failure,
            title: "会話の保存に失敗しました",
            message: "次回起動時に会話が復元されない可能性があります",
          });
        }
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
