// メッセージの役割
export type MessageRole = "user" | "assistant" | "system";

// メッセージ
export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  createdAt: string; // ISO 8601
}

// スレッド（Phase 2 で使用）
export interface Thread {
  id: string;
  title: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// API エラー種別
export type ApiErrorType =
  | "auth"
  | "rate_limit"
  | "timeout"
  | "network"
  | "unknown";

// API エラー
export interface ApiError {
  type: ApiErrorType;
  message: string;
  originalError?: unknown;
}

// Preferences
export interface Preferences {
  apiKey: string;
  model: string;
  reasoningEffort: string;
}
