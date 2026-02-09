/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** OpenAI API Key - OpenAI の API キー */
  "apiKey"?: string,
  /** Provider - AI プロバイダー（API直接 or CLI経由） */
  "provider": "openai-api" | "codex-cli" | "claude-cli",
  /** Model - 使用する GPT モデル */
  "model": "gpt-4.1-nano" | "gpt-4.1-mini" | "gpt-4.1" | "gpt-5-nano" | "gpt-5-mini" | "gpt-5.2",
  /** Claude CLI Model - Claude Code CLI 使用時のモデル。未指定時は CLI のローカル設定に従います。 */
  "claudeModel": "" | "opus" | "sonnet" | "haiku",
  /** Codex CLI Model - Codex CLI 使用時のモデル。未指定時は CLI のローカル設定に従います。 */
  "codexModel": "" | "gpt-5.3-codex" | "gpt-5.2-codex" | "gpt-5.2",
  /** Codex Reasoning Effort - Codex CLI の推論レベル。未指定時は CLI のローカル設定に従います。 */
  "codexReasoningEffort": "" | "low" | "medium" | "high"
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
  export type AskAiNew = {}
  /** Arguments passed to the `create-ai-prompt` command */
  export type CreateAiPrompt = {}
  /** Arguments passed to the `ai-prompts` command */
  export type AiPrompts = {}
}

