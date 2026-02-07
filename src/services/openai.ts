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
