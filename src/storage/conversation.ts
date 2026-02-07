import { LocalStorage } from "@raycast/api";
import { Message, Thread } from "../types";

// デフォルトスレッドID（Phase 1 で使用）
export const DEFAULT_THREAD_ID = "default";

// LocalStorage キー定数
const THREADS_KEY = "ask-ai:threads";
const CURRENT_THREAD_KEY = "ask-ai:current-thread";

// メッセージ用の LocalStorage キーを生成
function getStorageKey(threadId: string): string {
  return `ask-ai:messages:${threadId}`;
}

// メッセージを保存
export async function saveMessages(
  threadId: string,
  messages: Message[],
): Promise<void> {
  await LocalStorage.setItem(getStorageKey(threadId), JSON.stringify(messages));
}

// メッセージを読み込み
export async function loadMessages(threadId: string): Promise<Message[]> {
  const data = await LocalStorage.getItem<string>(getStorageKey(threadId));
  if (!data) return [];
  return JSON.parse(data) as Message[];
}

// メッセージを削除
export async function clearMessages(threadId: string): Promise<void> {
  await LocalStorage.removeItem(getStorageKey(threadId));
}

// スレッド一覧を保存
export async function saveThreads(threads: Thread[]): Promise<void> {
  await LocalStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

// スレッド一覧を読み込み
export async function loadThreads(): Promise<Thread[]> {
  const data = await LocalStorage.getItem<string>(THREADS_KEY);
  if (!data) return [];
  return JSON.parse(data) as Thread[];
}

// 現在のスレッドIDを保存
export async function saveCurrentThreadId(threadId: string): Promise<void> {
  await LocalStorage.setItem(CURRENT_THREAD_KEY, threadId);
}

// 現在のスレッドIDを読み込み
export async function loadCurrentThreadId(): Promise<string | null> {
  const data = await LocalStorage.getItem<string>(CURRENT_THREAD_KEY);
  return data ?? null;
}
