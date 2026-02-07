import OpenAI from "openai";
import { getPreferenceValues } from "@raycast/api";
import { Message, Preferences, ApiError } from "../types";

function getClient(): OpenAI {
  const { apiKey } = getPreferenceValues<Preferences>();
  return new OpenAI({ apiKey });
}

export function classifyError(error: unknown): ApiError {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return {
      type: "timeout",
      message: "リクエストがタイムアウトしました。再試行してください。",
      originalError: error,
    };
  }

  if (error instanceof OpenAI.APIConnectionError) {
    return {
      type: "network",
      message: "ネットワーク接続に失敗しました。接続を確認してください。",
      originalError: error,
    };
  }

  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    if (status === 401) {
      return {
        type: "auth",
        message: "APIキーが無効です。設定を確認してください。",
        originalError: error,
      };
    }
    if (status === 429) {
      return {
        type: "rate_limit",
        message:
          "レート制限に達しました。しばらく待ってから再試行してください。",
        originalError: error,
      };
    }
  }

  return {
    type: "unknown",
    message: "予期しないエラーが発生しました。",
    originalError: error,
  };
}

// トークン数の簡易推定
function estimateTokens(text: string): number {
  // 日本語文字数 × (1/1.5) + 英語文字数 × (1/4) の概算
  // 簡易実装: 全体の文字数 / 2 で近似
  return Math.ceil(text.length / 2);
}

// メッセージ配列のトークン数を推定
function estimateMessagesTokens(messages: Message[]): number {
  return messages.reduce(
    (total, m) => total + estimateTokens(m.content) + 4,
    0,
  );
  // +4 はメッセージごとのオーバーヘッド（role, name等）
}

// モデルごとのコンテキスト上限
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "gpt-4.1-nano": 1047576,
  "gpt-4.1-mini": 1047576,
  "gpt-4.1": 1047576,
};
const DEFAULT_CONTEXT_LIMIT = 128000;
const RESPONSE_BUFFER = 4096;

// 上限を超える場合に古いメッセージを切り捨て
export function trimMessagesForContext(
  messages: Message[],
  model: string,
): { trimmed: Message[]; wasTrimmed: boolean; exceedsLimit: boolean } {
  const limit =
    (MODEL_CONTEXT_LIMITS[model] ?? DEFAULT_CONTEXT_LIMIT) - RESPONSE_BUFFER;

  if (estimateMessagesTokens(messages) <= limit) {
    return { trimmed: messages, wasTrimmed: false, exceedsLimit: false };
  }

  // system メッセージは常に保持
  const systemMessages = messages.filter((m) => m.role === "system");
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  // 最新のユーザーメッセージのインデックス（nonSystemMessages 内）
  const lastUserIndex = nonSystemMessages.length - 1;

  // 新しいメッセージから順に追加し、上限内に収める
  const result: Message[] = [...systemMessages];
  const systemTokens = estimateMessagesTokens(systemMessages);
  let currentTokens = systemTokens;

  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(nonSystemMessages[i].content) + 4;
    if (currentTokens + msgTokens > limit && i !== lastUserIndex) {
      continue; // 古いメッセージをスキップ
    }
    currentTokens += msgTokens;
    result.push(nonSystemMessages[i]);
  }

  // 最終チェック: トリミング後も上限を超える場合（単一メッセージが巨大等）
  if (estimateMessagesTokens(result) > limit) {
    return { trimmed: result, wasTrimmed: true, exceedsLimit: true };
  }

  // 時系列順に戻す
  result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return { trimmed: result, wasTrimmed: true, exceedsLimit: false };
}

export async function createChatCompletion(
  messages: Message[],
  model?: string,
): Promise<string> {
  const client = getClient();
  const prefs = getPreferenceValues<Preferences>();

  const response = await client.chat.completions.create({
    model: model ?? prefs.model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: false,
  });

  return response.choices[0]?.message?.content ?? "";
}
