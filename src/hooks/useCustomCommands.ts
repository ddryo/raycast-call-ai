import { useCallback, useEffect, useState } from "react";
import { CustomCommand } from "../types";
import {
  loadCustomPrompts,
  addCustomPrompt,
  updateCustomPrompt,
  deleteCustomPrompt,
  ensureDefaultPrompt,
} from "../storage/custom-prompts";

/**
 * カスタムコマンド一覧の取得・CRUD 操作を提供するフック
 */
export function useCustomCommands() {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // マウント時にデフォルトプロンプトを確保してからストレージを復元
  useEffect(() => {
    (async () => {
      await ensureDefaultPrompt();
      const loaded = await loadCustomPrompts();
      setCommands(loaded);
      setIsLoading(false);
    })();
  }, []);

  const addCommand = useCallback(async (command: CustomCommand) => {
    await addCustomPrompt(command);
    const updated = await loadCustomPrompts();
    setCommands(updated);
  }, []);

  const updateCommand = useCallback(async (command: CustomCommand) => {
    await updateCustomPrompt(command);
    const updated = await loadCustomPrompts();
    setCommands(updated);
  }, []);

  const removeCommand = useCallback(async (id: string) => {
    await deleteCustomPrompt(id);
    const updated = await loadCustomPrompts();
    setCommands(updated);
  }, []);

  return {
    commands,
    isLoading,
    addCommand,
    updateCommand,
    removeCommand,
  };
}
