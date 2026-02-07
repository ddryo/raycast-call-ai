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
  ├── useConversation（カスタムフック）
  │     ├── state: Message[] の管理
  │     ├── sendMessage(): API呼び出し + state更新
  │     └── storage: 永続化層への保存・復元
  ├── openai.ts（API通信層）
  │     ├── createChatCompletion(): 全履歴を送信し応答を取得
  │     └── エラー分類（401/429/タイムアウト/ネットワーク断）
  └── conversation.ts（永続化層）
        ├── saveConversation(): LocalStorage に保存
        └── loadConversation(): LocalStorage から復元
```

### UI フロー

1. コマンド起動 → LocalStorage から会話履歴を復元 → List に表示
2. SearchBar にテキスト入力 → Enter（または ActionPanel の複数行入力 Form から送信）
3. ユーザーメッセージを List に追加 → isLoading = true → SearchBar を空にする
4. OpenAI API に全会話履歴を送信（非ストリーミング）
5. 応答を受信 → assistant メッセージを List に追加 → isLoading = false
6. LocalStorage に会話全体を保存
7. 選択中の List.Item の Detail（markdown）に内容を表示


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
