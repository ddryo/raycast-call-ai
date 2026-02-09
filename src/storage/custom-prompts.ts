import { randomUUID } from "node:crypto";
import { LocalStorage } from "@raycast/api";
import { CustomCommand } from "../types";

// LocalStorage キー定数
const CUSTOM_PROMPTS_KEY = "ask-ai:custom-commands";

// デフォルトプロンプトID用のキー（初期生成済みフラグ）
const DEFAULT_PROMPT_KEY = "ask-ai:default-command-id";

/** デフォルトプロンプトが存在しなければ初期生成し、そのIDを返す */
export async function ensureDefaultPrompt(): Promise<string> {
  const existingId =
    await LocalStorage.getItem<string>(DEFAULT_PROMPT_KEY);
  if (existingId) {
    // 既にデフォルトプロンプトが作成済み
    return existingId;
  }

  // 初回: デフォルトプロンプトを作成
  const id = randomUUID();
  const defaultPrompt: CustomCommand = {
    id,
    name: "デフォルト",
    systemPrompt:
      "簡潔に回答してください。正確さを最優先し、不確かな情報や推測に基づく回答は避けてください。わからないこと・曖昧なことがあれば、正直にその旨を伝えてください。",
    icon: "Bubble",
  };

  const prompts = await loadCustomPrompts();
  prompts.unshift(defaultPrompt);
  await saveCustomPrompts(prompts);
  await LocalStorage.setItem(DEFAULT_PROMPT_KEY, id);
  return id;
}

// カスタムプロンプトを全件保存
export async function saveCustomPrompts(
  prompts: CustomCommand[],
): Promise<void> {
  await LocalStorage.setItem(CUSTOM_PROMPTS_KEY, JSON.stringify(prompts));
}

// カスタムプロンプトを全件読み込み
export async function loadCustomPrompts(): Promise<CustomCommand[]> {
  const data = await LocalStorage.getItem<string>(CUSTOM_PROMPTS_KEY);
  if (!data) return [];
  return JSON.parse(data) as CustomCommand[];
}

// カスタムプロンプトを追加
export async function addCustomPrompt(prompt: CustomCommand): Promise<void> {
  const prompts = await loadCustomPrompts();
  prompts.push(prompt);
  await saveCustomPrompts(prompts);
}

// カスタムプロンプトを更新
export async function updateCustomPrompt(
  prompt: CustomCommand,
): Promise<void> {
  const prompts = await loadCustomPrompts();
  const index = prompts.findIndex((p) => p.id === prompt.id);
  if (index === -1) {
    throw new Error(`Custom prompt not found: ${prompt.id}`);
  }
  prompts[index] = prompt;
  await saveCustomPrompts(prompts);
}

// カスタムプロンプトを削除
export async function deleteCustomPrompt(id: string): Promise<void> {
  const prompts = await loadCustomPrompts();
  const filtered = prompts.filter((p) => p.id !== id);
  await saveCustomPrompts(filtered);
}

// カスタムプロンプトをIDで取得
export async function getCustomPrompt(
  id: string,
): Promise<CustomCommand | undefined> {
  const prompts = await loadCustomPrompts();
  return prompts.find((p) => p.id === id);
}

// カスタムプロンプトを名前で検索（大文字小文字を区別しない）
export async function findCustomPromptByName(
  name: string,
): Promise<CustomCommand | undefined> {
  const prompts = await loadCustomPrompts();
  return prompts.find((p) => p.name.toLowerCase() === name.toLowerCase());
}
