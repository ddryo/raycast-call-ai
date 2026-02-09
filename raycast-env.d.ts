/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Provider - AI プロバイダーを選択 */
  "provider": "openai-api" | "codex-cli" | "claude-cli",
  /** OpenAI API Key - OpenAI API 使用時のみ必要 */
  "apiKey"?: string,
  /** OpenAI Model - OpenAI API 使用時のモデル */
  "model": "gpt-4.1-nano" | "gpt-4.1-mini" | "gpt-4.1" | "gpt-5-nano" | "gpt-5-mini" | "gpt-5.2",
  /** Codex CLI Model - Codex CLI 使用時のモデル。 */
  "codexModel": "" | "gpt-5.3-codex" | "gpt-5.2-codex" | "gpt-5.2" | "gpt-5.1-codex-mini",
  /** Codex CLI Reasoning Effort - Codex CLI 使用時の推論レベル。 */
  "codexReasoningEffort": "" | "low" | "medium" | "high",
  /** Claude CLI Model - Claude Code CLI 使用時のモデル。 */
  "claudeModel": "" | "opus" | "sonnet" | "haiku"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `ask-ai` command */
  export type AskAi = ExtensionPreferences & {}
  /** Preferences accessible in the `ask-ai-new` command */
  export type AskAiNew = ExtensionPreferences & {}
  /** Preferences accessible in the `create-ai-prompt` command */
  export type CreateAiPrompt = ExtensionPreferences & {}
  /** Preferences accessible in the `ai-prompts` command */
  export type AiPrompts = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `ask-ai` command */
  export type AskAi = {}
  /** Arguments passed to the `ask-ai-new` command */
  export type AskAiNew = {
  /** プロンプト名 */
  "promptName": string
}
  /** Arguments passed to the `create-ai-prompt` command */
  export type CreateAiPrompt = {}
  /** Arguments passed to the `ai-prompts` command */
  export type AiPrompts = {}
}

