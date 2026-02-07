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
| FR-010 | スレッド管理 | 複数の会話スレッドを作成・切替・削除する | Should | - |
| FR-011 | スレッド一覧 | 保存済みスレッドをリスト表示し、選択して会話を再開する | Should | - |
| FR-012 | 履歴上限管理 | トークン超過時に古いメッセージを切り捨てて送信する | Could | - |

**優先度**: Must（必須）/ Should（推奨）/ Could（任意）

### フェーズ分割

| フェーズ | スコープ | 対応要件 |
|----------|----------|----------|
| Phase 1 | 単一会話での送受信・表示・保存 | FR-001 ~ FR-009 |
| Phase 2 | 複数会話スレッド管理 | FR-010 ~ FR-012 |


## 3. 技術スタック

| カテゴリ | 技術 | 選定理由 |
|----------|------|----------|
| 言語 | TypeScript | Raycast 拡張機能の標準開発言語 |
| UI フレームワーク | @raycast/api | Raycast 拡張機能の公式 API |
| AI API | OpenAI Chat Completions API | 安定した API、gpt-4o-mini で低コスト運用 |
| API クライアント | openai（Node.js SDK） | 公式 SDK で型安全かつ保守性が高い |
| 永続化 | Raycast LocalStorage | 拡張機能内でローカル暗号化 DB に保存。追加依存なし |
| 設定管理 | Raycast Preferences API | APIキーを password 型で安全に保管。manifest で宣言的に定義 |


## 4. アーキテクチャ

### ディレクトリ構成

```
ask-ai/
├── src/
│   ├── ask-ai.tsx          # メインコマンド（List + Detail UI）
│   ├── services/
│   │   └── openai.ts       # OpenAI API 通信層
│   ├── storage/
│   │   └── conversation.ts # LocalStorage による永続化層
│   ├── hooks/
│   │   └── useConversation.ts # 会話状態管理カスタムフック
│   └── types/
│       └── index.ts        # 型定義（Message, Thread）
├── package.json
└── tsconfig.json
```

### コンポーネント構成

```
ask-ai.tsx（メインコマンド）
  ├── AskAI()                   … デフォルトエクスポート。List + Detail UI
  │     ├── SearchBar 入力 → handleSend() でメッセージ送信
  │     ├── List.EmptyView      … 会話がない初期状態の案内表示
  │     └── ActionPanel
  │           ├── Action "Send Message"      … Enter で送信
  │           └── Action.Push "Multiline Input" (Cmd+L)
  │                 └── MultiLineForm        … 複数行入力フォーム
  ├── MultiLineForm({ onSend }) … Form.TextArea + SubmitForm アクション
  │     └── 送信後 pop() でメインビューに戻る
  ├── ヘルパー関数
  │     ├── truncate()           … メッセージ短縮表示（60文字上限）
  │     ├── roleLabel()          … role → 表示名変換（User / AI / System）
  │     └── formatTime()         … ISO 8601 → HH:MM 形式
  │
  ├── useConversation（カスタムフック）
  │     ├── state: messages (Message[]), isLoading (boolean)
  │     ├── sendMessage(content): ユーザーメッセージ追加 → API呼び出し → assistant応答追加 → 保存
  │     ├── clearMessages(): ストレージ削除 + state リセット
  │     └── 起動時復元: loadMessages() で LocalStorage から復元（失敗時 Toast 通知）
  │
  ├── openai.ts（API通信層）
  │     ├── createChatCompletion(): 全履歴を送信し応答を取得
  │     └── classifyError(): エラー分類（auth/rate_limit/timeout/network/unknown）
  │
  └── conversation.ts（永続化層）
        ├── saveMessages(): LocalStorage に保存
        ├── loadMessages(): LocalStorage から復元
        ├── clearMessages(): LocalStorage から削除
        └── DEFAULT_THREAD_ID: Phase 1 用の固定スレッドID定数
```

### UI フロー

#### 起動フロー
1. コマンド起動 → `useConversation` が `isLoading = true` で初期化
2. `loadMessages(DEFAULT_THREAD_ID)` で LocalStorage から会話履歴を復元
3. 復元成功 → `messages` に反映、`isLoading = false` → List に逆順（最新が上）で表示
4. 復元失敗 → Toast でエラー通知し、空の会話として開始

#### メッセージ送信フロー（SearchBar）
1. SearchBar にテキスト入力 → Enter キー押下
2. 入力テキストを取得し、SearchBar を空にする
3. ユーザーメッセージを `messages` に追加 → `isLoading = true`
4. OpenAI API に全会話履歴を送信（非ストリーミング）
5. 応答を受信 → assistant メッセージを `messages` に追加 → `isLoading = false`
6. LocalStorage に会話全体を保存（保存失敗時は Toast で通知、state は維持）

#### メッセージ送信フロー（複数行入力）
1. ActionPanel から `Multiline Input`（Cmd+L）を選択
2. `Action.Push` で `MultiLineForm` を表示（Form.TextArea による複数行入力）
3. テキスト入力後 Submit → `pop()` でメインビューに戻る
4. 以降は SearchBar 送信フローの手順 3 以降と同じ

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
| エンドポイント | `POST /v1/chat/completions` |
| モデル | `gpt-4o-mini`（初期設定） |
| ストリーミング | 非対応（`stream: false`） |
| 認証 | Preferences API で取得した API キーを Authorization ヘッダに設定 |
| 送信内容 | 会話の全 Message 配列を `messages` パラメータに渡す |

### データモデル

Phase 2（スレッド管理）を前提に、初期段階から threadId を含む設計とする。

#### Message

| フィールド | 型 | 説明 |
|----------|------|------|
| id | string | メッセージ固有ID（UUID v4） |
| threadId | string | 所属するスレッドのID |
| role | "user" \| "assistant" \| "system" | メッセージの送信者種別 |
| content | string | メッセージ本文 |
| createdAt | string | 作成日時（ISO 8601） |

#### Thread（Phase 2 で使用）

| フィールド | 型 | 説明 |
|----------|------|------|
| id | string | スレッド固有ID（UUID v4） |
| title | string | スレッド名（先頭メッセージから自動生成、または手動設定） |
| createdAt | string | 作成日時（ISO 8601） |
| updatedAt | string | 最終更新日時（ISO 8601） |

### LocalStorage キー設計

| キー | 値の型 | 説明 |
|------|--------|------|
| `ask-ai:messages:{threadId}` | JSON string（Message[]） | スレッドごとのメッセージ配列 |
| `ask-ai:threads` | JSON string（Thread[]） | スレッド一覧（Phase 2） |
| `ask-ai:current-thread` | string | 現在選択中のスレッドID（Phase 2） |

Phase 1 では固定のデフォルト threadId（`"default"`）を使用する。

### Preferences 設定

package.json の `preferences` セクションで宣言する。

| name | type | title | 説明 | required |
|------|------|-------|------|----------|
| apiKey | password | OpenAI API Key | OpenAI の API キー | true |
| model | dropdown | Model | 使用する GPT モデル（初期値: gpt-4o-mini） | false |


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

- ストリーミングレスポンス対応
- マルチモーダル入力（画像・ファイル添付）
- Raycast Store への公開・配布
- OpenAI 以外の LLM プロバイダー対応
- システムプロンプトのカスタマイズ UI（初期は固定値）
