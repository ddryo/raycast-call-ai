# Project Init - プロジェクト初期化

プロジェクトの初期環境をセットアップします。

## 実行手順

### Phase 1: 環境・設定確認

以下の環境をチェックし、結果をユーザーに報告してください。

1. gh CLI の確認

```bash
gh --version
gh auth status
```

- インストールされていない場合: `brew install gh` を案内
- 認証されていない場合: `gh auth login` を案内

2. codex CLI の確認

```bash
which codex
codex --version
```

- インストールされていない場合: `npm install -g @openai/codex` を案内

3. Codex レビュースキルの確認

- `.claude/skills/codex-review/SKILL.md` が存在するか確認

**環境チェック結果の報告**:

```
## 環境チェック結果

| 項目 | 状態 |
|------|------|
| gh CLI | ✅ / ❌ |
| gh 認証 | ✅ / ❌ |
| codex CLI | ✅ / ❌ |
| Codex レビュースキル | ✅ / ❌ |
```

問題がある場合は、解決方法を案内し、解決後に続行するか確認してください。

### Phase 2: 必要なディレクトリ・ファイルの作成

```bash
mkdir -p .docs
mkdir -p .review
```

#### implement.json のセットアップ

`.docs/implement.json` を作成し、作業用のベースブランチを記録する。

```bash
git branch --show-current 2>/dev/null || echo "main"
```

取得したブランチ名で `.docs/implement.json` を作成:

```json
{
  "base_branch": "{取得したブランチ名}"
}
```

- 既に `.docs/implement.json` が存在する場合はスキップ

#### CLAUDE.md のセットアップ

`CLAUDE.template.md` の内容を使用してセットアップする。

1. テンプレートと既存ファイルの確認

```bash
test -f CLAUDE.template.md && echo "template exists" || echo "template not found"
test -f CLAUDE.md && echo "CLAUDE.md exists" || echo "CLAUDE.md not found"
```

2. セットアップ処理

- **CLAUDE.template.md が存在しない場合**: エラーとして中断し、テンプレートの作成を案内
- **CLAUDE.md が存在しない場合**: `CLAUDE.template.md` の内容をコピーして `CLAUDE.md` を新規作成
- **CLAUDE.md が既に存在する場合**: `CLAUDE.template.md` の内容を `CLAUDE.md` の末尾に追記（既存内容は保持、区切り線 `---` を挿入）

**CLAUDE.md セットアップ結果の報告**:

```
## CLAUDE.md セットアップ

- 状態: 新規作成 / 既存に追記 / スキップ（テンプレートなし）
```

### Phase 3: Git 初期化 & GitHub セットアップ

以下の手順に従うこと。

0. 既存リポジトリの確認

```bash
# Git 初期化済みかチェック
git rev-parse --is-inside-work-tree 2>/dev/null

# リモートリポジトリが設定されているかチェック
git remote -v
```

- Git 未初期化 → 通常通り Phase 3 を全て実行
- Git 初期化済み & リモート未設定 → 手順 2 をスキップし、手順 5 から実行
- Git 初期化済み & リモート設定済み → 手順 2, 5 をスキップ（既存プロジェクトへの適用）

**既存リポジトリ検出時の報告**:

```
## 既存リポジトリを検出

- リモート: [origin URL]
- ブランチ: [現在のブランチ]

GitHub リポジトリの作成はスキップし、既存のリポジトリを使用します。
```

1. README.md のセットアップ

- まだ README.md がない場合は新規作成する。 プロジェクトテンプレートの README.md が存在する場合は内容を削除。
- README.md にはこの段階では何も書き進めずに、要件定義後に詳しく書くことを簡潔に案内する内容にとどめる。

2. Git の初期化

まだ未初期化の場合のみ、以下を実行。

```bash
git init
```

3. `.gitignore` の確認・作成

必要に応じて `.gitignore` を作成または更新:

```
node_modules
dist
.review
.env
.DS_Store
*.log
```

4. 初期コミット

```bash
git add -A
git commit -m "Initial commit: Project setup"
```

5. GitHub リポジトリの作成

```bash
# 現在のディレクトリ名をリポジトリ名として使用
gh repo create $(basename $(pwd)) --private --source=. --push
```

- リポジトリ名の確認をユーザーに行う
- public/private の選択を確認

### Phase を全て完了後

**成果報告**:

```
## プロジェクト初期化完了

- リポジトリ: [GitHub URL]
- ブランチ: main

### 次のステップ

プロジェクトの計画を開始するには:
/project-planning [要望を入力]
```
