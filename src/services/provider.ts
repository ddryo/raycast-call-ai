import { Message, ApiError } from "../types";
import {
  createChatCompletion,
  classifyError,
  ChatCompletionResult,
} from "./openai";
import { createCliCompletion } from "./cli";

export type { ChatCompletionResult } from "./openai";

/**
 * CLI エラーを ApiError に分類する
 */
function classifyCliError(error: unknown): ApiError {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("タイムアウト")) {
    return { type: "timeout", message, originalError: error };
  }

  if (message.includes("起動に失敗")) {
    return {
      type: "network",
      message: `CLI の実行に失敗しました: ${message}`,
      originalError: error,
    };
  }

  return {
    type: "unknown",
    message: `CLI エラー: ${message}`,
    originalError: error,
  };
}

/**
 * プロバイダーに応じてエラーを分類する
 */
export function classifyProviderError(
  provider: string,
  error: unknown,
): ApiError {
  if (provider === "openai-api") {
    return classifyError(error);
  }
  return classifyCliError(error);
}

/**
 * プロバイダーに応じて chat completion を実行する
 */
export async function sendCompletion(
  provider: string,
  messages: Message[],
  options?: {
    model?: string;
    reasoningEffort?: string;
    systemPrompt?: string;
    onDelta?: (textSoFar: string) => void;
  },
): Promise<ChatCompletionResult> {
  if (provider === "openai-api") {
    return createChatCompletion(
      messages,
      options?.model,
      options?.onDelta,
    );
  }

  return createCliCompletion(
    provider as "codex-cli" | "claude-cli",
    messages,
    {
      model: options?.model,
      reasoningEffort: options?.reasoningEffort,
      systemPrompt: options?.systemPrompt,
      onDelta: options?.onDelta,
    },
  );
}
