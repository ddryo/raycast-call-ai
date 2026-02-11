// プロバイダー
export type Provider = "openai-api" | "codex-cli" | "claude-cli";

// メッセージの役割
export type MessageRole = "user" | "assistant" | "system";

// メッセージ
export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  createdAt: string; // ISO 8601
  model?: string; // 応答に使用されたモデル名（assistant のみ）
  usedWebSearch?: boolean; // Web検索が使用されたか（assistant のみ）
  interrupted?: boolean; // ストリーミング中断フラグ（assistant のみ）
}

// スレッド（Phase 2 で使用）
export interface Thread {
  id: string;
  title: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  customCommandId?: string;
}

// カスタムコマンド
export interface CustomCommand {
  id: string; // UUID v4
  name: string;
  systemPrompt: string;
  model?: string;
  icon?: string; // Raycast Icon 名
  provider?: string; // 未指定時は Preferences.provider を使用
  reasoningEffort?: string; // Codex CLI 用の推論レベル（low / medium / high）
  isDefault?: boolean; // デフォルトプロンプト（削除不可・フォールバック用）
  useSelectedText?: boolean; // 起動時に選択テキストを初回メッセージとして自動送信
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

// Preferences（拡張機能設定は API キーのみ。モデル・プロバイダーはプロンプト設定で管理）
export interface Preferences {
  apiKey: string;
}
