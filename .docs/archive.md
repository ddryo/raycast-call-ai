# タスクアーカイブ

完了したタスクの履歴。

## M1: プロジェクト初期セットアップ（2026-02-08 アーカイブ）

### T-M1-1: Raycast 拡張機能プロジェクトの初期化と基本設定

| 項目 | 内容 |
|------|------|
| マイルストーン | M1 |
| 依存 | なし |
| 要件ID | なし |

Raycast 拡張機能プロジェクトをゼロから作成。package.json で Preferences（API キー、モデル選択）を定義し、ディレクトリ構成を確立。`ray create-extension` でプロジェクト作成、commands/preferences セクション定義、openai パッケージ追加、src/ 配下のディレクトリ構成（services/, storage/, hooks/, types/）を作成。

### T-M1-2: 型定義の作成

| 項目 | 内容 |
|------|------|
| マイルストーン | M1 |
| 依存 | T-M1-1 |
| 要件ID | なし |

`src/types/index.ts` に Message 型（id, threadId, role, content, createdAt）、Thread 型（id, title, createdAt, updatedAt）、MessageRole 型、ApiErrorType / ApiError 型、Preferences 型を定義。Phase 2（スレッド管理）を見据えた設計。

### T-M1-3: OpenAI API 通信層の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M1 |
| 依存 | T-M1-1 |
| 要件ID | なし |

`src/services/openai.ts` に OpenAI Chat Completions API 通信モジュールを実装。createChatCompletion() 関数、エラー分類関数（401→auth, 429→rate_limit, タイムアウト→timeout, ネットワーク断→network）を実装。stream: false で呼び出し。

### T-M1-4: LocalStorage 永続化層の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M1 |
| 依存 | T-M1-1 |
| 要件ID | なし |

`src/storage/conversation.ts` に LocalStorage 永続化モジュールを実装。saveMessages(), loadMessages(), clearMessages() 関数。キー設計: `ask-ai:messages:{threadId}`。Phase 1 ではデフォルト threadId として "default" を使用。

---

## M2: コア機能実装（単一会話チャット）（2026-02-08 アーカイブ）

### T-M2-1: useConversation カスタムフックの実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M2 |
| 依存 | T-M1-2, T-M1-3, T-M1-4 |
| 要件ID | FR-001, FR-002, FR-003 |

`src/hooks/useConversation.ts` に会話の状態管理を一元化するカスタムフックを実装。messages / isLoading の state 管理、マウント時 loadMessages() で復元、sendMessage() でユーザーメッセージ追加→API呼び出し→応答追加→永続化のフロー。React の非同期 state 更新を考慮したローカル変数パターンを採用。

### T-M2-2: メインコマンド UI の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M2 |
| 依存 | T-M2-1 |
| 要件ID | FR-001, FR-002 |

`src/ask-ai.tsx` に List + List.Item.Detail パターンでチャット UI を構築。SearchBar で質問入力→Enter で送信、会話を List に逆順表示、Detail に markdown でメッセージ表示。filtering={false} で組み込みフィルタリングを無効化。

### T-M2-3: 会話の永続化統合

| 項目 | 内容 |
|------|------|
| マイルストーン | M2 |
| 依存 | T-M2-2 |
| 要件ID | FR-004 |

useConversation フックの永続化ロジックとメインコマンド UI の統合。起動時復元フロー（isLoading 制御）、送信後の自動保存、会話が空の場合の EmptyView 表示を実装。

### T-M2-4: 複数行入力フォームの実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M2 |
| 依存 | T-M2-2 |
| 要件ID | FR-005 |

ActionPanel に「複数行で入力」アクションを追加。Action.Push で Form 画面に遷移し、Form.TextArea で複数行テキスト入力。空テキスト送信防止のバリデーション付き。

---

## M3: UX 強化・仕上げ（2026-02-08 アーカイブ）

### T-M3-1: エラーハンドリングの実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M3 |
| 依存 | T-M2-2 |
| 要件ID | FR-006 |

useConversation 内の sendMessage() にエラーハンドリングを追加。エラー種別ごとの日本語 Toast メッセージ（auth→APIキー無効、rate_limit→レート制限、timeout→タイムアウト、network→ネットワーク断、unknown→汎用エラー）。showToast() で Style.Failure 表示。

### T-M3-2: 二重送信防止の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M3 |
| 依存 | T-M2-2 |
| 要件ID | FR-007 |

sendMessage() 冒頭で isLoading チェックを追加し、API 応答待ち中の再送信を防止。List の isLoading プロパティによるローディングバー表示。ActionPanel の送信関連アクションを isLoading 中に無効化。

### T-M3-3: 会話クリア機能の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M3 |
| 依存 | T-M2-3 |
| 要件ID | FR-008 |

ActionPanel に「会話をクリア」アクションを追加。confirmAlert() で確認ダイアログ後、messages を空配列にリセットし clearMessages() で LocalStorage からも削除。

### T-M3-4: メッセージコピー機能の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M3 |
| 依存 | T-M2-2 |
| 要件ID | FR-009 |

各 List.Item の ActionPanel に Action.CopyToClipboard で「内容をコピー」アクションを追加。キーボードショートカット付き。

---

## M4: 複数スレッド管理（2026-02-08 アーカイブ）

### T-M4-1: スレッド作成・切替機能の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M4 |
| 依存 | T-M3-3 |
| 要件ID | FR-010 |

useConversation に Thread 管理用 state（threads, currentThreadId）を追加。起動時の初期化処理（loadThreads, loadCurrentThreadId, フォールバックロジック）、スレッド作成関数（UUID v4）、スレッド切替関数、スレッドタイトル自動生成（最初のユーザーメッセージの先頭部分）を実装。

### T-M4-2: スレッド一覧表示の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M4 |
| 依存 | T-M4-1 |
| 要件ID | FR-011 |

ActionPanel → Push で List 表示するスレッド一覧 UI を実装。title（スレッドタイトル）、subtitle（最終メッセージプレビュー）、accessories（更新日時）。スレッド選択で会話復元。

### T-M4-3: スレッド削除機能の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M4 |
| 依存 | T-M4-1 |
| 要件ID | FR-010 |

スレッド一覧の ActionPanel に削除アクション。confirmAlert() で確認後、threads からの除去、LocalStorage からのメッセージ削除、threads 一覧更新。現在表示中スレッド削除時の自動切替、全スレッド削除時の新規自動作成。

### T-M4-4: 履歴上限管理の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M4 |
| 依存 | T-M4-1 |
| 要件ID | FR-012 |

トークン数の簡易推定関数（英語: 約4文字=1トークン、日本語: 約1.5文字=1トークン）を実装。createChatCompletion() 呼び出し前にトークン数チェック。上限超過時に古いメッセージから切り捨て（system メッセージ保持、最新ユーザーメッセージ保持）。切り捨て発生時に Toast 通知。

---

## M5: システムプロンプト & カスタムコマンド（2026-02-08 アーカイブ）

### T-M5-1: 型定義の拡張とカスタムコマンド永続化層の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M5 |
| 依存 | - |
| 要件ID | FR-013, FR-017 |

`src/types/index.ts` に CustomCommand 型（id, name, systemPrompt, model?, icon?）を追加。Thread 型に customCommandId? を追加。Preferences 型に systemPrompt? を追加。`src/storage/custom-commands.ts` に CRUD 関数（saveCustomCommands, loadCustomCommands, addCustomCommand, updateCustomCommand, deleteCustomCommand, getCustomCommand）を実装。

### T-M5-2: デフォルトシステムプロンプト（Preferences）の実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M5 |
| 依存 | T-M5-1 |
| 要件ID | FR-013 |

package.json の preferences に systemPrompt（textfield, 任意）を追加。useConversation の sendMessage() で送信前に Preferences から systemPrompt を取得し、role: "system" として API 送信時のみ一時注入。LocalStorage には保存しない。

### T-M5-3: カスタムコマンド作成コマンドの実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M5 |
| 依存 | T-M5-1 |
| 要件ID | FR-014 |

`src/create-ai-command.tsx` に Raycast コマンド「Create AI Command」を実装。Form UI で Name（必須）、System Prompt（必須）、Model（任意）、Icon（任意）を入力。UUID v4 で ID 生成、addCustomCommand() で保存。

### T-M5-4: カスタムコマンド一覧管理コマンドの実装

| 項目 | 内容 |
|------|------|
| マイルストーン | M5 |
| 依存 | T-M5-3 |
| 要件ID | FR-015 |

`src/ai-commands.tsx` に Raycast コマンド「AI Commands」を実装。`src/hooks/useCustomCommands.ts` でカスタムコマンドの状態管理。一覧表示（List.Item）、編集（Action.Push で編集フォーム）、削除（confirmAlert + deleteCustomCommand）、会話開始機能。EmptyView 対応。

### T-M5-5: チャット画面へのカスタムコマンド切替統合

| 項目 | 内容 |
|------|------|
| マイルストーン | M5 |
| 依存 | T-M5-2, T-M5-3 |
| 要件ID | FR-016, FR-017, FR-018 |

ask-ai チャット画面に List.Dropdown（searchBarAccessory）でカスタムコマンド切替を追加。「デフォルト」+ 全カスタムコマンドを列挙。Thread の customCommandId で参照管理。sendMessage() でカスタムコマンドのシステムプロンプトとモデルを優先適用。削除済みコマンドは Preferences デフォルトにフォールバック。既存 Thread データとの後方互換性を維持。
