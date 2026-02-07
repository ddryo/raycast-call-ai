import { List } from "@raycast/api";

export default function AskAI() {
  return (
    <List>
      <List.EmptyView
        title="Ask AI"
        description="メッセージを入力してください"
      />
    </List>
  );
}
