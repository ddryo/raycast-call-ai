import { randomUUID } from "node:crypto";
import { useState, useEffect, useCallback, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { Message, Thread } from "../types";
import { trimMessagesForContext } from "../services/openai";
import { sendCompletion, classifyProviderError } from "../services/provider";
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
import { getCustomPrompt, getDefaultPrompt } from "../storage/custom-prompts";

/** 新しいスレッドオブジェクトを生成する */
function createNewThread(customCommandId?: string): Thread {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: "新しい会話",
    createdAt: now,
    updatedAt: now,
    ...(customCommandId ? { customCommandId } : {}),
  };
}

export function useConversation(options?: {
  startNew?: boolean;
  customCommandId?: string;
}) {
  const startNew = options?.startNew ?? false;
  const initialCustomCommandId = options?.customCommandId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] =
    useState<string>(DEFAULT_THREAD_ID);
  const [messageCache, setMessageCache] = useState<Record<string, Message[]>>(
    {},
  );
  const [statusText, setStatusText] = useState<string | null>(null);
  const [loadingThreadId, setLoadingThreadId] = useState<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const isLoadingRef = useRef(true); // 初期値 true（復元中のため）
  const threadsRef = useRef<Thread[]>([]);
  const currentThreadIdRef = useRef<string>(DEFAULT_THREAD_ID);
  const messageCacheRef = useRef<Record<string, Message[]>>({});

  /** キャッシュを更新してUIに反映する */
  function updateCache(threadId: string, msgs: Message[]) {
    messageCacheRef.current[threadId] = msgs;
    setMessageCache({ ...messageCacheRef.current });
  }

  /** キャッシュからスレッドを削除する */
  function removeFromCache(threadId: string) {
    delete messageCacheRef.current[threadId];
    setMessageCache({ ...messageCacheRef.current });
  }

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

  // マウント時にスレッド一覧を復元
  useEffect(() => {
    (async () => {
      try {
        const restoredThreads = await loadThreads();

        if (startNew || restoredThreads.length === 0) {
          // 新しい会話で開始（call-ai-new コマンド or 初回起動）
          const newThread = createNewThread(initialCustomCommandId);
          const allThreads = [newThread, ...restoredThreads];

          currentThreadIdRef.current = newThread.id;
          messagesRef.current = [];
          setThreads(allThreads);
          setCurrentThreadId(newThread.id);
          setMessages([]);
          updateCache(newThread.id, []);

          // 既存スレッドのキャッシュを復元
          for (const thread of restoredThreads) {
            try {
              const msgs = await loadMessages(thread.id);
              updateCache(thread.id, msgs);
            } catch {
              // サイレント失敗
            }
          }

          await saveThreads(allThreads);
          await saveCurrentThreadId(newThread.id);
        } else {
          // 前回の会話を復元（call-ai コマンド）
          const savedThreadId = await loadCurrentThreadId();
          const targetId =
            savedThreadId && restoredThreads.some((t) => t.id === savedThreadId)
              ? savedThreadId
              : restoredThreads[0].id;

          setThreads(restoredThreads);
          setCurrentThreadId(targetId);
          currentThreadIdRef.current = targetId;

          // 全スレッドのキャッシュを復元
          for (const thread of restoredThreads) {
            try {
              const msgs = await loadMessages(thread.id);
              updateCache(thread.id, msgs);
              if (thread.id === targetId) {
                messagesRef.current = msgs;
                setMessages(msgs);
              }
            } catch {
              // サイレント失敗
            }
          }
        }
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
      id: randomUUID(),
      threadId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    // useRef で最新の messages を参照
    const nextMessages = [...messagesRef.current, userMessage];
    updateCache(threadId, nextMessages);
    if (currentThreadIdRef.current === threadId) {
      setMessages(nextMessages);
    }
    setIsLoading(true);
    setStatusText("考え中...");
    setLoadingThreadId(threadId);

    // スレッドの updatedAt を即座に更新（リスト並び順に即反映するため）
    {
      const now = new Date().toISOString();
      // スレッドタイトルの自動生成: 初回送信時（既存メッセージが0件のとき）
      const autoTitle =
        messagesRef.current.length === 0
          ? content.length > 30
            ? content.slice(0, 30) + "..."
            : content
          : undefined;
      const updatedThreads = threadsRef.current.map((t) =>
        t.id === threadId
          ? { ...t, ...(autoTitle ? { title: autoTitle } : {}), updatedAt: now }
          : t,
      );
      setThreads(updatedThreads);
      try {
        await saveThreads(updatedThreads);
      } catch {
        // 保存失敗は致命的ではないので無視
      }
    }

    // ユーザーメッセージを即座に永続化（ウィンドウが閉じても消えないようにする）
    try {
      await saveMessages(threadId, nextMessages);
    } catch {
      // 保存失敗は致命的ではないので続行
    }

    // カスタムコマンドの取得（Thread に customCommandId がある場合、なければデフォルトにフォールバック）
    const currentThread = threadsRef.current.find((t) => t.id === threadId);
    const customCmdId = currentThread?.customCommandId;
    const customCmd = customCmdId
      ? await getCustomPrompt(customCmdId).catch(() => undefined)
      : await getDefaultPrompt().catch(() => undefined);

    // システムプロンプトの決定: カスタムコマンドから取得（未設定なら注入しない）
    const systemPrompt = customCmd?.systemPrompt?.trim() || "";

    // プロバイダーの決定: CustomCommand から取得（未設定なら "openai-api"）
    const effectiveProvider = customCmd?.provider || "openai-api";

    try {
      // モデルの決定: CustomCommand から取得（未設定なら undefined = プロバイダーのデフォルトに委任）
      const effectiveModel = customCmd?.model || undefined;

      // Codex CLI 用の推論レベル: CustomCommand から取得
      const effectiveReasoningEffort =
        effectiveProvider === "codex-cli"
          ? customCmd?.reasoningEffort || undefined
          : undefined;

      // システムプロンプトの注入（API送信時のみ、LocalStorageには保存しない）
      const messagesForApi = systemPrompt
        ? [
            {
              id: "system-prompt",
              threadId,
              role: "system" as const,
              content: systemPrompt,
              createdAt: new Date(0).toISOString(),
            },
            ...nextMessages,
          ]
        : nextMessages;

      const { trimmed, wasTrimmed, exceedsLimit } = trimMessagesForContext(
        messagesForApi,
        effectiveModel ?? "gpt-4.1-nano",
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

      // ストリーミング表示用の仮メッセージを先に追加
      const assistantId = randomUUID();
      const assistantCreatedAt = new Date().toISOString();
      // UI用: interrupted なし（表示に影響させない）
      const streamingMessages = [
        ...nextMessages,
        {
          id: assistantId,
          threadId,
          role: "assistant" as const,
          content: "",
          createdAt: assistantCreatedAt,
        },
      ];
      updateCache(threadId, streamingMessages);
      if (currentThreadIdRef.current === threadId) {
        setMessages(streamingMessages);
      }
      // ストレージ用: interrupted: true で保存（ウィンドウが閉じても部分レスポンスが残る）
      try {
        const storageMessages = [
          ...nextMessages,
          {
            id: assistantId,
            threadId,
            role: "assistant" as const,
            content: "",
            createdAt: assistantCreatedAt,
            interrupted: true,
          },
        ];
        await saveMessages(threadId, storageMessages);
      } catch {
        // 続行
      }

      let lastFlush = 0;
      let latestText = "";
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      let isFirstDelta = true;
      const THROTTLE_MS = 150;

      // ストリーミング中の部分レスポンスを定期的に永続化する（3秒間隔）
      let lastSave = Date.now();
      const SAVE_INTERVAL_MS = 3000;
      let saveTimer: ReturnType<typeof setTimeout> | null = null;

      const flushToStorage = () => {
        const toSave = [
          ...nextMessages,
          {
            id: assistantId,
            threadId,
            role: "assistant" as const,
            content: latestText,
            createdAt: assistantCreatedAt,
            interrupted: true,
          },
        ];
        saveMessages(threadId, toSave).catch(() => {
          // サイレント失敗
        });
        lastSave = Date.now();
      };

      const flushToUI = () => {
        const updated = [
          ...nextMessages,
          {
            id: assistantId,
            threadId,
            role: "assistant" as const,
            content: latestText,
            createdAt: assistantCreatedAt,
          },
        ];
        updateCache(threadId, updated);
        if (currentThreadIdRef.current === threadId) {
          setMessages(updated);
        }
        lastFlush = Date.now();

        // 定期保存: 前回の保存から SAVE_INTERVAL_MS 経過していたら保存
        const now = Date.now();
        if (now - lastSave >= SAVE_INTERVAL_MS) {
          if (saveTimer) {
            clearTimeout(saveTimer);
            saveTimer = null;
          }
          flushToStorage();
        } else if (!saveTimer) {
          saveTimer = setTimeout(
            () => {
              saveTimer = null;
              flushToStorage();
            },
            SAVE_INTERVAL_MS - (now - lastSave),
          );
        }
      };

      const result = await sendCompletion(effectiveProvider, trimmed, {
        model: effectiveModel,
        reasoningEffort: effectiveReasoningEffort,
        systemPrompt,
        onDelta: (textSoFar) => {
          // 最初のチャンク受信時にステータス表示を消す
          if (isFirstDelta) {
            isFirstDelta = false;
            setStatusText(null);
          }
          latestText = textSoFar;
          const now = Date.now();
          if (now - lastFlush >= THROTTLE_MS) {
            if (flushTimer) {
              clearTimeout(flushTimer);
              flushTimer = null;
            }
            flushToUI();
          } else if (!flushTimer) {
            flushTimer = setTimeout(
              () => {
                flushTimer = null;
                flushToUI();
              },
              THROTTLE_MS - (now - lastFlush),
            );
          }
        },
      });

      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }

      // モデル名は content に埋め込まず、専用フィールドに保存
      const assistantMessage: Message = {
        id: assistantId,
        threadId,
        role: "assistant",
        content: result.content,
        createdAt: assistantCreatedAt,
        model: result.model,
      };

      const finalMessages = [...nextMessages, assistantMessage];
      updateCache(threadId, finalMessages);
      if (currentThreadIdRef.current === threadId) {
        setMessages(finalMessages);
      }

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
      const apiError = classifyProviderError(effectiveProvider, error);
      await showToast({
        style: Toast.Style.Failure,
        title: "送信に失敗しました",
        message: apiError.message,
      });
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      setStatusText(null);
      setLoadingThreadId(null);
    }
  }, []);

  // 会話クリア（ストレージと state の両方）
  const clearConversation = useCallback(async () => {
    // 送信中はクリアを無効化
    if (isLoadingRef.current) return;
    messagesRef.current = [];
    setMessages([]);
    updateCache(currentThreadIdRef.current, []);
    await clearStorageMessages(currentThreadIdRef.current);
  }, []);

  // 新しいスレッドを作成
  const createThread = useCallback(
    async (customCommandId?: string): Promise<string | undefined> => {
      if (isLoadingRef.current) return undefined;

      const newThread = createNewThread(customCommandId);
      const updatedThreads = [newThread, ...threadsRef.current];

      currentThreadIdRef.current = newThread.id;
      messagesRef.current = [];
      setThreads(updatedThreads);
      setCurrentThreadId(newThread.id);
      setMessages([]);
      updateCache(newThread.id, []);

      try {
        await saveThreads(updatedThreads);
        await saveCurrentThreadId(newThread.id);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "スレッドの作成に失敗しました",
        });
      }
      return newThread.id;
    },
    [],
  );

  // Thread の customCommandId を更新
  const updateThreadCustomCommand = useCallback(
    async (threadId: string, customCommandId: string | undefined) => {
      const updatedThreads = threadsRef.current.map((t) =>
        t.id === threadId ? { ...t, customCommandId } : t,
      );
      setThreads(updatedThreads);

      try {
        await saveThreads(updatedThreads);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "スレッドの更新に失敗しました",
        });
      }
    },
    [],
  );

  // 複数スレッドを一括削除
  const deleteThreads = useCallback(async (threadIds: string[]) => {
    if (isLoadingRef.current || threadIds.length === 0) return;

    const idsToDelete = new Set(threadIds);
    const currentThreads = threadsRef.current;
    const remaining = currentThreads.filter((t) => !idsToDelete.has(t.id));

    // メッセージをキャッシュと LocalStorage から削除
    for (const id of threadIds) {
      removeFromCache(id);
      await clearStorageMessages(id);
    }

    if (remaining.length === 0) {
      const newThread = createNewThread();
      const newThreads = [newThread];
      currentThreadIdRef.current = newThread.id;
      messagesRef.current = [];
      setThreads(newThreads);
      setCurrentThreadId(newThread.id);
      setMessages([]);
      updateCache(newThread.id, []);
      try {
        await saveThreads(newThreads);
        await saveCurrentThreadId(newThread.id);
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "スレッドの保存に失敗しました" });
      }
    } else if (idsToDelete.has(currentThreadIdRef.current)) {
      const nextThread = remaining[0];
      currentThreadIdRef.current = nextThread.id;
      setThreads(remaining);
      setCurrentThreadId(nextThread.id);
      try {
        await saveThreads(remaining);
        await saveCurrentThreadId(nextThread.id);
        const restoredMessages = await loadMessages(nextThread.id);
        messagesRef.current = restoredMessages;
        setMessages(restoredMessages);
        updateCache(nextThread.id, restoredMessages);
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "スレッドの切替に失敗しました" });
      }
    } else {
      setThreads(remaining);
      try {
        await saveThreads(remaining);
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "スレッドの保存に失敗しました" });
      }
    }
  }, []);

  // スレッドを削除
  const deleteThread = useCallback(async (threadId: string) => {
    if (isLoadingRef.current) return;

    const currentThreads = threadsRef.current;
    const remaining = currentThreads.filter((t) => t.id !== threadId);

    // メッセージをキャッシュと LocalStorage から削除
    removeFromCache(threadId);
    await clearStorageMessages(threadId);

    if (remaining.length === 0) {
      // 全スレッド削除: 新規スレッドを自動作成
      const newThread = createNewThread();
      const newThreads = [newThread];

      currentThreadIdRef.current = newThread.id;
      messagesRef.current = [];
      setThreads(newThreads);
      setCurrentThreadId(newThread.id);
      setMessages([]);
      updateCache(newThread.id, []);

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

      currentThreadIdRef.current = nextThread.id;
      setThreads(remaining);
      setCurrentThreadId(nextThread.id);

      try {
        await saveThreads(remaining);
        await saveCurrentThreadId(nextThread.id);

        const restoredMessages = await loadMessages(nextThread.id);
        messagesRef.current = restoredMessages;
        setMessages(restoredMessages);
        updateCache(nextThread.id, restoredMessages);
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

  // フォーカス変更時のスレッド切り替え
  const selectThread = useCallback((threadId: string) => {
    currentThreadIdRef.current = threadId;
    messagesRef.current = messageCacheRef.current[threadId] ?? [];
    setCurrentThreadId(threadId);
    saveCurrentThreadId(threadId).catch(() => {
      // サイレント失敗
    });
  }, []);

  // フォーカス中のスレッドのメッセージをオンデマンドでロード
  const loadThreadMessages = useCallback(async (threadId: string) => {
    if (messageCacheRef.current[threadId] !== undefined) return;
    try {
      const msgs = await loadMessages(threadId);
      updateCache(threadId, msgs);
      // ロード完了時にまだ同じスレッドにいれば messagesRef を同期
      if (currentThreadIdRef.current === threadId) {
        messagesRef.current = msgs;
      }
    } catch {
      // サイレント失敗（Detail に空表示）
    }
  }, []);

  return {
    messages,
    isLoading,
    statusText,
    loadingThreadId,
    threads,
    currentThreadId,
    sendMessage,
    clearMessages: clearConversation,
    createThread,
    deleteThread,
    deleteThreads,
    messageCache,
    selectThread,
    loadThreadMessages,
    updateThreadCustomCommand,
  };
}
