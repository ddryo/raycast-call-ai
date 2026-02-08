import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { addCustomCommand } from "./storage/custom-commands";
import { CustomCommand } from "./types";

/** モデル選択肢（package.json の preferences.model.data と同じ + デフォルト） */
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

interface FormValues {
  name: string;
  systemPrompt: string;
  model: string;
  icon: string;
}

export default function CreateAICommand() {
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
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

    const command: CustomCommand = {
      id: crypto.randomUUID(),
      name: values.name.trim(),
      systemPrompt: values.systemPrompt.trim(),
      model: values.model || undefined,
      icon: values.icon || undefined,
    };

    await addCustomCommand(command);

    await showToast({
      style: Toast.Style.Success,
      title: "カスタムコマンドを作成しました",
    });

    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Command"
            icon={Icon.PlusCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="コマンド名を入力..."
      />
      <Form.TextArea
        id="systemPrompt"
        title="System Prompt"
        placeholder="システムプロンプトを入力..."
      />
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
