import { useState, useEffect, useCallback, useRef } from "react";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { Message, Preferences, Thread } from "../types";
import {
  createChatCompletion,
  classifyError,
  trimMessagesForContext,
} from "../services/openai";
import {
  DEFAULT_THREAD_ID,
  saveMessages,
  loadMessages,
  clearMessages as clearStorageMessages,
  saveThreads,
  loadThreads,
  saveCurrentThreadId,
  loadCurrentThreadId,
} from "../storage/conversation";

/** デフォルトスレッドを生成する */
function createDefaultThread(): Thread {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_THREAD_ID,
    title: "新しい会話",
    createdAt: now,
    updatedAt: now,
  };
}

/** 新しいスレッドオブジェクトを生成する */
function createNewThread(): Thread {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "新しい会話",
    createdAt: now,
    updatedAt: now,
  };
}

export function useConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] =
    useState<string>(DEFAULT_THREAD_ID);
  const messagesRef = useRef<Message[]>([]);
  const isLoadingRef = useRef(true); // 初期値 true（復元中のため）
  const threadsRef = useRef<Thread[]>([]);
  const currentThreadIdRef = useRef<string>(DEFAULT_THREAD_ID);

  // messagesRef を常に最新に保つ
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // threadsRef を常に最新に保つ
  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  // currentThreadIdRef を常に最新に保つ
  useEffect(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  // マウント時にスレッド一覧と会話を復元
  useEffect(() => {
    (async () => {
      try {
        let restoredThreads = await loadThreads();
        let restoredCurrentId = await loadCurrentThreadId();

        // threads が空の場合: デフォルトスレッドを自動作成
        if (restoredThreads.length === 0) {
          const defaultThread = createDefaultThread();
          restoredThreads = [defaultThread];
          restoredCurrentId = defaultThread.id;
          await saveThreads(restoredThreads);
          await saveCurrentThreadId(restoredCurrentId);
        }

        // currentThreadId が threads 内に存在しない場合: 先頭スレッドにフォールバック
        if (
          !restoredCurrentId ||
          !restoredThreads.some((t) => t.id === restoredCurrentId)
        ) {
          restoredCurrentId = restoredThreads[0].id;
          await saveCurrentThreadId(restoredCurrentId);
        }

        setThreads(restoredThreads);
        setCurrentThreadId(restoredCurrentId);

        // 選択中スレッドのメッセージを復元
        const restoredMessages = await loadMessages(restoredCurrentId);
        setMessages(restoredMessages);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "会話の復元に失敗しました",
          message: "新しい会話として開始します",
        });
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    })();
  }, []);

  // メッセージ送信
  const sendMessage = useCallback(async (content: string) => {
    // 二重送信防止（同期的に即時チェック＆ロック）
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    const threadId = currentThreadIdRef.current;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      threadId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    // useRef で最新の messages を参照
    const nextMessages = [...messagesRef.current, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);

    // スレッドタイトルの自動生成: 初回送信時（既存メッセージが0件のとき）
    if (messagesRef.current.length === 0) {
      const autoTitle =
        content.length > 30 ? content.slice(0, 30) + "..." : content;
      const updatedThreads = threadsRef.current.map((t) =>
        t.id === threadId
          ? { ...t, title: autoTitle, updatedAt: new Date().toISOString() }
          : t,
      );
      setThreads(updatedThreads);
      try {
        await saveThreads(updatedThreads);
      } catch {
        // タイトル保存失敗は致命的ではないので無視
      }
    }

    try {
      // トークン上限チェック: 超過時は古いメッセージを切り捨て
      const prefs = getPreferenceValues<Preferences>();
      const { trimmed, wasTrimmed, exceedsLimit } = trimMessagesForContext(
        nextMessages,
        prefs.model,
      );

      if (exceedsLimit) {
        await showToast({
          style: Toast.Style.Failure,
          title: "メッセージが長すぎます",
          message: "メッセージを短くしてから再試行してください。",
        });
        // ユーザーメッセージは追加済みだが送信は中止
        isLoadingRef.current = false;
        setIsLoading(false);
        return;
      }

      if (wasTrimmed) {
        await showToast({
          style: Toast.Style.Animated,
          title: "古いメッセージを一部省略して送信しました",
        });
      }

      const responseContent = await createChatCompletion(trimmed);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        threadId,
        role: "assistant",
        content: responseContent,
        createdAt: new Date().toISOString(),
      };

      const finalMessages = [...nextMessages, assistantMessage];
      setMessages(finalMessages);

      // スレッドの updatedAt を更新
      const updatedThreads = threadsRef.current.map((t) =>
        t.id === threadId ? { ...t, updatedAt: new Date().toISOString() } : t,
      );
      setThreads(updatedThreads);

      // 保存処理（失敗時は Toast で通知するが、state は維持する）
      try {
        await saveMessages(threadId, finalMessages);
        await saveThreads(updatedThreads);
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
    await clearStorageMessages(currentThreadIdRef.current);
  }, []);

  // 新しいスレッドを作成
  const createThread = useCallback(async () => {
    if (isLoadingRef.current) return;

    const newThread = createNewThread();
    const updatedThreads = [newThread, ...threadsRef.current];

    setThreads(updatedThreads);
    setCurrentThreadId(newThread.id);
    messagesRef.current = [];
    setMessages([]);

    try {
      await saveThreads(updatedThreads);
      await saveCurrentThreadId(newThread.id);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "スレッドの作成に失敗しました",
      });
    }
  }, []);

  // スレッドを切り替え（成功時 true を返す）
  const switchThread = useCallback(async (threadId: string): Promise<boolean> => {
    if (isLoadingRef.current) return false;

    // 現在のスレッドと同じなら何もしない
    if (currentThreadIdRef.current === threadId) return false;

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      setCurrentThreadId(threadId);
      await saveCurrentThreadId(threadId);

      const restoredMessages = await loadMessages(threadId);
      messagesRef.current = restoredMessages;
      setMessages(restoredMessages);
      return true;
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "会話の復元に失敗しました",
      });
      return false;
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // スレッドを削除
  const deleteThread = useCallback(async (threadId: string) => {
    if (isLoadingRef.current) return;

    const currentThreads = threadsRef.current;
    const remaining = currentThreads.filter((t) => t.id !== threadId);

    // メッセージを LocalStorage から削除
    await clearStorageMessages(threadId);

    if (remaining.length === 0) {
      // 全スレッド削除: 新規スレッドを自動作成
      const newThread = createNewThread();
      const newThreads = [newThread];

      setThreads(newThreads);
      setCurrentThreadId(newThread.id);
      messagesRef.current = [];
      setMessages([]);

      try {
        await saveThreads(newThreads);
        await saveCurrentThreadId(newThread.id);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "スレッドの保存に失敗しました",
        });
      }
    } else if (currentThreadIdRef.current === threadId) {
      // 現在のスレッドを削除した場合: 最新のスレッドに切替
      const nextThread = remaining[0];

      setThreads(remaining);
      setCurrentThreadId(nextThread.id);

      try {
        await saveThreads(remaining);
        await saveCurrentThreadId(nextThread.id);

        const restoredMessages = await loadMessages(nextThread.id);
        messagesRef.current = restoredMessages;
        setMessages(restoredMessages);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "スレッドの切替に失敗しました",
        });
      }
    } else {
      // 別のスレッドを削除: 現在のスレッドは維持
      setThreads(remaining);

      try {
        await saveThreads(remaining);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "スレッドの保存に失敗しました",
        });
      }
    }
  }, []);

  return {
    messages,
    isLoading,
    threads,
    currentThreadId,
    sendMessage,
    clearMessages: clearConversation,
    createThread,
    switchThread,
    deleteThread,
  };
}
