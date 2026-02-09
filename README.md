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
