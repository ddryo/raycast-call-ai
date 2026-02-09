# Ask AI - Raycast Extension

Raycast 上で複数の AI プロバイダーを使えるチャット拡張機能。

## プロバイダー

| プロバイダー | 説明 | 認証方式 | 追加課金 |
|-------------|------|---------|---------|
| **OpenAI API** | OpenAI Responses API 直接呼び出し | API キー（Preferences） | API 従量課金 |
| **Codex CLI** | OpenAI Codex CLI (`codex exec`) 経由 | ChatGPT アカウント（`codex login`） | Pro/Plus プラン範囲内 |
| **Claude Code CLI** | Claude Code CLI (`claude -p`) 経由 | Claude サブスク（`setup-token`） | Pro/Max プラン範囲内 |

## セットアップ

### 1. 拡張機能のインストール

```bash
git clone <this-repo>
cd raycast-test
npm install
npm run dev
```

### 2. プロバイダー別の初期設定

#### OpenAI API（デフォルト）

1. Raycast の拡張機能設定で **OpenAI API Key** を入力
2. 追加設定なし

#### Codex CLI

1. Codex CLI をインストール（[公式手順](https://github.com/openai/codex)参照）
2. ターミナルで認証:
   ```bash
   codex login
   ```
3. Raycast の拡張機能設定で **Provider** を「Codex CLI」に変更

#### Claude Code CLI

1. Claude Code をインストール（[公式手順](https://docs.anthropic.com/en/docs/claude-code)参照）
2. ターミナルで長期トークンを設定:
   ```bash
   claude setup-token
   ```
   - 対話式プロンプトに従い、Claude のサブスクリプション認証を行う
   - トークンは **macOS Keychain** に暗号化保存される
   - Claude Pro/Max プランが必要（追加の API 課金は発生しない）
3. Raycast の拡張機能設定で **Provider** を「Claude Code CLI」に変更

### 3. Raycast Preferences

| 設定項目 | 説明 | 必須 |
|----------|------|------|
| Provider | AI プロバイダーの選択 | - |
| OpenAI API Key | OpenAI API キー（OpenAI API 使用時） | OpenAI API 時のみ |
| Model | 使用するモデル | - |
| Reasoning Effort | 推論モデルの推論レベル | - |

## 認証トークンの解除

### Codex CLI

```bash
codex logout
```

### Claude Code CLI（setup-token）

macOS Keychain から削除:

```bash
security delete-generic-password -s "claude-code"
```

または **Keychain Access.app** を開き、「claude」で検索して該当エントリを手動削除。

## 機能

- AI チャット（ストリーミング対応）
- 複数会話スレッド管理
- カスタムプロンプト（システムプロンプト + モデル + プロバイダーの組み合わせ）
- 会話履歴の永続化
- Web 検索（OpenAI API 使用時）

## コマンド一覧

| コマンド | 説明 |
|----------|------|
| **Chat History** | 会話履歴を表示し、既存スレッドで AI とチャット |
| **New Chat** | 新しいスレッドを作成して AI とチャットを開始 |
| **Use Prompt** | カスタムプロンプトを選んで会話を開始（引数でプロンプト名を直接指定可） |
| **Manage Prompts** | カスタムプロンプトの作成・編集・削除 |

## アクション（ショートカットキー）

### Chat History / New Chat

| アクション | ショートカット | 説明 |
|---|---|---|
| Send Message | `↵` | 入力テキストを AI に送信 |
| Copy Last Response | `⌘⇧C` | 最後の AI 応答をクリップボードにコピー（応答がある場合のみ） |
| Multiline Input | `⌘L` | 複数行入力フォームを開く |
| New Conversation | `⌘N` | 新規スレッドを作成 |
| Clear Conversation | `⌘⇧⌫` | 現在のスレッドの会話をクリア |
| Delete Conversation | `⌃D` | スレッドを削除 |

#### Multiline Input フォーム

| アクション | ショートカット | 説明 |
|---|---|---|
| Send Message | `⌘↵` | 入力テキストを送信 |

### Use Prompt

| アクション | ショートカット | 説明 |
|---|---|---|
| Start Conversation | `↵` | 選択したプロンプトで会話を開始 |
| Create Quicklink | `⌘⇧L` | 選択プロンプトへの Quicklink を作成 |
| Manage Prompts | − | Manage Prompts コマンドを起動 |

### Manage Prompts

| アクション | ショートカット | 説明 |
|---|---|---|
| Edit Prompt | `↵` | 編集フォームを開く |
| Start Conversation | `⌘↵` | そのプロンプトで会話を開始 |
| Create Quicklink | `⌘⇧L` | Quicklink を作成 |
| Create Prompt | `⌘N` | 新規作成フォームを開く |
| Delete Prompt | `⌃X` | プロンプトを削除（デフォルトプロンプト以外） |

#### 編集 / 作成フォーム

| アクション | ショートカット | 説明 |
|---|---|---|
| Update Prompt / Create Prompt | `⌘↵` | フォーム内容を保存 |
