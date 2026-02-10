import { useState, useEffect, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  Form,
  useNavigation,
  confirmAlert,
  showToast,
  Toast,
  Icon,
  Color,
  Alert,
  LaunchProps,
  launchCommand,
  LaunchType,
  getSelectedText,
} from "@raycast/api";
import { useConversation } from "./hooks/useConversation";
import { useCustomCommands } from "./hooks/useCustomCommands";
import { getCustomPrompt } from "./storage/custom-prompts";
import { Message } from "./types";

/** 日時を m/d HH:MM 形式でフォーマットする */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${m}/${d} ${hh}:${mm}`;
}

/** 会話メッセージを Markdown テキストに変換する */
function buildConversationMarkdown(
  messages: Message[] | undefined,
  statusText?: string | null,
): string {
  if (!messages || messages.length === 0) {
    return "*メッセージを入力して会話を始めましょう*";
  }
  const reversed = [...messages].reverse();
  const parts = reversed.map((msg) => {
    if (msg.role === "user") {
      const quoted = msg.content
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      return `**You**\n\n${quoted}`;
    }
    // assistant: 先頭のタグ行（モデル名・Web検索）を抽出して AI ラベルの横に移動
    const tagMatch = msg.content.match(
      /^(`[^`]+`(?:\s+`[^`]+`)*)\n\n([\s\S]*)$/,
    );
    if (tagMatch) {
      return `**AI** ${tagMatch[1]}\n\n${tagMatch[2]}`;
    }
    return `**AI**\n\n${msg.content}`;
  });
  // 質問(You)→回答(AI)をセットにし、セット間のみ区切り線を入れる
  const lines = parts.reduce((acc, text, i) => {
    if (i === 0) return text;
    const separator =
      reversed[i - 1].role === "user" && reversed[i].role === "assistant"
        ? "\n\n---\n\n"
        : "\n\n";
    return acc + separator + text;
  }, "");

  if (statusText) {
    return `*${statusText}*\n\n---\n\n${lines}`;
  }
  return lines;
}

/** 最後の AI レスポンスを取得する */
function getLastAssistantMessage(
  messages: Message[] | undefined,
): string | undefined {
  if (!messages) return undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i].content;
  }
  return undefined;
}

/** 複数行テキスト入力フォーム */
function MultiLineForm({
  onSend,
}: {
  onSend: (text: string) => Promise<void>;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { message: string }) {
    const text = values.message.trim();
    if (text.length === 0) return;
    pop();
    await onSend(text);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="AI に送信するメッセージを入力..."
        autoFocus
      />
    </Form>
  );
}

export default function AskAI(
  props: LaunchProps<{ launchContext: { customCommandId?: string } }> & {
    startNew?: boolean;
    customCommandId?: string;
  } = {} as LaunchProps<{ launchContext: { customCommandId?: string } }> & {
    startNew?: boolean;
    customCommandId?: string;
  },
) {
  const startNew = props.startNew ?? false;
  const launchCustomCommandId =
    props.customCommandId ?? props.launchContext?.customCommandId ?? undefined;
  // launchContext がある場合は startNew と同様に新規スレッドを作成
  const shouldStartNew = startNew || !!launchCustomCommandId;

  const {
    isLoading,
    statusText,
    loadingThreadId,
    sendMessage,
    clearMessages,
    createThread,
    threads,
    currentThreadId,
    deleteThread,
    deleteThreads,
    messageCache,
    selectThread,
    loadThreadMessages,
    updateThreadCustomCommand,
  } = useConversation({
    startNew: shouldStartNew,
    customCommandId: launchCustomCommandId,
  });
  const { commands: customCommands, isLoading: isLoadingCommands } = useCustomCommands();
  const [searchText, setSearchText] = useState("");
  const [focusTarget, setFocusTarget] = useState<string | undefined>(undefined);

  // useSelectedText: 起動時に選択テキストを初回メッセージとして自動送信
  const didAutoSend = useRef(false);
  useEffect(() => {
    if (isLoading || didAutoSend.current || !shouldStartNew || !launchCustomCommandId) return;
    didAutoSend.current = true;
    (async () => {
      const cmd = await getCustomPrompt(launchCustomCommandId);
      if (!cmd?.useSelectedText) return;
      try {
        const selected = await getSelectedText();
        if (selected.trim()) {
          await sendMessage(selected.trim());
        }
      } catch {
        // テキスト未選択時は何もせず通常のチャットとして開始
      }
    })();
  }, [isLoading]);

  /** SearchBar の Enter 押下時にメッセージを送信する */
  async function handleSend() {
    const text = searchText.trim();
    if (text.length === 0 || isLoading) return;
    setSearchText("");
    await sendMessage(text);
  }

  /** 会話履歴をクリアする（確認ダイアログ付き） */
  async function handleClearConversation() {
    if (isLoading) return;
    const confirmed = await confirmAlert({
      title: "会話をクリアしますか?",
      message: "この操作は取り消せません。",
      primaryAction: {
        title: "クリア",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await clearMessages();
    await showToast({
      style: Toast.Style.Success,
      title: "会話をクリアしました",
    });
  }

  /** スレッド削除（確認ダイアログ付き） */
  async function handleDeleteThread(threadId: string) {
    if (isLoading) return;
    const confirmed = await confirmAlert({
      title: "スレッドを削除しますか?",
      message: "この操作は取り消せません。",
      primaryAction: {
        title: "削除",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await deleteThread(threadId);
    await showToast({
      style: Toast.Style.Success,
      title: "スレッドを削除しました",
    });
  }

  /** 全スレッドを削除する（確認ダイアログ付き） */
  async function handleDeleteAllThreads() {
    if (isLoading || threads.length === 0) return;
    const confirmed = await confirmAlert({
      title: `${threads.length}件すべてのスレッドを削除しますか?`,
      message: "この操作は取り消せません。",
      primaryAction: {
        title: "すべて削除",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await deleteThreads(threads.map((t) => t.id));
    await showToast({
      style: Toast.Style.Success,
      title: "すべてのスレッドを削除しました",
    });
  }

  /** 新しい会話を作成してフォーカスを移動する */
  async function handleCreateThread() {
    const newId = await createThread();
    if (newId) setFocusTarget(newId);
  }

  /** フォーカス変更 = スレッド切り替え */
  function handleSelectionChange(threadId: string | null) {
    if (focusTarget) setFocusTarget(undefined);
    if (threadId) {
      selectThread(threadId);
      loadThreadMessages(threadId);
    }
  }

  const defaultCommand = customCommands.find((cmd) => cmd.isDefault);
  const userCommands = customCommands.filter((cmd) => !cmd.isDefault);

  /** 現在フォーカス中のスレッドの customCommandId を取得する（未設定時はデフォルトにフォールバック） */
  function getCurrentCustomCommandId(): string {
    const currentThread = threads.find((t) => t.id === currentThreadId);
    return currentThread?.customCommandId ?? defaultCommand?.id ?? "";
  }

  /** ドロップダウンでカスタムプロンプトを切り替えた時 */
  async function handleDropdownChange(value: string) {
    if (value === "__create_new__") {
      await launchCommand({ name: "ai-prompts", type: LaunchType.UserInitiated, context: { action: "create" } });
      return;
    }
    if (!currentThreadId) return;
    const newCustomCommandId = value === "" ? undefined : value;
    await updateThreadCustomCommand(currentThreadId, newCustomCommandId);
  }

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="AI に質問を入力..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      selectedItemId={focusTarget}
      onSelectionChange={handleSelectionChange}
      searchBarAccessory={
        <List.Dropdown
          tooltip="カスタムプロンプト"
          value={getCurrentCustomCommandId()}
          onChange={handleDropdownChange}
        >
          {defaultCommand && (
            <List.Dropdown.Item
              key={defaultCommand.id}
              title={defaultCommand.name}
              value={defaultCommand.id}
            />
          )}
          <List.Dropdown.Section title="カスタムプロンプト">
            {userCommands.map((cmd) => (
              <List.Dropdown.Item key={cmd.id} title={cmd.name} value={cmd.id} />
            ))}
            {!isLoadingCommands && (
              <List.Dropdown.Item
                title="新規作成"
                value="__create_new__"
                icon={Icon.PlusCircle}
              />
          )}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {[...threads]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .map((thread) => {
          const cachedMessages = messageCache[thread.id];
          const msgCount = cachedMessages ? cachedMessages.length : 0;
          const lastResponse = getLastAssistantMessage(cachedMessages);
          const promptCmd = thread.customCommandId
            ? customCommands.find((cmd) => cmd.id === thread.customCommandId)
            : undefined;
          const promptName = promptCmd && !promptCmd.isDefault ? promptCmd.name : undefined;

          return (
            <List.Item
              key={thread.id}
              id={thread.id}
              title={thread.title}
              subtitle={msgCount > 0 ? `${msgCount} messages` : undefined}
              icon={Icon.Bubble}
              accessories={[
                ...(promptName ? [{ tag: { value: promptName, color: Color.Blue } }] : []),
                { text: formatDateTime(thread.updatedAt) },
              ]}
              detail={
                <List.Item.Detail
                  markdown={buildConversationMarkdown(
                    cachedMessages,
                    thread.id === loadingThreadId ? statusText : null,
                  )}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Send Message"
                    icon={Icon.Message}
                    onAction={handleSend}
                  />
                  {lastResponse && (
                    <Action.CopyToClipboard
                      title="Copy Last Response"
                      content={lastResponse}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  )}
                  <Action.Push
                    title="Multiline Input"
                    icon={Icon.TextDocument}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    target={<MultiLineForm onSend={sendMessage} />}
                  />
                  <Action
                    title="New Conversation"
                    icon={Icon.PlusCircle}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={handleCreateThread}
                  />
                  <Action
                    title="Clear Conversation"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={handleClearConversation}
                  />
                  <Action
                    title="Delete Conversation"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDeleteThread(thread.id)}
                  />
                  {threads.length > 1 && (
                    <Action
                      title="Delete All Conversations"
                      icon={Icon.Wand}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                      onAction={handleDeleteAllThreads}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
