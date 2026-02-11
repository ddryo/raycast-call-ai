# Call AI - Raycast Extension

Raycast 上で複数の AI プロバイダーを使えるチャット拡張機能。

## プロバイダー

| プロバイダー | 説明 | 認証方式 | 追加課金 |
|-------------|------|---------|---------|
| **OpenAI API** | OpenAI Responses API 直接呼び出し | API キー（Preferences） | API 従量課金 |
| **Codex CLI** | OpenAI Codex CLI (`codex exec`) 経由 | ChatGPT アカウント（`codex login`） | Pro/Plus プラン範囲内 |
| **Claude Code CLI** | Claude Code CLI (`claude -p`) 経由 | Claude サブスク（`setup-token`） | Pro/Max プラン範囲内 |

## セットアップ

### 1. 拡張機能のインストール

リポジトリをクローン（または ZIP ダウンロード）し、依存パッケージをインストールします。

```bash
git clone <this-repo>
cd raycast-call-ai
npm install
npm run dev
```

`npm run dev` を実行すると拡張機能がビルドされ、Raycast に開発モードで読み込まれます。Raycast 上で「Call AI」が使えるようになっていることを確認してください。

![Raycast からコマンドを検索](assets/screenshots/search-command.png)

> **Note:** `npm run dev` はファイル変更を監視し続けるため、ターミナルのプロセスが動作中の間のみ拡張機能が有効になります。常用する場合は `npm run build` でビルドしておくと、プロセスを起動し続ける必要がなくなります。

### 2. プロバイダー別の初期設定

#### OpenAI API（デフォルト）

1. Raycast の拡張機能設定で **OpenAI API Key** を入力
2. 追加設定なし

拡張機能の設定画面は、コマンド画面の左下にある歯車アイコンから開けます。

![拡張機能設定への遷移](assets/screenshots/configure-extension.png)

![拡張機能設定画面](assets/screenshots/extension-setting.png)

#### Codex CLI

1. Codex CLI をインストール（[公式手順](https://github.com/openai/codex)参照）
2. ターミナルで認証:
   ```bash
   codex login
   ```
3. プリセット設定で **Provider** を「Codex CLI」に変更

#### Claude Code CLI

1. Claude Code をインストール（[公式手順](https://docs.anthropic.com/en/docs/claude-code)参照）
2. ターミナルで長期トークンを設定:
   ```bash
   claude setup-token
   ```
   - 対話式プロンプトに従い、Claude のサブスクリプション認証を行う
   - トークンは **macOS Keychain** に暗号化保存される
   - Claude Pro/Max プランが必要（追加の API 課金は発生しない）
3. プリセット設定で **Provider** を「Claude Code CLI」に変更

> **CLI 利用時の注意:**
> - CLI 経由で呼び出す場合、`~/.claude/CLAUDE.md` などの設定ファイルが自動的に読み込まれます。プリセットのシステムプロンプトと内容が重複しないようご注意ください。
> - Web 検索の利用可否は CLI 側の設定に依存します。Codex CLI ではデフォルトで有効ですが、Claude Code CLI では `.claude/settings.json` のパーミッション設定で明示的に許可する必要があります。

### 3. Raycast Preferences

| 設定項目 | 説明 | 必須 |
|----------|------|------|
| OpenAI API Key | OpenAI API キー（OpenAI API 使用時） | OpenAI API 時のみ |

> Provider・Model・Reasoning Effort はプリセット（Manage Presets）で個別に設定します。

## 使い方

### プリセットの設定

**Manage Presets** コマンドから、使用したい AI プロバイダー・モデル・システムプロンプトの組み合わせをプリセットとして登録できます。

![Manage Presets コマンド](assets/screenshots/manage-preset.png)

初期状態では「デフォルト」プリセットが 1 つだけ用意されています。

![デフォルトプリセットの編集画面](assets/screenshots/default-preset.png)

プロバイダー・モデル・システムプロンプトなどを自由にカスタマイズしてください。

### 会話を始める

**New Chat** コマンドで、新しいチャットスレッドを作成できます。デフォルトプリセットの設定が適用されます。

![New Chat コマンド](assets/screenshots/new-chat.png)

### プリセットを指定して会話する

登録したプリセットは、以下のいずれかの方法で呼び出せます。

#### 方法 1: Use Preset コマンドから選択

**Use Preset** コマンドを開くと、登録済みのプリセット一覧が表示されます。使いたいプリセットを選択して会話を開始できます。

![Use Preset コマンドのプリセット一覧](assets/screenshots/use-preset.png)

#### 方法 2: チャット画面のドロップダウンで切り替え

チャット画面の右上にあるドロップダウンから、会話中でもプリセットを切り替えることができます。

![チャット画面のプリセット選択ドロップダウン](assets/screenshots/select-preset-dropdown.png)

#### 方法 3: Use Preset コマンドに引数を指定

**Use Preset** コマンドにプリセット名を引数として渡すことで、一覧画面を経由せずに直接プリセットを呼び出すことも可能です。

![Use Preset に引数を指定して呼び出し](assets/screenshots/use-preset-by-args.png)

### Quicklink でプリセットを独立コマンド化する

よく使うプリセットを Raycast の **Quicklink** として登録すると、プリセットごとに独立したコマンドのように呼び出せるようになります。

#### Quicklink の作成手順

1. **Use Preset** のプリセット一覧画面、または **Manage Presets** のプリセット編集画面で **Create Quicklink** アクション（`⌘⇧L`）を実行します。

   ![Create Quicklink アクション](assets/screenshots/create-quicklink.png)

2. Quicklink の作成フォームが表示されるので、そのまま **Save** してください。

   ![Quicklink 作成フォーム](assets/screenshots/create-quicklink-form.png)

3. 保存すると、Raycast のコマンド検索からプリセットを直接呼び出せるようになります。

   ![Quicklink からプリセットを呼び出し](assets/screenshots/call-quicklink.png)

4. 初回呼び出し時のみ確認ダイアログが表示されます。**Always Allow** を選択すると、以降はダイアログなしで起動できます。

   ![Quicklink 確認ダイアログ](assets/screenshots/quicklink-dialog.png)

> **Quicklink 利用時の注意:**
> - プリセットを削除しても、作成済みの Quicklink は自動では削除されません。不要になった場合は手動で Quicklink を削除してください。
> - プリセットのタイトルを変更した場合も、Quicklink の再作成が必要です。

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
- プリセット（システムプロンプト + モデル + プロバイダーの組み合わせ）
- 会話履歴の永続化
- Web 検索（OpenAI API 使用時）
- 選択テキスト自動送信（プリセットの設定で有効化）
- Quicklink 作成（プリセットへの直接アクセス）

## コマンド一覧

| コマンド | 説明 |
|----------|------|
| **Chat History** | 会話履歴を表示し、既存スレッドで AI とチャット |
| **New Chat** | 新しいスレッドを作成して AI とチャットを開始 |
| **Use Preset** | プリセットを選んで会話を開始（引数でプリセット名を直接指定可） |
| **Manage Presets** | プリセットの作成・編集・削除・並べ替え |

## アクション（ショートカットキー）

### Chat History / New Chat

| アクション | ショートカット | 説明 |
|---|---|---|
| Send Message | `↵` | 入力テキストを AI に送信 |
| Copy Last Response | `⌘⇧C` | 最後の AI 応答をクリップボードにコピー（応答がある場合のみ） |
| Multiline Input | `⌘L` | 複数行入力フォームを開く |
| New Conversation | `⌘N` | 新規スレッドを作成 |
| Clear Conversation | `⌘⇧⌫` | 現在のスレッドの会話をクリア |
| Delete Conversation | `⌃X` | スレッドを削除 |
| Delete All Conversations | `⌃⇧X` | 全スレッドを削除（2件以上時のみ） |

#### Multiline Input フォーム

| アクション | ショートカット | 説明 |
|---|---|---|
| Send Message | `⌘↵` | 入力テキストを送信 |

### Use Preset

| アクション | ショートカット | 説明 |
|---|---|---|
| Start Conversation | `↵` | 選択したプリセットで会話を開始 |
| Create Quicklink | `⌘⇧L` | 選択プリセットへの Quicklink を作成 |
| Manage Prompts | − | Manage Presets コマンドを起動 |

### Manage Presets

| アクション | ショートカット | 説明 |
|---|---|---|
| Edit Prompt | `↵` | 編集フォームを開く |
| Start Conversation | `⌘↵` | そのプリセットで会話を開始 |
| Create Quicklink | `⌘⇧L` | Quicklink を作成 |
| Create Prompt | `⌘N` | 新規作成フォームを開く |
| Move Up | `⌘⇧↑` | プリセットを上に移動 |
| Move Down | `⌘⇧↓` | プリセットを下に移動 |
| Delete Prompt | `⌃X` | プリセットを削除（デフォルトプリセット以外） |

#### 編集 / 作成フォーム

| アクション | ショートカット | 説明 |
|---|---|---|
| Update Prompt / Create Prompt | `⌘↵` | フォーム内容を保存 |
| Create Quicklink | `⌘⇧L` | Quicklink を作成（編集フォームのみ） |
