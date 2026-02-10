# プロジェクト仕様書

## 1. 概要

### 目的
Raycast 上で複数の AI プロバイダーを利用したチャットインターフェースを提供する拡張機能「Call AI」を開発する。
ランチャーから離れることなく AI との対話を完結させ、日常的な質問・作業支援を効率化する。

### 対象ユーザー
開発者本人（ローカル開発モードで自分専用）


## 2. 機能要件

| ID | 機能名 | 説明 | 優先度 | MVP |
|----|--------|------|--------|-----|
| FR-001 | チャット送信 | SearchBar からテキストを入力し、選択中のプロバイダーにメッセージを送信する | Must | o |
| FR-002 | チャット表示 | List + List.Item.Detail（markdown）で会話メッセージを一覧表示する | Must | o |
| FR-003 | 会話履歴送信 | API 呼び出し時に現在の会話履歴全体を送信し、文脈を維持する | Must | o |
| FR-004 | 会話永続化 | LocalStorage で会話データを保存・復元する | Must | o |
| FR-005 | 複数行入力 | ActionPanel から Form を開き、複数行テキストを入力できる | Must | o |
| FR-006 | エラーハンドリング | プロバイダー別にエラーを分類し、Toast で表示する | Must | o |
| FR-007 | 二重送信防止 | API 応答待ち中は入力をロックし、isLoading で状態を示す | Must | o |
| FR-008 | 会話クリア | 現在の会話履歴を全削除する | Must | o |
| FR-009 | メッセージコピー | 最後の AI レスポンスの内容をクリップボードにコピーする | Should | o |
| FR-010 | スレッド管理 | 複数の会話スレッドを作成・切替・削除する | Should | o |
| FR-011 | スレッド一覧 | 保存済みスレッドをリスト表示し、選択して会話を再開する | Should | o |
| FR-012 | 履歴上限管理 | トークン超過時に古いメッセージを切り捨てて送信する | Could | o |
| FR-013 | デフォルトプロンプト | 初回起動時にデフォルトのカスタムプロンプトを自動生成する | Should | o |
| FR-014 | プリセット作成 | Form で名前・システムプロンプト・プロバイダー・モデル・アイコンを指定してプリセットを作成する | Should | o |
| FR-015 | プリセット一覧管理 | プリセットの一覧表示・編集・削除・並べ替え・会話開始を行う | Should | o |
| FR-016 | プリセット切替 | チャット画面の SearchBar 横ドロップダウンでプリセットを切り替える | Should | o |
| FR-017 | プリセット参照 | Thread に customCommandId を保持し、どのプリセットで会話しているか参照する | Should | o |
| FR-018 | モデル・プロバイダー設定一元化 | モデル・プロバイダーをプリセット設定で一元管理する（デフォルトプロンプトがグローバル設定） | Should | o |
| FR-019 | マルチプロバイダー対応 | OpenAI API / Codex CLI / Claude Code CLI の3プロバイダーを切り替えて使用できる | Should | o |

**優先度**: Must（必須）/ Should（推奨）/ Could（任意）

### フェーズ分割

| フェーズ | スコープ | 対応要件 | 状態 |
|----------|----------|----------|------|
| Phase 1 | 単一会話での送受信・表示・保存 | FR-001 ~ FR-009 | 完了 |
| Phase 2 | 複数会話スレッド管理 | FR-010 ~ FR-012 | 完了 |
| Phase 3 | システムプロンプト & プリセット | FR-013 ~ FR-018 | 完了 |
| Phase 4 | マルチプロバイダー対応 | FR-019 | 完了 |


## 3. 技術スタック

| カテゴリ | 技術 | 選定理由 |
|----------|------|----------|
| 言語 | TypeScript | Raycast 拡張機能の標準開発言語 |
| UI フレームワーク | @raycast/api | Raycast 拡張機能の公式 API |
| AI プロバイダー: OpenAI API | OpenAI Responses API（openai SDK） | 安定した API、ストリーミング対応、Web 検索ツール内蔵 |
| AI プロバイダー: Codex CLI | `codex exec` コマンド経由 | ChatGPT Pro/Plus プラン範囲内で追加課金なし |
| AI プロバイダー: Claude Code CLI | `claude -p` コマンド経由（stream-json） | Claude Pro/Max プラン範囲内で追加課金なし |
| 永続化 | Raycast LocalStorage | 拡張機能内でローカル暗号化 DB に保存。追加依存なし |
| 設定管理 | Raycast Preferences API | APIキーを password 型で安全に保管。manifest で宣言的に定義 |


## 4. アーキテクチャ

### コマンド定義（package.json）

| コマンド名 | タイトル | 説明 |
|-----------|---------|------|
| call-ai | Chat History | メインコマンド。スレッド一覧 + チャット画面 |
| call-ai-new | New Chat | 新規会話を作成して開始するラッパー |
| use-prompt | Use Preset | プリセット選択 → 会話開始（引数 `promptName` でプロンプト名の直接指定可） |
| ai-prompts | Manage Presets | プリセット一覧管理（作成・編集・削除・並べ替え） |

### ディレクトリ構成

```
call-ai/
├── src/
│   ├── call-ai.tsx              # メインコマンド（List + Detail UI）
│   ├── call-ai-new.tsx          # 新規会話で開始するラッパー
│   ├── use-prompt.tsx           # プリセット選択 → 会話開始（引数でプロンプト名直接指定可）
│   ├── ai-prompts.tsx           # プリセット一覧管理（作成・編集フォームもインライン）
│   ├── services/
│   │   ├── provider.ts          # プロバイダー抽象化層（ルーティング + エラー分類統合）
│   │   ├── openai.ts            # OpenAI API 通信層 + トークン推定・履歴トリミング
│   │   └── cli.ts               # CLI プロバイダー通信層（Codex CLI / Claude Code CLI）
│   ├── storage/
│   │   ├── conversation.ts      # LocalStorage による永続化層（メッセージ + スレッド管理）
│   │   └── custom-prompts.ts    # プリセット CRUD（LocalStorage）
│   ├── hooks/
│   │   ├── useConversation.ts   # 会話・スレッド状態管理カスタムフック
│   │   └── useCustomCommands.ts # プリセット状態管理フック
│   └── types/
│       └── index.ts             # 型定義（Provider, Message, Thread, CustomCommand, ApiError, Preferences）
├── package.json
└── tsconfig.json
```

### コンポーネント構成

```
call-ai.tsx（メインコマンド: Chat History）
  ├── CallAI(props: LaunchProps)  … デフォルトエクスポート。スレッド一体型 List + Detail UI
  │     ├── props:
  │     │     ├── startNew?: boolean       … 新規会話で開始するか（call-ai-new 経由）
  │     │     └── launchContext?: { customCommandId?: string }
  │     │           └── プリセット一覧からの起動時に customCommandId を受け取る
  │     ├── SearchBar 入力 → handleSend() でメッセージ送信
  │     │     └── isLoading 中は送信をガード（二重送信防止）
  │     ├── List.Dropdown（searchBarAccessory）
  │     │     └── プリセット切替ドロップダウン（「新規作成」オプション付き）
  │     ├── List（isShowingDetail=true）
  │     │     └── スレッド単位で List.Item を表示（updatedAt 降順）
  │     ├── onSelectionChange → handleSelectionChange()
  │     │     └── フォーカス変更でスレッド切替（selectThread + loadThreadMessages）
  │     └── ActionPanel
  │           ├── Action "Send Message"            … ↵ で送信
  │           ├── Action.CopyToClipboard "Copy Last Response" (⌘⇧C)
  │           ├── Action.Push "Multiline Input" (⌘L)
  │           ├── Action "New Conversation" (⌘N)
  │           ├── Action "Clear Conversation" (⌘⇧⌫)
  │           ├── Action "Delete Conversation" (⌃X, Destructive)
  │           └── Action "Delete All Conversations" (⌃⇧X, Destructive, スレッド2件以上時のみ)
  │
  ├── MultiLineForm({ onSend }) … Form.TextArea + SubmitForm アクション
  │
  ├── useConversation（カスタムフック）
  │     ├── sendMessage(content): プロバイダー抽象化層経由で送信
  │     │     1. 二重送信チェック（isLoadingRef）
  │     │     2. ユーザーメッセージ追加 + messageCache 更新
  │     │     3. 初回送信時: スレッドタイトル自動生成（先頭30文字）
  │     │     4. プリセット取得（Thread.customCommandId → getCustomPrompt）
  │     │     5. プロバイダー決定: CustomPrompt.provider > "openai-api"
  │     │     6. モデル決定: CustomPrompt.model > プロバイダー別デフォルト
  │     │     7. システムプロンプト注入（API送信時のみ、LocalStorage には保存しない）
  │     │     8. trimMessagesForContext() でトークン上限チェック
  │     │     9. sendCompletion() → ストリーミング逐次 UI 更新（150ms スロットリング）
  │     │    10. assistant メッセージにモデル名タグ・Web検索タグを付与
  │     ├── clearMessages / createThread / selectThread / deleteThread
  │     └── updateThreadCustomCommand
  │
  ├── provider.ts（プロバイダー抽象化層）
  │     ├── sendCompletion(): プロバイダーに応じて openai or cli に振り分け
  │     └── classifyProviderError(): プロバイダーに応じてエラーを分類
  │
  ├── openai.ts（OpenAI API 通信層）
  │     ├── createChatCompletion(): Responses API + ストリーミング
  │     │     ├── system → instructions に分離、残り → input
  │     │     ├── GPT-5 系: reasoning.effort 設定
  │     │     └── web_search_preview ツール有効化
  │     ├── classifyError(): OpenAI SDK のエラー型で分類
  │     └── trimMessagesForContext(): トークン上限管理
  │
  ├── cli.ts（CLI プロバイダー通信層）
  │     ├── Codex CLI: codex exec → spawn → stdout パース
  │     │     ├── --skip-git-repo-check
  │     │     ├── -m（モデル）, -c developer_instructions（システムプロンプト）
  │     │     └── -c model_reasoning_effort（推論レベル）
  │     └── Claude Code CLI: claude -p → spawn（stream-json）→ ストリーミング
  │           ├── --output-format stream-json --verbose --include-partial-messages
  │           ├── --model（モデル）, --system-prompt（システムプロンプト）
  │           └── stream_event.content_block_delta でテキスト逐次取得
  │
  ├── custom-prompts.ts（プリセット永続化層）
  │     ├── ensureDefaultPrompt(): 初回起動時にデフォルトプロンプトを自動生成
  │     │     └── デフォルト: name="デフォルト", systemPrompt=""（空）, provider="openai-api", model="gpt-4.1-nano", isDefault=true
  │     ├── CRUD: save / load / add / update / delete / get
  │     └── reorder: プリセットの並べ替え
  │
  ├── ai-prompts.tsx（Manage Presets コマンド）
  │     ├── List で全プリセットを表示
  │     │     └── accessories: プロバイダータグ + モデル名
  │     ├── ActionPanel:
  │     │     ├── Edit Prompt: ↵ (Push)
  │     │     ├── Start Conversation: ⌘↵
  │     │     ├── Create Quicklink: ⌘⇧L
  │     │     ├── Create Prompt: ⌘N (Push)
  │     │     ├── Move Up: ⌘⇧↑
  │     │     ├── Move Down: ⌘⇧↓
  │     │     └── Delete Prompt: ⌃X (Destructive, デフォルト以外)
  │     ├── EditCommandForm: Name, System Prompt, Provider, Model, Reasoning Effort, Icon, Use Selected Text
  │     │     ├── Provider 選択に応じてモデル一覧が動的に切替
  │     │     ├── Reasoning Effort は Codex CLI 選択時のみ表示
  │     │     └── OpenAI API キー未設定時はタイトルで警告 + Submit 時バリデーション
  │     └── CreateCommandForm: 同上（新規作成用）
  │
  └── use-prompt.tsx（Use Preset コマンド）
        ├── プリセット一覧を表示し、選択すると call-ai に customCommandId を渡して起動
        ├── 引数 promptName でプロンプト名を直接指定可（Quicklink 連携用）
        └── ActionPanel:
              ├── Start Conversation: ↵
              ├── Create Quicklink: ⌘⇧L
              └── Manage Prompts: (ショートカットなし)
```

### モデル一覧

| プロバイダー | モデル | 備考 |
|-------------|--------|------|
| OpenAI API | gpt-4.1-nano | デフォルト |
| OpenAI API | gpt-4.1-mini | |
| OpenAI API | gpt-4.1 | |
| OpenAI API | gpt-5-nano | |
| OpenAI API | gpt-5-mini | |
| OpenAI API | gpt-5.2 | |
| Codex CLI | gpt-5.3-codex | |
| Codex CLI | gpt-5.2-codex | |
| Codex CLI | gpt-5.2 | |
| Codex CLI | gpt-5.1-codex-mini | |
| Claude CLI | opus | |
| Claude CLI | sonnet | |
| Claude CLI | haiku | |

### UI フロー

#### 起動フロー
1. コマンド起動 → `useConversation` が `isLoading = true` で初期化
2. `loadThreads()` でスレッド一覧を復元
3. `startNew = true`（call-ai-new 経由 or launchContext あり）の場合:
   - 新規スレッドを作成（customCommandId が渡されていれば紐づけ）し先頭に追加
   - 全既存スレッドのメッセージを messageCache に復元
4. `startNew = false`（通常の call-ai 起動）の場合:
   - `loadCurrentThreadId()` で前回のスレッドIDを復元
   - スレッドが0件の場合 → 新規スレッドを自動作成し永続化
   - `currentThreadId` が存在しない or スレッド一覧に該当がない場合 → 先頭スレッドにフォールバック
   - 全スレッドのメッセージを messageCache に復元し、選択中スレッドは `messages` state にも反映
5. 復元成功 → `isLoading = false` → List にスレッド一覧を updatedAt 降順で表示
6. 復元失敗 → Toast でエラー通知し、空の会話として開始

#### メッセージ送信フロー
1. SearchBar にテキスト入力 → Enter キー押下
2. `isLoadingRef` で同期的に二重送信チェック
3. ユーザーメッセージを `messages` に追加 + `messageCache` 更新 → `isLoading = true`
4. 初回送信時: スレッドタイトルを先頭30文字で自動生成
5. プリセット取得（Thread.customCommandId → `getCustomPrompt()`）
6. プロバイダー決定: `CustomPrompt.provider > "openai-api"`
7. モデル決定: `CustomPrompt.model > プロバイダー別デフォルト`
8. システムプロンプト注入（API送信時のみ、LocalStorage には保存しない）
9. `trimMessagesForContext()` でトークン上限チェック（全プロバイダーで実行、モデルにより上限差）
10. `sendCompletion()` でプロバイダーに応じた API 呼び出し
    - OpenAI API: ストリーミング + Web 検索
    - CLI: spawn プロセス（Claude はストリーミング、Codex は一括）
11. 完了後 assistant メッセージにモデル名タグ・Web検索タグを付与
12. LocalStorage に会話 + スレッド一覧を保存
13. エラー時は `classifyProviderError()` で分類し Toast 表示

#### 表示仕様
- メイン画面はスレッド一体型の List + Detail レイアウト（`isShowingDetail = true` 常時有効）
- List にはスレッド一覧を `updatedAt` 降順で表示（最新のスレッドが先頭）
- 各 List.Item にスレッドタイトル、メッセージ数（subtitle）、更新日時（accessories）
- Detail パネルに選択中スレッドの会話全体を Markdown で表示
  - ユーザーメッセージ: 引用ブロック（`> `）
  - AI メッセージ: モデル名タグ・Web検索タグ付き
  - Q&A セット間を区切り線（`---`）で区切り
- ストリーミング中は `statusText`（「考え中...」「Web検索中...」）を Detail 先頭にイタリック表示
- `filtering = false` で SearchBar をメッセージ送信用途に使用


## 5. インターフェース

### プロバイダー

| プロバイダー | 通信方式 | ストリーミング | Web 検索 | 認証方式 |
|-------------|---------|--------------|---------|---------|
| OpenAI API | openai SDK（Responses API） | o | o（web_search_preview） | API キー（Preferences） |
| Codex CLI | `codex exec`（spawn） | -（一括応答） | - | ChatGPT アカウント（`codex login`） |
| Claude Code CLI | `claude -p`（spawn、stream-json） | o | - | Claude サブスク（`claude setup-token`） |

### プロバイダー別 API 詳細

#### OpenAI API
| 項目 | 値 |
|------|-----|
| API | OpenAI Responses API（`client.responses.create`） |
| デフォルトモデル | `gpt-4.1-nano` |
| ストリーミング | `stream: true` |
| 送信内容 | system → `instructions` に分離、残り → `input` |
| ツール | `web_search_preview` 有効 |
| 推論設定 | GPT-5 系: `reasoning.effort` 設定 |

#### Codex CLI
| 項目 | 値 |
|------|-----|
| コマンド | `codex exec --skip-git-repo-check` |
| モデル | `-m {model}` |
| システムプロンプト | `-c developer_instructions="{prompt}"` |
| 推論レベル | `-c model_reasoning_effort="{effort}"` |

#### Claude Code CLI
| 項目 | 値 |
|------|-----|
| コマンド | `claude -p {prompt} --output-format stream-json --verbose --include-partial-messages` |
| モデル | `--model {model}` |
| システムプロンプト | `--system-prompt {prompt}` |
| 環境変数 | `CLAUDE_CODE_OAUTH_TOKEN`（シェルから取得してキャッシュ） |

### データモデル

#### Message

| フィールド | 型 | 説明 |
|----------|------|------|
| id | string | メッセージ固有ID（UUID v4） |
| threadId | string | 所属するスレッドのID |
| role | "user" \| "assistant" \| "system" | メッセージの送信者種別 |
| content | string | メッセージ本文 |
| createdAt | string | 作成日時（ISO 8601） |

#### Thread

| フィールド | 型 | 説明 |
|----------|------|------|
| id | string | スレッド固有ID（UUID v4） |
| title | string | スレッド名（初期値「新しい会話」、初回メッセージ送信時に先頭30文字で自動生成） |
| createdAt | string | 作成日時（ISO 8601） |
| updatedAt | string | 最終更新日時（ISO 8601） |
| customCommandId? | string | 紐づくプリセットのID |

#### CustomCommand

| フィールド | 型 | 説明 |
|----------|------|------|
| id | string | プロンプト固有ID（UUID v4） |
| name | string | プロンプト名（表示名） |
| systemPrompt | string | システムプロンプト |
| model? | string | 使用するモデル（任意。未指定時はプロバイダーのデフォルトモデル） |
| icon? | string | Raycast Icon 名（任意。未指定時は Bubble） |
| provider? | string | プロバイダー（未指定時は "openai-api"） |
| reasoningEffort? | string | Codex CLI 用の推論レベル（low / medium / high） |
| isDefault? | boolean | デフォルトプロンプト識別フラグ（true のプロンプトは削除不可） |
| useSelectedText? | boolean | 起動時に選択テキストを初回メッセージとして自動送信する |

#### Preferences

| フィールド | 型 | 説明 |
|----------|------|------|
| apiKey | string | OpenAI API キー |

### LocalStorage キー設計

| キー | 値の型 | 説明 |
|------|--------|------|
| `call-ai:messages:{threadId}` | JSON string（Message[]） | スレッドごとのメッセージ配列 |
| `call-ai:threads` | JSON string（Thread[]） | スレッド一覧 |
| `call-ai:current-thread` | string | 現在選択中のスレッドID |
| `call-ai:custom-commands` | JSON string（CustomCommand[]） | プリセット一覧 |
| `call-ai:default-command-id` | string | デフォルトプロンプトのID（初期生成済みフラグ） |

### Preferences 設定

package.json の `preferences` セクションで宣言する。モデル・プロバイダー設定はプリセット管理（CustomCommand）に一元化。

| name | type | title | 説明 |
|------|------|-------|------|
| apiKey | password | OpenAI API Key | OpenAI API 使用時のみ必要（optional） |

**Note**: モデル・プロバイダーの選択はプリセット設定で管理する。「デフォルト」プリセットがグローバル設定の役割を果たす。


## 6. 制約

### 非機能要件

| ID | カテゴリ | 要件 |
|----|----------|------|
| NFR-001 | セキュリティ | API キーは Preferences API（password 型）で保管し、ログ出力・平文表示を禁止する |
| NFR-002 | セキュリティ | LocalStorage は Raycast によりローカル暗号化 DB で管理される |
| NFR-003 | セキュリティ | CLI プロバイダーの認証トークンは各 CLI の仕組み（Keychain 等）に委任する |
| NFR-004 | パフォーマンス | API 応答待ち中は isLoading 表示で体感的な待機感を緩和する |
| NFR-005 | 信頼性 | エラー時はプロバイダー別にエラーを分類し、適切なメッセージを表示する |
| NFR-006 | データ整合性 | 送信成功後に LocalStorage へ保存し、データ欠損を防ぐ |
| NFR-007 | 互換性 | Raycast 環境では PATH が不十分なため、CLI 実行パスを明示的に補完する |

### コーディング規約

- Raycast 拡張機能の公式ガイドラインに準拠
- TypeScript strict モード有効
- 関数・変数名は camelCase、型名は PascalCase
- API キーを含む秘匿情報はログに出力しない

### スコープ外

- マルチモーダル入力（画像・ファイル添付）
- Raycast Store への公開・配布
