/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** OpenAI API Key - OpenAI API 使用時のみ必要 */
  "apiKey"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `ask-ai` command */
  export type AskAi = ExtensionPreferences & {}
  /** Preferences accessible in the `ask-ai-new` command */
  export type AskAiNew = ExtensionPreferences & {}
  /** Preferences accessible in the `use-prompt` command */
  export type UsePrompt = ExtensionPreferences & {}
  /** Preferences accessible in the `ai-prompts` command */
  export type AiPrompts = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `ask-ai` command */
  export type AskAi = {}
  /** Arguments passed to the `ask-ai-new` command */
  export type AskAiNew = {}
  /** Arguments passed to the `use-prompt` command */
  export type UsePrompt = {
  /** プロンプト名 */
  "promptName": string
}
  /** Arguments passed to the `ai-prompts` command */
  export type AiPrompts = {}
}

