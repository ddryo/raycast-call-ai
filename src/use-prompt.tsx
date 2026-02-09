import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  LaunchType,
  launchCommand,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { useEffect, useState } from "react";
import AskAI from "./ask-ai";
import { useCustomCommands } from "./hooks/useCustomCommands";
import { findCustomPromptByName } from "./storage/custom-prompts";
import { CustomCommand } from "./types";

/** Icon 名から Icon enum の値を取得する */
function getIconByName(name: string | undefined): Icon {
  if (!name) return Icon.Bubble;
  const iconValue = Icon[name as keyof typeof Icon];
  return (iconValue as Icon) ?? Icon.Bubble;
}

export default function UsePrompt(
  props: LaunchProps<{ arguments: { promptName?: string } }>,
) {
  const promptName = props.arguments.promptName?.trim() || "";
  const { commands, isLoading } = useCustomCommands();
  const [customCommandId, setCustomCommandId] = useState<string | undefined>(
    undefined,
  );
  const [resolved, setResolved] = useState(!promptName);

  useEffect(() => {
    if (!promptName) return;
    (async () => {
      const found = await findCustomPromptByName(promptName);
      if (found) {
        setCustomCommandId(found.id);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "プロンプトが見つかりません",
          message: `「${promptName}」に一致するプロンプトはありません`,
        });
      }
      setResolved(true);
    })();
  }, [promptName]);

  // 引数でプロンプト名が指定された場合: 解決後に直接 New Chat へ
  if (promptName) {
    if (!resolved) return null;
    return <AskAI startNew customCommandId={customCommandId} />;
  }

  // 引数なし: 従来通りプロンプト一覧を表示
  async function handleSelect(command: CustomCommand) {
    await launchCommand({
      name: "ask-ai",
      type: LaunchType.UserInitiated,
      context: { customCommandId: command.id },
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="プロンプトを検索...">
      {commands.map((command) => (
        <List.Item
          key={command.id}
          title={command.name}
          icon={getIconByName(command.icon)}
          actions={
            <ActionPanel>
              <Action
                title="Start Conversation"
                icon={Icon.Message}
                onAction={() => handleSelect(command)}
              />
              <Action.CreateQuicklink
                title="Create Quicklink"
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                quicklink={{
                  name: `Ask AI: ${command.name}`,
                  link: createDeeplink({
                    command: "use-prompt",
                    arguments: { promptName: command.name },
                  }),
                }}
              />
              <Action
                title="Manage Prompts"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd"], key: "," }}
                onAction={() =>
                  launchCommand({
                    name: "ai-prompts",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
