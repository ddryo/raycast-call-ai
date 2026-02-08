import { useCallback, useEffect, useState } from "react";
import { CustomCommand } from "../types";
import {
  loadCustomCommands,
  addCustomCommand,
  updateCustomCommand,
  deleteCustomCommand,
  ensureDefaultCommand,
} from "../storage/custom-commands";

/**
 * カスタムコマンド一覧の取得・CRUD 操作を提供するフック
 */
export function useCustomCommands() {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // マウント時にデフォルトコマンドを確保してからストレージを復元
  useEffect(() => {
    (async () => {
      await ensureDefaultCommand();
      const loaded = await loadCustomCommands();
      setCommands(loaded);
      setIsLoading(false);
    })();
  }, []);

  const addCommand = useCallback(async (command: CustomCommand) => {
    await addCustomCommand(command);
    const updated = await loadCustomCommands();
    setCommands(updated);
  }, []);

  const updateCommand = useCallback(async (command: CustomCommand) => {
    await updateCustomCommand(command);
    const updated = await loadCustomCommands();
    setCommands(updated);
  }, []);

  const removeCommand = useCallback(async (id: string) => {
    await deleteCustomCommand(id);
    const updated = await loadCustomCommands();
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
