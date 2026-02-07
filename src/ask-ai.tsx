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
  Color,
} from "@raycast/api";
import { useConversation } from "./hooks/useConversation";
import { Message, Thread } from "./types";

/** メッセージのプレビューテキストを生成する（短縮表示用） */
function truncate(text: string, maxLength = 60): string {
  const singleLine = text.replace(/\n/g, " ");
  if (singleLine.length <= maxLength) return singleLine;
  return singleLine.slice(0, maxLength) + "...";
}

/** ロール表示名を返す */
function roleLabel(role: Message["role"]): string {
  switch (role) {
    case "user":
      return "User";
    case "assistant":
      return "AI";
    case "system":
      return "System";
  }
}

/** 時刻を HH:MM 形式でフォーマットする */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** 日時を読みやすい形式でフォーマットする */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

/** スレッド一覧コンポーネント */
function ThreadList({
  threads,
  currentThreadId,
  switchThread,
  deleteThread,
}: {
  threads: Thread[];
  currentThreadId: string;
  switchThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
}) {
  const { pop } = useNavigation();

  async function handleSelect(threadId: string) {
    const success = await switchThread(threadId);
    if (success) pop();
  }

  async function handleDelete(threadId: string) {
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

  return (
    <List navigationTitle="会話一覧">
      {threads.map((thread) => (
        <List.Item
          key={thread.id}
          title={thread.title}
          icon={
            thread.id === currentThreadId
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : Icon.Circle
          }
          accessories={[{ text: formatDateTime(thread.updatedAt) }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Conversation"
                icon={Icon.ArrowRight}
                onAction={() => handleSelect(thread.id)}
              />
              <Action
                title="Delete Conversation"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(thread.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function AskAI() {
  const {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    createThread,
    threads,
    currentThreadId,
    switchThread,
    deleteThread,
  } = useConversation();
  const [searchText, setSearchText] = useState("");

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

  const threadListTarget = (
    <ThreadList
      threads={threads}
      currentThreadId={currentThreadId}
      switchThread={switchThread}
      deleteThread={deleteThread}
    />
  );

  // 最新メッセージが上に来るように逆順で表示
  const reversedMessages = [...messages].reverse();

  return (
    <List
      isShowingDetail={messages.length > 0}
      isLoading={isLoading}
      searchBarPlaceholder="AI に質問を入力..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {reversedMessages.length === 0 ? (
        <List.EmptyView
          title="Ask AI"
          description="メッセージを入力して Enter で送信"
          actions={
            <ActionPanel>
              <Action title="Send Message" onAction={handleSend} />
              <Action.Push
                title="Multiline Input"
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                target={<MultiLineForm onSend={sendMessage} />}
              />
              <Action.Push
                title="Conversation List"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                target={threadListTarget}
              />
              <Action
                title="New Conversation"
                icon={Icon.PlusCircle}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={createThread}
              />
            </ActionPanel>
          }
        />
      ) : (
        reversedMessages.map((message) => (
          <List.Item
            key={message.id}
            title={roleLabel(message.role)}
            subtitle={truncate(message.content)}
            accessories={[{ text: formatTime(message.createdAt) }]}
            detail={<List.Item.Detail markdown={message.content} />}
            actions={
              <ActionPanel>
                <Action title="Send Message" onAction={handleSend} />
                <Action.CopyToClipboard
                  title="Copy Content"
                  content={message.content}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.Push
                  title="Multiline Input"
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  target={<MultiLineForm onSend={sendMessage} />}
                />
                <Action.Push
                  title="Conversation List"
                  icon={Icon.List}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  target={threadListTarget}
                />
                <Action
                  title="New Conversation"
                  icon={Icon.PlusCircle}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={createThread}
                />
                <Action
                  title="Clear Conversation"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={handleClearConversation}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
