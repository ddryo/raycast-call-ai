import { LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import AskAI from "./ask-ai";
import { findCustomPromptByName } from "./storage/custom-prompts";

export default function AskAINew(
  props: LaunchProps<{ arguments: { promptName?: string } }>,
) {
  const promptName = props.arguments.promptName?.trim() || "";
  const [customCommandId, setCustomCommandId] = useState<string | undefined>(
    undefined,
  );
  const [resolved, setResolved] = useState(!promptName);

  useEffect(() => {
    if (!promptName) return;
    (async () => {
      const found = await findCustomPromptByName(promptName);
      if (found) {
        setCustomCommandId(found.id);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "プロンプトが見つかりません",
          message: `「${promptName}」に一致するプロンプトはありません`,
        });
      }
      setResolved(true);
    })();
  }, [promptName]);

  if (!resolved) return null;

  return <AskAI startNew customCommandId={customCommandId} />;
}
