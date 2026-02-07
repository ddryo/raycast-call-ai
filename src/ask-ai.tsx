import { useState } from "react";
import { List, ActionPanel, Action, Form, useNavigation } from "@raycast/api";
import { useConversation } from "./hooks/useConversation";
import { Message } from "./types";

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

export default function AskAI() {
  const { messages, isLoading, sendMessage } = useConversation();
  const [searchText, setSearchText] = useState("");

  /** SearchBar の Enter 押下時にメッセージを送信する */
  async function handleSend() {
    const text = searchText.trim();
    if (text.length === 0) return;
    setSearchText("");
    await sendMessage(text);
  }

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
                <Action.Push
                  title="Multiline Input"
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  target={<MultiLineForm onSend={sendMessage} />}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
