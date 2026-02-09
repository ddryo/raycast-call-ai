import {
  Action,
  ActionPanel,
  Icon,
  LaunchType,
  launchCommand,
  List,
} from "@raycast/api";
import { useCustomCommands } from "./hooks/useCustomCommands";
import { CustomCommand } from "./types";

/** Icon 名から Icon enum の値を取得する */
function getIconByName(name: string | undefined): Icon {
  if (!name) return Icon.Bubble;
  const iconValue = Icon[name as keyof typeof Icon];
  return (iconValue as Icon) ?? Icon.Bubble;
}

export default function UsePrompt() {
  const { commands, isLoading } = useCustomCommands();

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
