import { randomUUID } from "node:crypto";
import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  getPreferenceValues,
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
import { CustomCommand, Preferences } from "./types";

/** OpenAI API キーが設定されているか */
function hasApiKey(): boolean {
  try {
    const { apiKey } = getPreferenceValues<Preferences>();
    return !!apiKey?.trim();
  } catch {
    return false;
  }
}

/** プロバイダー選択肢を生成する */
function getProviderOptions(): { title: string; value: string }[] {
  const apiKeySet = hasApiKey();
  return [
    {
      title: apiKeySet ? "OpenAI API" : "OpenAI API（APIキーを設定してください）",
      value: "openai-api",
    },
    { title: "Codex CLI", value: "codex-cli" },
    { title: "Claude Code CLI", value: "claude-cli" },
  ];
}

/** プロバイダー別モデル選択肢 */
const MODEL_OPTIONS_BY_PROVIDER: Record<string, { title: string; value: string }[]> = {
  "openai-api": [
    { title: "GPT-4.1 nano（デフォルト）", value: "" },
    { title: "GPT-4.1 mini", value: "gpt-4.1-mini" },
    { title: "GPT-4.1", value: "gpt-4.1" },
    { title: "GPT-5 nano", value: "gpt-5-nano" },
    { title: "GPT-5 mini", value: "gpt-5-mini" },
    { title: "GPT-5.2", value: "gpt-5.2" },
  ],
  "codex-cli": [
    { title: "デフォルト（CLI のローカル設定）", value: "" },
    { title: "GPT-5.3 Codex", value: "gpt-5.3-codex" },
    { title: "GPT-5.2 Codex", value: "gpt-5.2-codex" },
    { title: "GPT-5.2", value: "gpt-5.2" },
    { title: "GPT-5.1 Codex Mini", value: "gpt-5.1-codex-mini" },
  ],
  "claude-cli": [
    { title: "デフォルト（CLI のローカル設定）", value: "" },
    { title: "Opus", value: "opus" },
    { title: "Sonnet", value: "sonnet" },
    { title: "Haiku", value: "haiku" },
  ],
};

/** 推論レベル選択肢（Codex CLI 用） */
const REASONING_EFFORT_OPTIONS = [
  { title: "デフォルト（CLI のローカル設定）", value: "" },
  { title: "Low", value: "low" },
  { title: "Medium", value: "medium" },
  { title: "High", value: "high" },
];

/** 全プロバイダーのモデルをフラットにしたリスト（表示用ラベル取得） */
const ALL_MODEL_OPTIONS = Object.values(MODEL_OPTIONS_BY_PROVIDER).flat();

/** アイコン選択肢 */
// https://developers.raycast.com/api-reference/user-interface/icons-and-images
const ICON_OPTIONS: { value: string; icon: Icon }[] = [
  // コミュニケーション
  { value: "SpeechBubbleActive", icon: Icon.SpeechBubbleActive },
  { value: "Emoji", icon: Icon.Emoji },
  { value: "LightBulb", icon: Icon.LightBulb },
  { value: "Bolt", icon: Icon.Bolt },
  { value: "Box", icon: Icon.Box },
  { value: "Rocket", icon: Icon.Rocket },
  { value: "Megaphone", icon: Icon.Megaphone },


  { value: "Code", icon: Icon.Code },
  { value: "Terminal", icon: Icon.Terminal },
  { value: "Bug", icon: Icon.Bug },
  { value: "Cog", icon: Icon.Cog },
  { value: "Globe", icon: Icon.Globe },

  { value: "Pencil", icon: Icon.Pencil },
  { value: "Brush", icon: Icon.Brush },
  { value: "Book", icon: Icon.Book },
  { value: "BlankDocument", icon: Icon.BlankDocument },
  { value: "Clipboard", icon: Icon.Clipboard },
  { value: "Calculator", icon: Icon.Calculator },
  { value: "BulletPoints", icon: Icon.BulletPoints },
  { value: "Snippets", icon: Icon.Snippets },
  { value: "Hashtag", icon: Icon.Hashtag },
  { value: "TextCursor", icon: Icon.TextCursor },


  { value: "BarChart", icon: Icon.BarChart },
  { value: "Shield", icon: Icon.Shield },
  { value: "Lock", icon: Icon.Lock },
  { value: "MagnifyingGlass", icon: Icon.MagnifyingGlass },

  { value: "Crypto", icon: Icon.Crypto },
  { value: "Wind", icon: Icon.Wind },
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
  const option = ALL_MODEL_OPTIONS.find((o) => o.value === model);
  return option ? option.title : model;
}

/** プロバイダー名の表示用ラベルを取得する */
const PROVIDER_LABELS: Record<string, string> = {
  "openai-api": "OpenAI API",
  "codex-cli": "Codex CLI",
  "claude-cli": "Claude Code CLI",
};
function getProviderLabel(provider: string | undefined): string | undefined {
  if (!provider) return undefined;
  return PROVIDER_LABELS[provider] ?? provider;
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
  reasoningEffort: string;
  useSelectedText: boolean;
}

/** OpenAI API キー未設定時のバリデーション */
async function validateApiKey(provider: string): Promise<boolean> {
  if (provider === "openai-api" && !hasApiKey()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "OpenAI API キーが未設定です",
      message: "Raycast の拡張機能設定から API キーを設定してください",
    });
    return false;
  }
  return true;
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
  const [selectedProvider, setSelectedProvider] = useState(command.provider ?? "openai-api");
  const [selectedModel, setSelectedModel] = useState(command.model ?? "");
  const providerOptions = getProviderOptions();

  const modelOptions = MODEL_OPTIONS_BY_PROVIDER[selectedProvider] ?? MODEL_OPTIONS_BY_PROVIDER["openai-api"];

  function handleProviderChange(value: string) {
    setSelectedProvider(value);
    setSelectedModel("");
  }

  async function handleSubmit(values: EditFormValues) {
    // バリデーション
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "名前を入力してください",
      });
      return;
    }
    if (!(await validateApiKey(values.provider))) return;

    const updated: CustomCommand = {
      ...command,
      name: values.name.trim(),
      systemPrompt: values.systemPrompt.trim(),
      model: values.model || undefined,
      icon: values.icon || undefined,
      provider: values.provider,
      reasoningEffort: values.provider === "codex-cli" ? (values.reasoningEffort || undefined) : undefined,
      useSelectedText: values.useSelectedText || undefined,
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
          <Action.CreateQuicklink
            title="Create Quicklink"
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            quicklink={{
              name: `Call AI: ${command.name}`,
              link: createDeeplink({
                command: "use-prompt",
                arguments: { promptName: command.name },
              }),
            }}
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
      <Form.Separator />
      <Form.Dropdown
        id="provider"
        title="Provider"
        defaultValue={command.provider ?? "openai-api"}
        onChange={handleProviderChange}
        error={
          selectedProvider === "openai-api" && !hasApiKey()
            ? "APIキーが未設定です。拡張機能設定から設定してください。"
            : undefined
        }
      >
        {providerOptions.map((opt) => (
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
        value={selectedModel}
        onChange={setSelectedModel}
      >
        {modelOptions.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
          />
        ))}
      </Form.Dropdown>
      {selectedProvider === "codex-cli" && (
        <Form.Dropdown
          id="reasoningEffort"
          title="Reasoning Effort"
          defaultValue={command.reasoningEffort ?? ""}
        >
          {REASONING_EFFORT_OPTIONS.map((opt) => (
            <Form.Dropdown.Item
              key={opt.value}
              title={opt.title}
              value={opt.value}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Separator />
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
      <Form.Separator />
      <Form.Checkbox
        id="useSelectedText"
        label="選択テキストがあれば初回メッセージとして送信"
        defaultValue={command.useSelectedText ?? false}
      />
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
  const [selectedProvider, setSelectedProvider] = useState("openai-api");
  const [selectedModel, setSelectedModel] = useState("");
  const providerOptions = getProviderOptions();

  const modelOptions = MODEL_OPTIONS_BY_PROVIDER[selectedProvider] ?? MODEL_OPTIONS_BY_PROVIDER["openai-api"];

  function handleProviderChange(value: string) {
    setSelectedProvider(value);
    setSelectedModel("");
  }

  async function handleSubmit(values: EditFormValues) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "名前を入力してください",
      });
      return;
    }
    if (!(await validateApiKey(values.provider))) return;

    const command: CustomCommand = {
      id: randomUUID(),
      name: values.name.trim(),
      systemPrompt: values.systemPrompt?.trim() ?? "",
      model: values.model || undefined,
      icon: values.icon || undefined,
      provider: values.provider,
      reasoningEffort: values.provider === "codex-cli" ? (values.reasoningEffort || undefined) : undefined,
      useSelectedText: values.useSelectedText || undefined,
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
      <Form.Separator />
      <Form.Dropdown
        id="provider"
        title="Provider"
        defaultValue="openai-api"
        onChange={handleProviderChange}
        error={
          selectedProvider === "openai-api" && !hasApiKey()
            ? "APIキーが未設定です。拡張機能設定から設定してください。"
            : undefined
        }
      >
        {providerOptions.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="model" title="Model" value={selectedModel} onChange={setSelectedModel}>
        {modelOptions.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
          />
        ))}
      </Form.Dropdown>
      {selectedProvider === "codex-cli" && (
        <Form.Dropdown id="reasoningEffort" title="Reasoning Effort" defaultValue="">
          {REASONING_EFFORT_OPTIONS.map((opt) => (
            <Form.Dropdown.Item
              key={opt.value}
              title={opt.title}
              value={opt.value}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Separator />
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
      <Form.Separator />
      <Form.Checkbox
        id="useSelectedText"
        label="選択テキストがあれば初回メッセージとして送信"
        defaultValue={false}
      />
    </Form>
  );
}

export default function AICommands(props: LaunchProps<{ launchContext?: { action?: string } }>) {
  const { commands, isLoading, addCommand, updateCommand, removeCommand, reorderCommand } =
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
      name: "call-ai",
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
                  name: `Call AI: ${command.name}`,
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
              <Action
                title="Move Up"
                icon={Icon.ArrowUp}
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                onAction={() => reorderCommand(command.id, "up")}
              />
              <Action
                title="Move Down"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                onAction={() => reorderCommand(command.id, "down")}
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
