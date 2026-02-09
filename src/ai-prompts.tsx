import { randomUUID } from "node:crypto";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  LaunchType,
  launchCommand,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCustomCommands } from "./hooks/useCustomCommands";
import { CustomCommand } from "./types";

/** プロバイダー選択肢 */
const PROVIDER_OPTIONS = [
  { title: "デフォルト（Preferences に従う）", value: "" },
  { title: "OpenAI API", value: "openai-api" },
  { title: "Codex CLI", value: "codex-cli" },
  { title: "Claude Code CLI", value: "claude-cli" },
];

/** モデル選択肢（create-ai-command.tsx と同一） */
const MODEL_OPTIONS = [
  { title: "Default (Preferences)", value: "" },
  { title: "GPT-4.1 nano", value: "gpt-4.1-nano" },
  { title: "GPT-4.1 mini", value: "gpt-4.1-mini" },
  { title: "GPT-4.1", value: "gpt-4.1" },
  { title: "GPT-5 nano", value: "gpt-5-nano" },
  { title: "GPT-5 mini", value: "gpt-5-mini" },
  { title: "GPT-5.2", value: "gpt-5.2" },
];

/** アイコン選択肢（create-ai-command.tsx と同一） */
const ICON_OPTIONS: { title: string; value: string; icon: Icon }[] = [
  { title: "Message", value: "Message", icon: Icon.Message },
  { title: "Bubble", value: "Bubble", icon: Icon.Bubble },
  { title: "Star", value: "Star", icon: Icon.Star },
  { title: "Heart", value: "Heart", icon: Icon.Heart },
  { title: "Light Bulb", value: "LightBulb", icon: Icon.LightBulb },
  { title: "Code", value: "Code", icon: Icon.Code },
  { title: "Document", value: "Document", icon: Icon.Document },
  { title: "Pencil", value: "Pencil", icon: Icon.Pencil },
  { title: "Globe", value: "Globe", icon: Icon.Globe },
  { title: "Book", value: "Book", icon: Icon.Book },
  { title: "Hammer", value: "Hammer", icon: Icon.Hammer },
  { title: "Terminal", value: "Terminal", icon: Icon.Terminal },
  { title: "Wand", value: "Wand", icon: Icon.Wand },
  { title: "Person", value: "Person", icon: Icon.Person },
  { title: "Shield", value: "Shield", icon: Icon.Shield },
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
        <Form.Dropdown.Item title="Default" value="" icon={Icon.Bubble} />
        {ICON_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
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
        <Form.Dropdown.Item title="Default" value="" icon={Icon.Bubble} />
        {ICON_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
            icon={opt.icon}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function AICommands() {
  const { commands, isLoading, addCommand, updateCommand, removeCommand } =
    useCustomCommands();

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
              <Action.Push
                title="Create Prompt"
                icon={Icon.PlusCircle}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateCommandForm onAdd={addCommand} />}
              />
              <Action
                title="Delete Prompt"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(command)}
              />
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
