import { useState, useEffect, useCallback, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { Message } from "../types";
import { createChatCompletion, classifyError } from "../services/openai";
import {
  DEFAULT_THREAD_ID,
  saveMessages,
  loadMessages,
  clearMessages as clearStorageMessages,
} from "../storage/conversation";

export function useConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesRef = useRef<Message[]>([]);
  const isLoadingRef = useRef(true); // 初期値 true（復元中のため）

  // messagesRef を常に最新に保つ
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
        isLoadingRef.current = false;
        setIsLoading(false);
      });
  }, []);

  // メッセージ送信
  const sendMessage = useCallback(async (content: string) => {
    // 二重送信防止（同期的に即時チェック＆ロック）
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      threadId: DEFAULT_THREAD_ID,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    // useRef で最新の messages を参照
    const nextMessages = [...messagesRef.current, userMessage];
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
    } catch (error) {
      const apiError = classifyError(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "送信に失敗しました",
        message: apiError.message,
      });
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // 会話クリア（ストレージと state の両方）
  const clearConversation = useCallback(async () => {
    // 送信中はクリアを無効化
    if (isLoadingRef.current) return;
    messagesRef.current = [];
    setMessages([]);
    await clearStorageMessages(DEFAULT_THREAD_ID);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages: clearConversation };
}
