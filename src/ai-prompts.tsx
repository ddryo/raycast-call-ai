import { randomUUID } from "node:crypto";
import { useEffect, useRef } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  LaunchProps,
  LaunchType,
  launchCommand,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { useCustomCommands } from "./hooks/useCustomCommands";
import { CustomCommand } from "./types";

/** プロバイダー選択肢 */
const PROVIDER_OPTIONS = [
  { title: "デフォルト（Preferences に従う）", value: "" },
  { title: "OpenAI API", value: "openai-api" },
  { title: "Codex CLI", value: "codex-cli" },
  { title: "Claude Code CLI", value: "claude-cli" },
];

/** モデル選択肢 */
const MODEL_OPTIONS = [
  { title: "Default (Preferences)", value: "" },
  { title: "GPT-4.1 nano", value: "gpt-4.1-nano" },
  { title: "GPT-4.1 mini", value: "gpt-4.1-mini" },
  { title: "GPT-4.1", value: "gpt-4.1" },
  { title: "GPT-5 nano", value: "gpt-5-nano" },
  { title: "GPT-5 mini", value: "gpt-5-mini" },
  { title: "GPT-5.2", value: "gpt-5.2" },
];

/** アイコン選択肢 */
// https://developers.raycast.com/api-reference/user-interface/icons-and-images
const ICON_OPTIONS: { value: string; icon: Icon }[] = [
  // コミュニケーション
  { value: "SpeechBubbleActive", icon: Icon.SpeechBubbleActive },
  { value: "Emoji", icon: Icon.Emoji },
  { value: "LightBulb", icon: Icon.LightBulb },
  { value: "Bolt", icon: Icon.Bolt },
  { value: "Rocket", icon: Icon.Rocket },
  { value: "Brush", icon: Icon.Brush },

  { value: "Code", icon: Icon.Code },
  { value: "Terminal", icon: Icon.Terminal },
  { value: "Bug", icon: Icon.Bug },
  { value: "Cog", icon: Icon.Cog },
  { value: "Globe", icon: Icon.Globe },

  { value: "Pencil", icon: Icon.Pencil },
  { value: "Book", icon: Icon.Book },
  { value: "Clipboard", icon: Icon.Clipboard },

  { value: "BarChart", icon: Icon.BarChart },
  { value: "Shield", icon: Icon.Shield },
  { value: "Lock", icon: Icon.Lock },
  { value: "MagnifyingGlass", icon: Icon.MagnifyingGlass },

  { value: "Crypto", icon: Icon.Crypto },
  { value: "Stars", icon: Icon.Stars },
  { value: "Wand", icon: Icon.Wand },
];

/** Icon 名から Icon enum の値を取得する */
function getIconByName(name: string | undefined): Icon {
  if (!name) return Icon.Bubble;
  const iconValue = Icon[name as keyof typeof Icon];
  return (iconValue as Icon) ?? Icon.Bubble;
}

/** モデル名の表示用ラベルを取得する */
function getModelLabel(model: string | undefined): string | undefined {
  if (!model) return undefined;
  const option = MODEL_OPTIONS.find((o) => o.value === model);
  return option ? option.title : model;
}

/** プロバイダー名の表示用ラベルを取得する */
function getProviderLabel(provider: string | undefined): string | undefined {
  if (!provider) return undefined;
  const option = PROVIDER_OPTIONS.find((o) => o.value === provider);
  return option ? option.title : provider;
}

/** システムプロンプトを切り詰めて表示する */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/** 編集フォームの値 */
interface EditFormValues {
  name: string;
  systemPrompt: string;
  model: string;
  icon: string;
  provider: string;
}

/** カスタムプロンプト編集フォーム */
function EditCommandForm({
  command,
  onUpdate,
}: {
  command: CustomCommand;
  onUpdate: (updated: CustomCommand) => Promise<void>;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: EditFormValues) {
    // バリデーション
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "名前を入力してください",
      });
      return;
    }
    if (!values.systemPrompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "システムプロンプトを入力してください",
      });
      return;
    }

    const updated: CustomCommand = {
      ...command,
      name: values.name.trim(),
      systemPrompt: values.systemPrompt.trim(),
      model: values.model || undefined,
      icon: values.icon || undefined,
      provider: values.provider || undefined,
    };

    await onUpdate(updated);

    await showToast({
      style: Toast.Style.Success,
      title: "カスタムプロンプトを更新しました",
    });

    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Prompt"
            icon={Icon.Pencil}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="プロンプト名を入力..."
        defaultValue={command.name}
      />
      <Form.TextArea
        id="systemPrompt"
        title="System Prompt"
        placeholder="システムプロンプトを入力..."
        defaultValue={command.systemPrompt}
      />
      <Form.Dropdown
        id="provider"
        title="Provider"
        defaultValue={command.provider ?? ""}
      >
        {PROVIDER_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="model"
        title="Model"
        defaultValue={command.model ?? ""}
      >
        {MODEL_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="icon" title="Icon" defaultValue={command.icon ?? ""}>
        <Form.Dropdown.Item title="Default (Bubble)" value="" icon={Icon.Bubble} />
        {ICON_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.value}
            value={opt.value}
            icon={opt.icon}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

/** カスタムプロンプト新規作成フォーム */
function CreateCommandForm({
  onAdd,
}: {
  onAdd: (command: CustomCommand) => Promise<void>;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: EditFormValues) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "名前を入力してください",
      });
      return;
    }

    const command: CustomCommand = {
      id: randomUUID(),
      name: values.name.trim(),
      systemPrompt: values.systemPrompt?.trim() ?? "",
      model: values.model || undefined,
      icon: values.icon || undefined,
      provider: values.provider || undefined,
    };

    await onAdd(command);
    await showToast({
      style: Toast.Style.Success,
      title: "カスタムプロンプトを作成しました",
    });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Prompt"
            icon={Icon.PlusCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="プロンプト名を入力..."
      />
      <Form.TextArea
        id="systemPrompt"
        title="System Prompt"
        placeholder="システムプロンプトを入力..."
      />
      <Form.Dropdown id="provider" title="Provider" defaultValue="">
        {PROVIDER_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="model" title="Model" defaultValue="">
        {MODEL_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="icon" title="Icon" defaultValue="">
        <Form.Dropdown.Item title="Default (Bubble)" value="" icon={Icon.Bubble} />
        {ICON_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.value}
            value={opt.value}
            icon={opt.icon}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function AICommands(props: LaunchProps<{ launchContext?: { action?: string } }>) {
  const { commands, isLoading, addCommand, updateCommand, removeCommand } =
    useCustomCommands();
  const { push } = useNavigation();
  const didAutoNav = useRef(false);

  // context.action === "create" の場合、直接作成フォームを開く
  useEffect(() => {
    if (!isLoading && !didAutoNav.current && props.launchContext?.action === "create") {
      didAutoNav.current = true;
      push(<CreateCommandForm onAdd={addCommand} />);
    }
  }, [isLoading]);

  /** カスタムプロンプトで会話を開始する */
  async function handleStartConversation(command: CustomCommand) {
    await launchCommand({
      name: "ask-ai",
      type: LaunchType.UserInitiated,
      context: { customCommandId: command.id },
    });
  }

  /** カスタムプロンプトを削除する（確認ダイアログ付き） */
  async function handleDelete(command: CustomCommand) {
    const confirmed = await confirmAlert({
      title: "カスタムプロンプトを削除しますか?",
      message: `「${command.name}」を削除します。この操作は取り消せません。`,
      primaryAction: {
        title: "削除",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    await removeCommand(command.id);
    await showToast({
      style: Toast.Style.Success,
      title: "カスタムプロンプトを削除しました",
    });
  }

  return (
    <List isLoading={isLoading}>
      {commands.map((command) => (
        <List.Item
          key={command.id}
          title={command.name}
          subtitle={truncate(command.systemPrompt, 60)}
          icon={getIconByName(command.icon)}
          accessories={[
            ...(command.provider
              ? [{ tag: getProviderLabel(command.provider) }]
              : []),
            ...(command.model ? [{ text: getModelLabel(command.model) }] : []),
            { icon: Icon.Pencil, tooltip: "Edit" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Prompt"
                icon={Icon.Pencil}
                target={
                  <EditCommandForm command={command} onUpdate={updateCommand} />
                }
              />
              <Action
                title="Start Conversation"
                icon={Icon.Message}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() => handleStartConversation(command)}
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
              <Action.Push
                title="Create Prompt"
                icon={Icon.PlusCircle}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateCommandForm onAdd={addCommand} />}
              />
              {!command.isDefault && (
                <Action
                  title="Delete Prompt"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(command)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        key="__create__"
        title="新規プロンプトを作成..."
        icon={Icon.PlusCircle}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Prompt"
              icon={Icon.PlusCircle}
              target={<CreateCommandForm onAdd={addCommand} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
