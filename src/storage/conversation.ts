import { LocalStorage } from "@raycast/api";
import { Message } from "../types";

// デフォルトスレッドID（Phase 1 で使用）
export const DEFAULT_THREAD_ID = "default";

// LocalStorage キーを生成
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
