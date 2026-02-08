# プロジェクト仕様書

## 1. 概要

### 目的
Raycast 上で OpenAI API を利用したチャットインターフェースを提供する拡張機能「ask-ai」を開発する。
ランチャーから離れることなく AI との対話を完結させ、日常的な質問・作業支援を効率化する。

### 対象ユーザー
開発者本人（ローカル開発モードで自分専用）


## 2. 機能要件

| ID | 機能名 | 説明 | 優先度 | MVP |
|----|--------|------|--------|-----|
| FR-001 | チャット送信 | SearchBar からテキストを入力し、OpenAI API にメッセージを送信する | Must | o |
| FR-002 | チャット表示 | List + List.Item.Detail（markdown）で会話メッセージを一覧表示する | Must | o |
| FR-003 | 会話履歴送信 | API 呼び出し時に現在の会話履歴全体を送信し、文脈を維持する | Must | o |
| FR-004 | 会話永続化 | LocalStorage で会話データを保存・復元する | Must | o |
| FR-005 | 複数行入力 | ActionPanel から Form を開き、複数行テキストを入力できる | Must | o |
| FR-006 | エラーハンドリング | 401/429/タイムアウト/ネットワーク断を分類し、Toast で表示する | Must | o |
| FR-007 | 二重送信防止 | API 応答待ち中は入力をロックし、isLoading で状態を示す | Must | o |
| FR-008 | 会話クリア | 現在の会話履歴を全削除する | Must | o |
| FR-009 | メッセージコピー | 選択中メッセージの内容をクリップボードにコピーする | Should | o |
| FR-010 | スレッド管理 | 複数の会話スレッドを作成・切替・削除する | Should | o |
| FR-011 | スレッド一覧 | 保存済みスレッドをリスト表示し、選択して会話を再開する | Should | o |
| FR-012 | 履歴上限管理 | トークン超過時に古いメッセージを切り捨てて送信する | Could | o |
| FR-013 | デフォルトシステムプロンプト | Preferences でデフォルトのシステムプロンプトを設定し、全会話の送信時に先頭注入する | Should | - |
| FR-014 | カスタムコマンド作成 | Form で名前・システムプロンプト・モデル・アイコンを指定してカスタムコマンドを作成する | Should | - |
| FR-015 | カスタムコマンド一覧管理 | カスタムコマンドの一覧表示・編集・削除・会話開始を行う | Should | - |
| FR-016 | カスタムコマンド切替 | チャット画面の SearchBar 横ドロップダウンでカスタムコマンド（システムプロンプト）を切り替える | Should | - |
| FR-017 | カスタムコマンド参照 | Thread に customCommandId を保持し、どのカスタムコマンドで会話しているか参照する | Should | - |
| FR-018 | モデル優先順位制御 | CustomCommand.model > Preferences.model の優先順位でモデルを決定する | Should | - |

**優先度**: Must（必須）/ Should（推奨）/ Could（任意）

### フェーズ分割

| フェーズ | スコープ | 対応要件 | 状態 |
|----------|----------|----------|------|
| Phase 1 | 単一会話での送受信・表示・保存 | FR-001 ~ FR-009 | 完了 |
| Phase 2 | 複数会話スレッド管理 | FR-010 ~ FR-012 | 完了 |
| Phase 3 | システムプロンプト & カスタムコマンド | FR-013 ~ FR-018 | 未着手 |


## 3. 技術スタック

| カテゴリ | 技術 | 選定理由 |
|----------|------|----------|
| 言語 | TypeScript | Raycast 拡張機能の標準開発言語 |
| UI フレームワーク | @raycast/api | Raycast 拡張機能の公式 API |
| AI API | OpenAI Responses API | 安定した API、gpt-4.1-nano で低コスト運用 |
| API クライアント | openai（Node.js SDK） | 公式 SDK で型安全かつ保守性が高い |
| 永続化 | Raycast LocalStorage | 拡張機能内でローカル暗号化 DB に保存。追加依存なし |
| 設定管理 | Raycast Preferences API | APIキーを password 型で安全に保管。manifest で宣言的に定義 |


## 4. アーキテクチャ

### ディレクトリ構成

```
ask-ai/
├── src/
│   ├── ask-ai.tsx              # メインコマンド（List + Detail UI）
│   ├── ask-ai-new.tsx          # 新規会話で開始するラッパー
│   ├── create-ai-command.tsx   # カスタムコマンド作成フォーム
│   ├── ai-commands.tsx         # カスタムコマンド一覧管理
│   ├── services/
│   │   └── openai.ts           # OpenAI API 通信層 + トークン推定・履歴トリミング
│   ├── storage/
│   │   ├── conversation.ts     # LocalStorage による永続化層（メッセージ + スレッド管理）
│   │   └── custom-commands.ts  # カスタムコマンドの CRUD（LocalStorage）
│   ├── hooks/
│   │   ├── useConversation.ts  # 会話・スレッド状態管理カスタムフック
│   │   └── useCustomCommands.ts # カスタムコマンド状態管理フック
│   └── types/
│       └── index.ts            # 型定義（Message, Thread, CustomCommand, ApiError, Preferences）
├── package.json
└── tsconfig.json
```

### コンポーネント構成

```
ask-ai.tsx（メインコマンド）
  ├── AskAI()                   … デフォルトエクスポート。List + Detail UI
  │     ├── SearchBar 入力 → handleSend() でメッセージ送信
  │     │     └── isLoading 中は送信をガード（二重送信防止）
  │     ├── List.Dropdown（searchBarAccessory）
  │     │     └── カスタムコマンド切替ドロップダウン
  │     │           ├── 「デフォルト」（Preferences の systemPrompt を使用）
  │     │           └── ユーザー作成の各カスタムコマンド
  │     ├── List.EmptyView      … 会話がない初期状態の案内表示
  │     ├── handleClearConversation() … confirmAlert → clearMessages → 成功Toast
  │     └── ActionPanel
  │           ├── Action "Send Message"            … Enter で送信
  │           ├── Action.CopyToClipboard "Copy Content" (Cmd+Shift+C)
  │           │     └── 選択中メッセージの content をクリップボードにコピー
  │           ├── Action.Push "Multiline Input" (Cmd+L)
  │           │     └── MultiLineForm              … 複数行入力フォーム
  │           ├── Action.Push "Conversation List" (Cmd+T)
  │           │     └── ThreadList                 … スレッド一覧画面へ遷移
  │           ├── Action "New Conversation" (Cmd+N)
  │           │     └── createThread() で新規スレッドを作成
  │           └── Action "Clear Conversation" (Cmd+Shift+Backspace, Destructive)
  │                 └── handleClearConversation() を呼び出し
  │
  ├── ThreadList({ threads, currentThreadId, switchThread, deleteThread })
  │     … スレッド一覧コンポーネント（Action.Push の遷移先）
  │     ├── List で全スレッドを一覧表示
  │     │     ├── 現在のスレッド: CheckCircle アイコン（Green）
  │     │     └── その他のスレッド: Circle アイコン
  │     ├── accessories に updatedAt を表示（formatDateTime 形式）
  │     └── ActionPanel
  │           ├── Action "Open Conversation"  … switchThread → pop() でメインに戻る
  │           └── Action "Delete Conversation" (Ctrl+X, Destructive)
  │                 └── confirmAlert → deleteThread → 成功Toast
  │
  ├── MultiLineForm({ onSend }) … Form.TextArea + SubmitForm アクション
  │     └── 送信後 pop() でメインビューに戻る
  │
  ├── ヘルパー関数
  │     ├── truncate()           … メッセージ短縮表示（60文字上限）
  │     ├── roleLabel()          … role → 表示名変換（User / AI / System）
  │     ├── formatTime()         … ISO 8601 → HH:MM 形式
  │     └── formatDateTime()     … ISO 8601 → "MMM D, HH:MM" 形式（スレッド一覧用）
  │
  ├── useConversation（カスタムフック）
  │     ├── state:
  │     │     ├── messages (Message[])        … 現在のスレッドのメッセージ一覧
  │     │     ├── isLoading (boolean)         … ローディング状態
  │     │     ├── threads (Thread[])          … スレッド一覧
  │     │     └── currentThreadId (string)    … 現在選択中のスレッドID
  │     ├── refs:
  │     │     ├── messagesRef       … 最新 messages 参照
  │     │     ├── isLoadingRef      … 同期的ロック用
  │     │     ├── threadsRef        … 最新 threads 参照
  │     │     └── currentThreadIdRef … 最新 currentThreadId 参照
  │     ├── sendMessage(content):
  │     │     1. isLoadingRef で同期的に二重送信チェック＆ロック
  │     │     2. ユーザーメッセージ追加
  │     │     3. 初回送信時: スレッドタイトルを先頭30文字で自動生成
  │     │     4. trimMessagesForContext() でトークン上限チェック
  │     │        （超過時は古いメッセージを切り捨て + Toast 通知）
  │     │     5. API呼び出し → assistant応答追加
  │     │     6. スレッドの updatedAt を更新
  │     │     7. 保存（失敗時 Toast 通知、state は維持）
  │     │     8. エラー時は classifyError で分類し Toast 表示
  │     │     9. finally で isLoadingRef / isLoading を解除
  │     ├── clearMessages(): ストレージ削除 + state リセット（送信中は無効化）
  │     ├── createThread(): 新規スレッド作成 + 切替（先頭に追加）
  │     ├── switchThread(threadId): スレッド切替 + メッセージ復元
  │     ├── deleteThread(threadId): スレッド削除
  │     │     ├── 全スレッド削除時: 新規スレッドを自動作成
  │     │     ├── 現在のスレッド削除時: 先頭スレッドに自動切替
  │     │     └── 別のスレッド削除時: 現在のスレッドを維持
  │     └── 起動時復元:
  │           1. loadThreads() + loadCurrentThreadId() でスレッド情報を復元
  │           2. threads が空の場合: デフォルトスレッドを自動作成
  │           3. currentThreadId が threads 内に存在しない場合: 先頭にフォールバック
  │           4. loadMessages() で選択中スレッドのメッセージを復元
  │           5. 失敗時 Toast 通知、finally で isLoadingRef / isLoading を false に設定
  │
  ├── openai.ts（API通信層）
  │     ├── createChatCompletion(): 全履歴を送信し応答を取得
  │     ├── classifyError(): エラー分類（判定順序）
  │     │     1. APIConnectionTimeoutError → timeout
  │     │     2. APIConnectionError → network
  │     │     3. APIError (status 401) → auth
  │     │     4. APIError (status 429) → rate_limit
  │     │     5. その他 → unknown
  │     ├── estimateTokens(): テキストのトークン数を簡易推定
  │     │     └── 文字数 / 2 で概算（日英混在を想定）
  │     └── trimMessagesForContext(): トークン上限を超える場合に古いメッセージを切り捨て
  │           ├── モデルごとのコンテキスト上限を参照（MODEL_CONTEXT_LIMITS）
  │           ├── 応答バッファ（RESPONSE_BUFFER = 4096）を差し引き
  │           ├── system メッセージは常に保持
  │           └── 最新のユーザーメッセージを必ず保持し、古い順にスキップ
  │
  ├── conversation.ts（永続化層）
  │     ├── saveMessages(): LocalStorage にメッセージ配列を保存
  │     ├── loadMessages(): LocalStorage からメッセージ配列を復元
  │     ├── clearMessages(): LocalStorage からメッセージを削除
  │     ├── saveThreads(): LocalStorage にスレッド一覧を保存
  │     ├── loadThreads(): LocalStorage からスレッド一覧を復元
  │     ├── saveCurrentThreadId(): LocalStorage に現在のスレッドIDを保存
  │     ├── loadCurrentThreadId(): LocalStorage から現在のスレッドIDを復元
  │     └── DEFAULT_THREAD_ID: デフォルトスレッドID定数（"default"）
  │
  ├── custom-commands.ts（カスタムコマンド永続化層）
  │     ├── saveCustomCommands(): LocalStorage にカスタムコマンド一覧を保存
  │     ├── loadCustomCommands(): LocalStorage からカスタムコマンド一覧を復元
  │     ├── addCustomCommand(): カスタムコマンドを追加
  │     ├── updateCustomCommand(): カスタムコマンドを更新
  │     ├── deleteCustomCommand(): カスタムコマンドを削除
  │     └── getCustomCommand(): ID でカスタムコマンドを取得
  │
  ├── useCustomCommands.ts（カスタムコマンド状態管理フック）
  │     ├── state:
  │     │     ├── commands (CustomCommand[])   … カスタムコマンド一覧
  │     │     └── isLoading (boolean)          … ローディング状態
  │     ├── addCommand(): 新しいカスタムコマンドを追加
  │     ├── updateCommand(): カスタムコマンドを更新
  │     ├── removeCommand(): カスタムコマンドを削除
  │     └── 起動時に loadCustomCommands() で復元
  │
  ├── create-ai-command.tsx（カスタムコマンド作成コマンド）
  │     └── CreateAICommand()    … Form でカスタムコマンドを新規作成
  │           ├── Form.TextField "Name"          … コマンド名（必須）
  │           ├── Form.TextArea "System Prompt"  … システムプロンプト（必須）
  │           ├── Form.Dropdown "Model"          … モデル選択（任意、未指定時は Preferences を使用）
  │           ├── Form.Dropdown "Icon"           … アイコン選択（任意）
  │           └── Action.SubmitForm → addCustomCommand() → 成功 Toast → pop()
  │
  └── ai-commands.tsx（カスタムコマンド一覧コマンド）
        └── AICommands()           … List でカスタムコマンドを一覧管理
              ├── List で全カスタムコマンドを表示
              │     ├── title: コマンド名
              │     ├── subtitle: システムプロンプト（切り詰め表示）
              │     └── accessories: モデル名（設定時のみ）
              └── ActionPanel
                    ├── Action "Start Conversation"  … 選択したコマンドで ask-ai を開始
                    ├── Action.Push "Edit Command"   … 編集フォームへ遷移
                    └── Action "Delete Command" (Ctrl+X, Destructive)
                          └── confirmAlert → deleteCustomCommand → 成功 Toast
```

### UI フロー

#### 起動フロー
1. コマンド起動 → `useConversation` が `isLoading = true` で初期化
2. `loadThreads()` と `loadCurrentThreadId()` でスレッド情報を復元
3. スレッドが0件の場合 → デフォルトスレッドを自動作成し永続化
4. `currentThreadId` が存在しない or スレッド一覧に該当がない場合 → 先頭スレッドにフォールバックし永続化
5. `loadMessages(currentThreadId)` で選択中スレッドの会話履歴を復元
6. 復元成功 → `messages` に反映、`isLoading = false` → List に逆順（最新が上）で表示
7. 復元失敗 → Toast でエラー通知し、空の会話として開始

#### メッセージ送信フロー（SearchBar）
1. SearchBar にテキスト入力 → Enter キー押下
2. `isLoadingRef` で同期的に二重送信チェック（送信中なら即 return）
3. `isLoadingRef` をロックし、入力テキストを取得、SearchBar を空にする
4. ユーザーメッセージを `messages` に追加 → `isLoading = true`
5. 初回送信時（既存メッセージ 0 件）: スレッドタイトルを先頭30文字で自動生成し保存
6. `trimMessagesForContext()` でトークン上限チェック（超過時は古いメッセージを切り捨て + Toast 通知）
7. OpenAI Responses API にトリミング済み会話履歴を送信（ストリーミング）
8. ストリーミングで応答を受信し逐次表示 → 完了後 assistant メッセージを `messages` に追加、スレッドの `updatedAt` を更新
9. LocalStorage に会話全体 + スレッド一覧を保存（保存失敗時は Toast で通知、state は維持）
10. エラー発生時 → `classifyError()` でエラー種別を判定し、Toast で適切なメッセージを表示
11. finally で `isLoadingRef` と `isLoading` を解除

#### メッセージ送信フロー（複数行入力）
1. ActionPanel から `Multiline Input`（Cmd+L）を選択
2. `Action.Push` で `MultiLineForm` を表示（Form.TextArea による複数行入力）
3. テキスト入力後 Submit → `pop()` でメインビューに戻る
4. 以降は SearchBar 送信フローの手順 3 以降と同じ

#### 会話クリアフロー
1. ActionPanel から `Clear Conversation`（Cmd+Shift+Backspace）を選択
2. `confirmAlert` で確認ダイアログを表示（「会話をクリアしますか?」、Destructive スタイル）
3. ユーザーが「クリア」を選択 → `clearMessages()` で LocalStorage 削除 + state リセット
4. 成功 Toast（`Toast.Style.Success`、「会話をクリアしました」）を表示
5. ユーザーがキャンセル → 何もせず終了

#### メッセージコピー操作
1. List 上で任意のメッセージを選択した状態で Cmd+Shift+C を押下
2. `Action.CopyToClipboard` により、選択中メッセージの `content` がクリップボードにコピーされる

#### スレッド作成フロー
1. ActionPanel から `New Conversation`（Cmd+N）を選択
2. `createThread()` が呼び出され、新しい Thread オブジェクトを生成（UUID v4、タイトル「新しい会話」）
3. スレッド一覧の先頭に追加し、`currentThreadId` を新スレッドに切替
4. メッセージを空にリセットし、LocalStorage にスレッド一覧と currentThreadId を保存

#### スレッド一覧・切替フロー
1. ActionPanel から `Conversation List`（Cmd+T）を選択
2. `Action.Push` で `ThreadList` コンポーネントに遷移
3. 全スレッドを List 表示（現在のスレッドは CheckCircle + Green、その他は Circle アイコン）
4. accessories にスレッドの更新日時（formatDateTime 形式）を表示
5. スレッドを選択（Enter）→ `switchThread()` で切替 + `pop()` でメインビューに戻る
6. 切替時: `isLoading = true` → `loadMessages()` でスレッドのメッセージを復元 → `isLoading = false`

#### スレッド削除フロー
1. `ThreadList` 上で対象スレッドを選択し、`Delete Conversation`（Ctrl+X）を選択
2. `confirmAlert` で確認ダイアログを表示（「スレッドを削除しますか?」、Destructive スタイル）
3. ユーザーが「削除」を選択 → `deleteThread()` を実行
   - メッセージを LocalStorage から削除
   - 全スレッドが削除された場合: 新規スレッドを自動作成し切替
   - 現在のスレッドが削除された場合: 残りの先頭スレッドに自動切替 + メッセージ復元
   - 別のスレッドが削除された場合: 現在のスレッドを維持
4. 成功 Toast（`Toast.Style.Success`、「スレッドを削除しました」）を表示
5. ユーザーがキャンセル → 何もせず終了

#### 履歴上限管理フロー
1. `sendMessage()` 内で API 呼び出し前に `trimMessagesForContext()` を実行
2. モデルごとのコンテキスト上限（MODEL_CONTEXT_LIMITS）から応答バッファ（4096トークン）を差し引いた上限値を算出
3. `estimateTokens()` でメッセージ配列の合計トークン数を簡易推定（文字数 / 2）
4. 上限以内 → 全メッセージをそのまま送信
5. 上限超過 → system メッセージと最新ユーザーメッセージを必ず保持し、古い非 system メッセージを新しい順に上限内で追加
6. トリミングが発生した場合 → Toast（`Toast.Style.Animated`、「古いメッセージを一部省略して送信しました」）を表示

#### システムプロンプト注入フロー
1. メッセージ送信時、現在の Thread に `customCommandId` があるか確認
2. `customCommandId` がある場合:
   - 該当する CustomCommand を LocalStorage から取得
   - 取得できた場合: CustomCommand の `systemPrompt` を使用
   - 取得できない場合（削除済み）: Preferences の `systemPrompt` にフォールバック
3. `customCommandId` がない場合: Preferences の `systemPrompt` を使用
4. システムプロンプト（trim 後）が空でなければ、`role: "system"` のメッセージとして会話履歴の先頭に追加
5. システムプロンプトを含めた配列を `trimMessagesForContext()` に渡す（トークン上限計算にシステムプロンプト分を含める）
6. 注入は送信時のみ。LocalStorage の会話履歴にはシステムプロンプトを保存しない

#### モデル優先順位
1. CustomCommand にモデルが指定されている場合: CustomCommand.model を使用
2. CustomCommand にモデルが未指定、またはカスタムコマンド未使用の場合: Preferences.model を使用

#### カスタムコマンド作成フロー
1. 「Create AI Command」コマンドを起動
2. Form に以下を入力:
   - Name（テキスト、必須）: コマンド名
   - System Prompt（テキストエリア、必須）: システムプロンプト
   - Model（ドロップダウン、任意）: 使用モデル（未指定時は Preferences のモデルを使用）
   - Icon（ドロップダウン、任意）: アイコン
3. Submit → `addCustomCommand()` で LocalStorage に保存
4. 成功 Toast を表示し、pop() で画面を閉じる

#### カスタムコマンド一覧フロー
1. 「AI Commands」コマンドを起動
2. List で全カスタムコマンドを一覧表示
3. ActionPanel から以下の操作が可能:
   - Start Conversation: 選択したカスタムコマンドで新規会話を開始（ask-ai を開き、Thread に customCommandId を紐づけ）
   - Edit Command: 編集フォームへ遷移し、内容を更新
   - Delete Command（Ctrl+X）: confirmAlert → 削除 → 成功 Toast

#### カスタムコマンド切替フロー（チャット画面内）
1. チャット画面の SearchBar 横に `List.Dropdown`（searchBarAccessory）が表示される
2. 選択肢: 「デフォルト」 + ユーザー作成の各カスタムコマンド
3. ドロップダウンで別のコマンドを選択 → 現在の Thread の `customCommandId` を更新
4. 次回以降の送信から、選択したカスタムコマンドのシステムプロンプトとモデルが適用される

#### 表示仕様
- メッセージは**逆順表示**（最新メッセージが List の先頭に表示される）
- 会話が 1 件以上存在する場合のみ `isShowingDetail = true` で Detail パネルを表示
- 会話が 0 件の場合は `List.EmptyView` で案内メッセージを表示
- `filtering = false` に設定し、SearchBar の入力をフィルタリングではなくメッセージ送信用途に使用
- 各 List.Item には `roleLabel`（User / AI / System）と `truncate` で短縮した本文、`formatTime` で HH:MM 形式の時刻を表示


## 5. インターフェース

### OpenAI API 呼び出し

| 項目 | 値 |
|------|-----|
| API | OpenAI Responses API（`client.responses.create`） |
| モデル | `gpt-4.1-nano`（初期設定） |
| ストリーミング | 対応（`stream: true`） |
| 認証 | Preferences API で取得した API キーを OpenAI クライアントに設定 |
| 送信内容 | system メッセージを `instructions` に分離し、残りを `input` パラメータに渡す（トークン上限超過時は `trimMessagesForContext()` で古いメッセージを切り捨て） |

### データモデル

全 Message は所属する Thread の threadId を保持し、スレッド単位で管理される。

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
| id | string | スレッド固有ID（UUID v4、またはデフォルトスレッドの場合 `"default"`） |
| title | string | スレッド名（初期値「新しい会話」、初回メッセージ送信時に先頭30文字で自動生成） |
| createdAt | string | 作成日時（ISO 8601） |
| updatedAt | string | 最終更新日時（ISO 8601、メッセージ送受信のたびに更新） |
| customCommandId? | string | 紐づくカスタムコマンドのID（任意。未設定時はデフォルトシステムプロンプトを使用） |

#### CustomCommand

| フィールド | 型 | 説明 |
|----------|------|------|
| id | string | コマンド固有ID（UUID v4） |
| name | string | コマンド名（表示名） |
| systemPrompt | string | このコマンドで使用するシステムプロンプト |
| model? | string | 使用するモデル（任意。未指定時は Preferences.model を使用） |
| icon? | string | Raycast Icon 名（任意。未指定時はデフォルトアイコン） |

### LocalStorage キー設計

| キー | 値の型 | 説明 |
|------|--------|------|
| `ask-ai:messages:{threadId}` | JSON string（Message[]） | スレッドごとのメッセージ配列 |
| `ask-ai:threads` | JSON string（Thread[]） | スレッド一覧 |
| `ask-ai:current-thread` | string | 現在選択中のスレッドID |
| `ask-ai:custom-commands` | JSON string（CustomCommand[]） | カスタムコマンド一覧 |

初回起動時はデフォルトスレッド（ID: `"default"`）が自動作成される。

### Preferences 設定

package.json の `preferences` セクションで宣言する。

| name | type | title | 説明 | required |
|------|------|-------|------|----------|
| apiKey | password | OpenAI API Key | OpenAI の API キー | true |
| model | dropdown | Model | 使用する GPT モデル（初期値: gpt-4.1-nano） | false |
| systemPrompt | textfield | System Prompt | デフォルトのシステムプロンプト。全会話で送信時に先頭注入される（任意。空欄時は注入なし） | false |


## 6. 制約

### 非機能要件

| ID | カテゴリ | 要件 |
|----|----------|------|
| NFR-001 | セキュリティ | API キーは Preferences API（password 型）で保管し、ログ出力・平文表示を禁止する |
| NFR-002 | セキュリティ | LocalStorage はRaycast によりローカル暗号化 DB で管理される |
| NFR-003 | パフォーマンス | API 応答待ち中は isLoading 表示で体感的な待機感を緩和する |
| NFR-004 | 信頼性 | API エラー時は種別（401/429/タイムアウト/ネットワーク断）を分類し、ユーザーに適切なメッセージを表示する |
| NFR-005 | データ整合性 | 送信成功後に LocalStorage へ保存し、データ欠損を防ぐ |

### コーディング規約

- Raycast 拡張機能の公式ガイドラインに準拠
- TypeScript strict モード有効
- 関数・変数名は camelCase、型名は PascalCase
- API キーを含む秘匿情報はログに出力しない

### スコープ外

- マルチモーダル入力（画像・ファイル添付）
- Raycast Store への公開・配布
- OpenAI 以外の LLM プロバイダー対応
