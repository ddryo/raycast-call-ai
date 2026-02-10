# プロジェクト仕様書

## 1. 概要

### 目的
Raycast 上で複数の AI プロバイダーを利用したチャットインターフェースを提供する拡張機能「call-ai」を開発する。
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
| FR-014 | カスタムプロンプト作成 | Form で名前・システムプロンプト・プロバイダー・モデル・アイコンを指定してカスタムプロンプトを作成する | Should | o |
| FR-015 | カスタムプロンプト一覧管理 | カスタムプロンプトの一覧表示・編集・削除・会話開始を行う | Should | o |
| FR-016 | カスタムプロンプト切替 | チャット画面の SearchBar 横ドロップダウンでカスタムプロンプトを切り替える | Should | o |
| FR-017 | カスタムプロンプト参照 | Thread に customCommandId を保持し、どのカスタムプロンプトで会話しているか参照する | Should | o |
| FR-018 | モデル・プロバイダー設定一元化 | モデル・プロバイダーをカスタムプロンプト設定で一元管理する（デフォルトプロンプトがグローバル設定） | Should | o |
| FR-019 | マルチプロバイダー対応 | OpenAI API / Codex CLI / Claude Code CLI の3プロバイダーを切り替えて使用できる | Should | o |

**優先度**: Must（必須）/ Should（推奨）/ Could（任意）

### フェーズ分割

| フェーズ | スコープ | 対応要件 | 状態 |
|----------|----------|----------|------|
| Phase 1 | 単一会話での送受信・表示・保存 | FR-001 ~ FR-009 | 完了 |
| Phase 2 | 複数会話スレッド管理 | FR-010 ~ FR-012 | 完了 |
| Phase 3 | システムプロンプト & カスタムプロンプト | FR-013 ~ FR-018 | 完了 |
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

### ディレクトリ構成

```
call-ai/
├── src/
│   ├── call-ai.tsx              # メインコマンド（List + Detail UI）
│   ├── call-ai-new.tsx          # 新規会話で開始するラッパー
│   ├── create-ai-prompt.tsx    # カスタムプロンプト作成フォーム
│   ├── ai-prompts.tsx          # カスタムプロンプト一覧管理
│   ├── services/
│   │   ├── provider.ts         # プロバイダー抽象化層（ルーティング + エラー分類統合）
│   │   ├── openai.ts           # OpenAI API 通信層 + トークン推定・履歴トリミング
│   │   └── cli.ts              # CLI プロバイダー通信層（Codex CLI / Claude Code CLI）
│   ├── storage/
│   │   ├── conversation.ts     # LocalStorage による永続化層（メッセージ + スレッド管理）
│   │   └── custom-prompts.ts   # カスタムプロンプトの CRUD（LocalStorage）
│   ├── hooks/
│   │   ├── useConversation.ts  # 会話・スレッド状態管理カスタムフック
│   │   └── useCustomCommands.ts # カスタムプロンプト状態管理フック
│   └── types/
│       └── index.ts            # 型定義（Provider, Message, Thread, CustomCommand, ApiError, Preferences）
├── package.json
└── tsconfig.json
```

### コンポーネント構成

```
call-ai.tsx（メインコマンド）
  ├── CallAI(props: LaunchProps)  … デフォルトエクスポート。スレッド一体型 List + Detail UI
  │     ├── props:
  │     │     ├── startNew?: boolean       … 新規会話で開始するか（call-ai-new 経由）
  │     │     └── launchContext?: { customCommandId?: string }
  │     │           └── カスタムプロンプト一覧からの起動時に customCommandId を受け取る
  │     ├── SearchBar 入力 → handleSend() でメッセージ送信
  │     │     └── isLoading 中は送信をガード（二重送信防止）
  │     ├── List.Dropdown（searchBarAccessory）
  │     │     └── カスタムプロンプト切替ドロップダウン
  │     ├── List（isShowingDetail=true）
  │     │     └── スレッド単位で List.Item を表示（updatedAt 降順）
  │     ├── onSelectionChange → handleSelectionChange()
  │     │     └── フォーカス変更でスレッド切替（selectThread + loadThreadMessages）
  │     └── ActionPanel
  │           ├── Action "Send Message"            … Enter で送信
  │           ├── Action.CopyToClipboard "Copy Last Response" (Cmd+Shift+C)
  │           ├── Action.Push "Multiline Input" (Cmd+L)
  │           ├── Action "New Conversation" (Cmd+N)
  │           ├── Action "Clear Conversation" (Cmd+Shift+Backspace)
  │           └── Action "Delete Conversation" (Ctrl+D, Destructive)
  │
  ├── MultiLineForm({ onSend }) … Form.TextArea + SubmitForm アクション
  │
  ├── useConversation（カスタムフック）
  │     ├── sendMessage(content): プロバイダー抽象化層経由で送信
  │     │     1. 二重送信チェック（isLoadingRef）
  │     │     2. ユーザーメッセージ追加 + messageCache 更新
  │     │     3. 初回送信時: スレッドタイトル自動生成（先頭30文字）
  │     │     4. カスタムプロンプト取得（Thread.customCommandId → getCustomPrompt）
  │     │     5. プロバイダー決定: CustomPrompt.provider > Preferences.provider
  │     │     6. モデル決定: CustomPrompt.model > プロバイダー別 Preferences
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
  ├── custom-prompts.ts（カスタムプロンプト永続化層）
  │     ├── ensureDefaultPrompt(): 初回起動時にデフォルトプロンプトを自動生成
  │     ├── CRUD: save / load / add / update / delete / get
  │     └── デフォルトプロンプト: 簡潔・正確な回答を促すシステムプロンプト
  │
  └── ai-prompts.tsx（モデル & プロンプト管理コマンド）
        ├── List で全カスタムプロンプトを表示
        │     └── accessories: プロバイダータグ + モデル名
        ├── ActionPanel: Edit / Start Conversation / Create / Delete
        ├── 末尾に「新規プロンプトを作成...」固定アイテム
        ├── EditCommandForm: Name, System Prompt, Provider, Model, Reasoning Effort, Icon
        │     ├── Provider 選択に応じてモデル一覧が動的に切替
        │     ├── Reasoning Effort は Codex CLI 選択時のみ表示
        │     └── OpenAI API キー未設定時はタイトルで警告 + Submit 時バリデーション
        └── CreateCommandForm: 同上（新規作成用）
```

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
5. カスタムプロンプト取得（Thread.customCommandId → `getCustomPrompt()`）
6. プロバイダー決定: `CustomPrompt.provider > Preferences.provider > "openai-api"`
7. モデル決定:
   - CustomPrompt.model が指定されている → それを使用
   - OpenAI API → `Preferences.model`
   - Codex CLI → `Preferences.codexModel`（未指定なら CLI ローカル設定に委任）
   - Claude CLI → `Preferences.claudeModel`（未指定なら CLI ローカル設定に委任）
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
| 推論設定 | GPT-5 系: `reasoning.effort = "low"` |

#### Codex CLI
| 項目 | 値 |
|------|-----|
| コマンド | `codex exec --skip-git-repo-check` |
| モデル | `-m {model}`（Preferences 指定時） |
| システムプロンプト | `-c developer_instructions="{prompt}"` |
| 推論レベル | `-c model_reasoning_effort="{effort}"`（Preferences 指定時） |

#### Claude Code CLI
| 項目 | 値 |
|------|-----|
| コマンド | `claude -p {prompt} --output-format stream-json --verbose --include-partial-messages` |
| モデル | `--model {model}`（Preferences 指定時） |
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
| customCommandId? | string | 紐づくカスタムプロンプトのID |

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

#### Preferences（TypeScript 型定義）

| フィールド | 型 | 説明 |
|----------|------|------|
| apiKey | string | OpenAI API キー |

### LocalStorage キー設計

| キー | 値の型 | 説明 |
|------|--------|------|
| `call-ai:messages:{threadId}` | JSON string（Message[]） | スレッドごとのメッセージ配列 |
| `call-ai:threads` | JSON string（Thread[]） | スレッド一覧 |
| `call-ai:current-thread` | string | 現在選択中のスレッドID |
| `call-ai:custom-commands` | JSON string（CustomCommand[]） | カスタムプロンプト一覧 |
| `call-ai:default-command-id` | string | デフォルトプロンプトのID（初期生成済みフラグ） |

### Preferences 設定

package.json の `preferences` セクションで宣言する。モデル・プロバイダー設定はプロンプト管理（CustomCommand）に一元化。

| name | type | title | 説明 |
|------|------|-------|------|
| apiKey | password | OpenAI API Key | OpenAI API 使用時のみ必要 |

**Note**: モデル・プロバイダーの選択はカスタムプロンプト設定で管理する。「デフォルト」プロンプトがグローバル設定の役割を果たす。


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
