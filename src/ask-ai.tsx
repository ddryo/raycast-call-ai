import { useState } from "react";
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
  Alert,
  LaunchProps,
} from "@raycast/api";
import { useConversation } from "./hooks/useConversation";
import { useCustomCommands } from "./hooks/useCustomCommands";
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
  } = {} as LaunchProps<{ launchContext: { customCommandId?: string } }> & {
    startNew?: boolean;
  },
) {
  const startNew = props.startNew ?? false;
  const launchCustomCommandId =
    props.launchContext?.customCommandId ?? undefined;
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
    deleteThread,
    messageCache,
    selectThread,
    loadThreadMessages,
    updateThreadCustomCommand,
  } = useConversation({
    startNew: shouldStartNew,
    customCommandId: launchCustomCommandId,
  });
  const { commands: customCommands } = useCustomCommands();
  const [searchText, setSearchText] = useState("");
  const [focusTarget, setFocusTarget] = useState<string | undefined>(undefined);

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

  /** 新しい会話を作成してフォーカスを移動する */
  async function handleCreateThread() {
    const newId = await createThread();
    if (newId) setFocusTarget(newId);
  }

  /** フォーカス変更 = スレッド切り替え（ref のみ、再レンダーなし） */
  function handleSelectionChange(threadId: string | null) {
    if (focusTarget) setFocusTarget(undefined);
    if (threadId) {
      selectThread(threadId);
      loadThreadMessages(threadId);
    }
  }

  /** 現在フォーカス中のスレッドの customCommandId を取得する */
  function getCurrentCustomCommandId(): string {
    // focusTarget があればそのスレッド、なければ最新のスレッド
    const sortedThreads = [...threads].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    const currentThread = sortedThreads[0];
    return currentThread?.customCommandId ?? "";
  }

  /** ドロップダウンでカスタムコマンドを切り替えた時 */
  async function handleDropdownChange(value: string) {
    // 現在フォーカス中のスレッドを特定
    const sortedThreads = [...threads].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    const currentThread = sortedThreads[0];
    if (!currentThread) return;

    const newCustomCommandId = value === "" ? undefined : value;
    await updateThreadCustomCommand(currentThread.id, newCustomCommandId);
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
          tooltip="カスタムコマンド"
          value={getCurrentCustomCommandId()}
          onChange={handleDropdownChange}
        >
          <List.Dropdown.Item title="デフォルト" value="" />
          {customCommands.map((cmd) => (
            <List.Dropdown.Item key={cmd.id} title={cmd.name} value={cmd.id} />
          ))}
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

          return (
            <List.Item
              key={thread.id}
              id={thread.id}
              title={thread.title}
              subtitle={msgCount > 0 ? `${msgCount} messages` : undefined}
              icon={Icon.Bubble}
              accessories={[{ text: formatDateTime(thread.updatedAt) }]}
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
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
