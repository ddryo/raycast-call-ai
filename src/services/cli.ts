import { spawn, execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { Message } from "../types";
import { ChatCompletionResult } from "./openai";

const HOME = homedir();

// CLI 実行パス
const CLI_PATHS = {
  "codex-cli": join(HOME, "n/bin/codex"),
  "claude-cli": join(HOME, ".local/bin/claude"),
} as const;

// Raycast 環境では PATH が不十分なため、CLI が依存するパスを補完する
const EXTRA_PATH_DIRS = [
  join(HOME, "n/bin"),
  join(HOME, ".local/bin"),
  "/usr/local/bin",
];

/**
 * シェルの環境変数を取得する（Raycast は .zshrc を読まないため）
 */
function getShellEnvVar(name: string): string | undefined {
  try {
    return execSync(`zsh -ilc 'echo "\${${name}}"'`, {
      encoding: "utf-8",
      timeout: 3000,
    }).trim() || undefined;
  } catch {
    return undefined;
  }
}

// シェルから取得した環境変数のキャッシュ（起動時に1回だけ取得）
let shellEnvCache: Record<string, string> | undefined;

function getShellEnvExtras(): Record<string, string> {
  if (shellEnvCache) return shellEnvCache;
  shellEnvCache = {};

  // CLAUDE_CODE_OAUTH_TOKEN が process.env になければシェルから取得
  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    const token = getShellEnvVar("CLAUDE_CODE_OAUTH_TOKEN");
    if (token) shellEnvCache.CLAUDE_CODE_OAUTH_TOKEN = token;
  }

  return shellEnvCache;
}

function getEnvWithPath(): NodeJS.ProcessEnv {
  const currentPath = process.env.PATH ?? "";
  const missing = EXTRA_PATH_DIRS.filter((d) => !currentPath.includes(d));
  return {
    ...process.env,
    ...getShellEnvExtras(),
    PATH: [...missing, currentPath].join(":"),
  };
}

// タイムアウト（ミリ秒）
const TIMEOUT_MS = 120_000;

// Raycast Preferences でモデル未指定時のフォールバック表示
const CODEX_LOCAL = "Codex CLI（ローカル設定）";
const CLAUDE_LOCAL = "Claude Code CLI（ローカル設定）";

/**
 * 会話履歴をプロンプト文字列に変換する
 */
function formatMessages(messages: Message[]): string {
  const parts: string[] = [];

  // 会話履歴を埋め込む（system メッセージは developer_instructions で渡すので除外）
  const conversationMessages = messages.filter((m) => m.role !== "system");
  for (const m of conversationMessages) {
    const label = m.role === "user" ? "User" : "Assistant";
    parts.push(`[${label}]\n${m.content}`);
  }

  return parts.join("\n\n");
}

/**
 * Claude CLI 用: メッセージをプロンプト文字列に変換する
 * （systemPrompt は CLI オプションで渡すので、ここでは会話のみ）
 */
function formatMessagesForClaude(messages: Message[]): string {
  const conversationMessages = messages.filter((m) => m.role !== "system");

  // 単一メッセージならそのまま返す
  if (conversationMessages.length === 1) {
    return conversationMessages[0].content;
  }

  // 複数メッセージの場合は履歴を埋め込む
  const parts: string[] = [];
  for (const m of conversationMessages) {
    const label = m.role === "user" ? "User" : "Assistant";
    parts.push(`[${label}]\n${m.content}`);
  }
  return parts.join("\n\n");
}

/**
 * CLI プロセスを spawn して結果を取得する
 */
function spawnCli(
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: HOME,
      env: getEnvWithPath(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(
        new Error(
          `CLI プロセスがタイムアウトしました（${TIMEOUT_MS / 1000}秒）`,
        ),
      );
    }, TIMEOUT_MS);

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new Error(`CLI の起動に失敗しました: ${command} - ${err.message}`),
      );
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

/**
 * Claude CLI をストリーミング付きで実行する
 */
function spawnClaudeStreaming(
  args: string[],
  onDelta?: (textSoFar: string) => void,
): Promise<ChatCompletionResult> {
  return new Promise((resolve, reject) => {
    const command = CLI_PATHS["claude-cli"];
    const proc = spawn(command, args, {
      cwd: HOME,
      env: getEnvWithPath(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    let textSoFar = "";
    let resultText = "";
    let resolvedModel = "";
    let buffer = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      // 最後の不完全な行はバッファに残す
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const event = JSON.parse(trimmed) as Record<string, unknown>;

          // stream_event ラッパー内の content_block_delta を処理
          if (event.type === "stream_event" && typeof event.event === "object" && event.event !== null) {
            const inner = event.event as Record<string, unknown>;
            if (
              inner.type === "content_block_delta" &&
              typeof inner.delta === "object" &&
              inner.delta !== null
            ) {
              const delta = inner.delta as Record<string, unknown>;
              if (delta.type === "text_delta" && typeof delta.text === "string") {
                textSoFar += delta.text;
                onDelta?.(textSoFar);
              }
            }
          }

          // assistant イベントからコンテンツを抽出（フォールバック）
          if (event.type === "assistant" && typeof event.message === "object" && event.message !== null) {
            const msg = event.message as Record<string, unknown>;
            if (Array.isArray(msg.content) && msg.content.length > 0) {
              const block = msg.content[0] as Record<string, unknown>;
              if (typeof block.text === "string") {
                textSoFar = block.text;
                onDelta?.(textSoFar);
              }
            }
            // モデル名を取得
            if (typeof msg.model === "string") {
              resolvedModel = msg.model;
            }
          }

          if (event.type === "result" && typeof event.result === "string") {
            resultText = event.result;
          }
        } catch {
          // JSON パース失敗は無視（非 JSON 行の可能性）
        }
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(
        new Error(
          `claude-cli がタイムアウトしました（${TIMEOUT_MS / 1000}秒）`,
        ),
      );
    }, TIMEOUT_MS);

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new Error(
          `claude-cli の起動に失敗しました: ${command} - ${err.message}`,
        ),
      );
    });

    proc.on("close", (code) => {
      clearTimeout(timer);

      // バッファに残った最終行も処理
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer.trim()) as Record<string, unknown>;
          if (event.type === "result" && typeof event.result === "string") {
            resultText = event.result;
          }
        } catch {
          // 無視
        }
      }

      if (code !== 0) {
        reject(
          new Error(
            `claude-cli が異常終了しました（コード: ${code}）: ${stderr.slice(0, 500)}`,
          ),
        );
        return;
      }

      // resultText が取得できていない場合はストリーミングで蓄積したテキストを使用
      const content = resultText || textSoFar;
      resolve({
        content,
        model: resolvedModel || "claude",
      });
    });
  });
}

/**
 * Codex CLI の stdout から回答テキストを抽出する
 *
 * codex exec はレスポンス全文をそのまま stdout に出力する
 */
function parseCodexOutput(stdout: string): string {
  return stdout.trim();
}

/**
 * Codex CLI で completion を実行する
 */
async function runCodexCli(
  messages: Message[],
  options?: {
    model?: string;
    reasoningEffort?: string;
    systemPrompt?: string;
    onDelta?: (textSoFar: string) => void;
  },
): Promise<ChatCompletionResult> {
  const prompt = formatMessages(messages);
  const args = ["exec", "--skip-git-repo-check"];

  if (options?.model) {
    args.push("-m", options.model);
  }

  if (options?.reasoningEffort) {
    args.push("-c", `model_reasoning_effort="${options.reasoningEffort}"`);
  }

  // システムプロンプトと system ロールメッセージを developer_instructions で渡す
  const systemMessages = messages.filter((m) => m.role === "system");
  const combinedSystemPrompt = [
    options?.systemPrompt,
    ...systemMessages.map((m) => m.content),
  ]
    .filter(Boolean)
    .join("\n");

  if (combinedSystemPrompt) {
    args.push("-c", `developer_instructions="${combinedSystemPrompt.replace(/"/g, '\\"')}"`);
  }

  args.push(prompt);

  const { stdout, stderr, exitCode } = await spawnCli(
    CLI_PATHS["codex-cli"],
    args,
  );

  if (exitCode !== 0) {
    throw new Error(
      `codex-cli が異常終了しました（コード: ${exitCode}）: ${stderr.slice(0, 500)}`,
    );
  }

  const content = parseCodexOutput(stdout);

  // onDelta に最終結果を渡す（Codex は非ストリーミング）
  options?.onDelta?.(content);

  return {
    content,
    model: options?.model ?? CODEX_LOCAL,
  };
}

/**
 * Claude Code CLI で completion を実行する
 */
async function runClaudeCli(
  messages: Message[],
  options?: {
    model?: string;
    systemPrompt?: string;
    onDelta?: (textSoFar: string) => void;
  },
): Promise<ChatCompletionResult> {
  const prompt = formatMessagesForClaude(messages);

  // system メッセージを systemPrompt に統合
  const systemMessages = messages.filter((m) => m.role === "system");
  const combinedSystemPrompt = [
    options?.systemPrompt,
    ...systemMessages.map((m) => m.content),
  ]
    .filter(Boolean)
    .join("\n");

  const args = [
    "-p",
    prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
  ];

  if (options?.model) {
    args.push("--model", options.model);
  }

  if (combinedSystemPrompt) {
    args.push("--system-prompt", combinedSystemPrompt);
  }

  const result = await spawnClaudeStreaming(args, options?.onDelta);

  // モデル名の決定:
  // - CLI からモデル名が取得できた場合: Raycast 未指定なら「（ローカル設定）」を付記
  // - 取得できなかった場合: Raycast 指定があればそれを、なければフォールバック表示
  const hasCliModel = result.model && result.model !== "claude";
  const model = hasCliModel
    ? options?.model ? result.model : `${result.model}（ローカル設定）`
    : options?.model ?? CLAUDE_LOCAL;

  return {
    ...result,
    model,
  };
}

/**
 * CLI プロバイダーを使って chat completion を実行する
 */
export async function createCliCompletion(
  provider: "codex-cli" | "claude-cli",
  messages: Message[],
  options?: {
    model?: string;
    reasoningEffort?: string;
    systemPrompt?: string;
    onDelta?: (textSoFar: string) => void;
  },
): Promise<ChatCompletionResult> {
  if (provider === "codex-cli") {
    return runCodexCli(messages, options);
  }
  return runClaudeCli(messages, options);
}
