/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** OpenAI API Key - OpenAI の API キー */
  "apiKey": string,
  /** Model - 使用する GPT モデル */
  "model": "gpt-4.1-nano" | "gpt-4.1-mini" | "gpt-4.1" | "gpt-5-nano" | "gpt-5-mini" | "gpt-5.2",
  /** Reasoning Effort（推論モデル向け） - GPT-5 系モデルの推論レベル（4.1 系では無視されます） */
  "reasoningEffort": "low" | "medium" | "high"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `ask-ai` command */
  export type AskAi = ExtensionPreferences & {}
  /** Preferences accessible in the `ask-ai-new` command */
  export type AskAiNew = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `ask-ai` command */
  export type AskAi = {}
  /** Arguments passed to the `ask-ai-new` command */
  export type AskAiNew = {}
}

