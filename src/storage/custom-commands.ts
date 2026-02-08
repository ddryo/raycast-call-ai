import { randomUUID } from "node:crypto";
import { LocalStorage } from "@raycast/api";
import { CustomCommand } from "../types";

// LocalStorage キー定数
const CUSTOM_COMMANDS_KEY = "ask-ai:custom-commands";

// デフォルトコマンドID用のキー（初期生成済みフラグ）
const DEFAULT_COMMAND_KEY = "ask-ai:default-command-id";

/** デフォルトコマンドが存在しなければ初期生成し、そのIDを返す */
export async function ensureDefaultCommand(): Promise<string> {
  const existingId =
    await LocalStorage.getItem<string>(DEFAULT_COMMAND_KEY);
  if (existingId) {
    // 既にデフォルトコマンドが作成済み
    return existingId;
  }

  // 初回: デフォルトコマンドを作成
  const id = randomUUID();
  const defaultCommand: CustomCommand = {
    id,
    name: "デフォルト",
    systemPrompt: "",
    icon: "Bubble",
  };

  const commands = await loadCustomCommands();
  commands.unshift(defaultCommand);
  await saveCustomCommands(commands);
  await LocalStorage.setItem(DEFAULT_COMMAND_KEY, id);
  return id;
}

// カスタムコマンドを全件保存
export async function saveCustomCommands(
  commands: CustomCommand[],
): Promise<void> {
  await LocalStorage.setItem(CUSTOM_COMMANDS_KEY, JSON.stringify(commands));
}

// カスタムコマンドを全件読み込み
export async function loadCustomCommands(): Promise<CustomCommand[]> {
  const data = await LocalStorage.getItem<string>(CUSTOM_COMMANDS_KEY);
  if (!data) return [];
  return JSON.parse(data) as CustomCommand[];
}

// カスタムコマンドを追加
export async function addCustomCommand(command: CustomCommand): Promise<void> {
  const commands = await loadCustomCommands();
  commands.push(command);
  await saveCustomCommands(commands);
}

// カスタムコマンドを更新
export async function updateCustomCommand(
  command: CustomCommand,
): Promise<void> {
  const commands = await loadCustomCommands();
  const index = commands.findIndex((c) => c.id === command.id);
  if (index === -1) {
    throw new Error(`Custom command not found: ${command.id}`);
  }
  commands[index] = command;
  await saveCustomCommands(commands);
}

// カスタムコマンドを削除
export async function deleteCustomCommand(id: string): Promise<void> {
  const commands = await loadCustomCommands();
  const filtered = commands.filter((c) => c.id !== id);
  await saveCustomCommands(filtered);
}

// カスタムコマンドをIDで取得
export async function getCustomCommand(
  id: string,
): Promise<CustomCommand | undefined> {
  const commands = await loadCustomCommands();
  return commands.find((c) => c.id === id);
}
