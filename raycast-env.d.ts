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
  /** Preferences accessible in the `call-ai` command */
  export type CallAi = ExtensionPreferences & {}
  /** Preferences accessible in the `call-ai-new` command */
  export type CallAiNew = ExtensionPreferences & {}
  /** Preferences accessible in the `use-prompt` command */
  export type UsePrompt = ExtensionPreferences & {}
  /** Preferences accessible in the `ai-prompts` command */
  export type AiPrompts = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `call-ai` command */
  export type CallAi = {}
  /** Arguments passed to the `call-ai-new` command */
  export type CallAiNew = {}
  /** Arguments passed to the `use-prompt` command */
  export type UsePrompt = {
  /** プロンプト名 */
  "promptName": string
}
  /** Arguments passed to the `ai-prompts` command */
  export type AiPrompts = {}
}

