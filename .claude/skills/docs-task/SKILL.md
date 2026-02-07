---
name: docs-task
description: タスク詳細ドキュメント（.docs/tasks/*.md）の作成・更新・再構成を行う
tools: Read, Write, Edit, Glob, Grep, AskUserQuestion, TodoWrite, Bash
user-invocable: true
---

# docs-task - タスク詳細ドキュメント管理

ロードマップに記載された各タスクの詳細を個別ファイルとして管理する。

## パラメータの受け取り方

```
/docs-task action={操作} [タスクID or ユーザーからの指示・追加情報]
```

### {action}: 操作内容

| action | 操作内容 |
|--------|------|
| create | 新規作成（roadmap.md の全タスクを生成） |
| update | 更新・追加（既存タスクの編集 + roadmap.md との同期で新規タスクも生成） |
| restructure | 既存の内容にとらわれず、ゼロベースで再構成 |


## 実行フロー

### 1. 事前情報の確認

**前提**: `.docs/roadmap.md` が作成済みであること。必ず読み込んでから作業を開始してください。

**重要**: このスキルは `roadmap.md` を**読み取り専用**として参照し、`tasks/` 配下のファイルのみを操作します。`roadmap.md` 自体の編集は `/docs-roadmap` で行ってください。


### 2. ドキュメントの作成・編集

以下のフォーマットに従って `.docs/tasks/T-M{X}-{N}.md` を {action} します。


### 3. roadmap.md との同期確認

- タスク ID が `roadmap.md` と一致していること
- 状態（⬜/🔄/✅）が `roadmap.md` と一致していること


### 4. 一度コミットする

ドキュメントを {action} したら、git commit します。


### 5. Codex による最終レビュー

以下を実行して、完成したドキュメントを Codex にレビューさせ、修正指示があれば参考にして修正してください。

```
/codex-review --auto-commit
```


---

## フォーマット仕様

出力先: `.docs/tasks/T-M{X}-{N}.md`

### タスク ID ルール

`T-M{マイルストーン番号}-{連番}` 形式（例: T-M1-1, T-M2-3）

**重要**: roadmap.md で定義された ID と一致させること


---

## テンプレート

```markdown
# T-M{X}-{N}: {タスク名}

| 項目 | 内容 |
|------|------|
| マイルストーン | M{X} |
| 依存 | {依存タスクID / なし} |
| 要件ID | {FR-XXX / なし} |

## 説明
{このタスクで何をするかを簡潔に説明}

## 作業内容
1. {具体的な手順}
2. {具体的な手順}
3. ...


## タスクのチェックリスト
- [ ] {タスクのチェックリスト}
- [ ] {タスクのチェックリスト}
- ...
```


---

## 記入例

### tasks/T-M1-2.md

```markdown
# T-M1-2: DB スキーマ定義

| 項目 | 内容 |
|------|------|
| マイルストーン | M1 |
| 依存 | T-M1-1 |
| 要件ID | FR-001 |

## 説明
タスク管理に必要なデータモデルを Prisma スキーマで定義する。

## 作業内容
1. Task モデルを定義（id, title, status, assignee, dueDate）
2. User モデルを定義（id, name, email）
3. マイグレーション実行

## タスクのチェックリスト
- [ ] prisma migrate dev が成功する
- [ ] prisma studio でテーブルが確認できる
```


---

## よくある間違い

| NG | OK | 理由 |
|----|-----|------|
| タスクIDを独自採番 | ROADMAP の ID を使用 | 同期が取れなくなる |
| roadmap.md を編集 | /docs-roadmap を使用 | このスキルは tasks/ のみ操作 |
| 完了タスクを削除 | 完了タスクは保持 | 履歴として重要。状態✅で完了を示す |
