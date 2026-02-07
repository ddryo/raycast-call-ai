# Project New Task - タスク追加

既存プロジェクトに新機能またはバグフィックスを追加するためのワークフロー。
仕様書・ロードマップを更新し、新タスクを追加します。

## 引数

- `$ARGUMENTS`: 追加したい機能またはバグの説明（任意）

## 前提条件

- `/project-planning` または `/project-autopilot` が完了していること
- 以下のドキュメントが存在すること:
  - `.docs/spec.md`
  - `.docs/roadmap.md`

## 実行手順

TodoWrite ツールで以下のフェーズを管理:

- [ ] Phase 0: 方向性の確認
- [ ] Phase 1: ドキュメント更新
- [ ] Phase 2: Codex レビュー

### Phase 0: 方向性の確認

**1. ドキュメント確認**:

```bash
Read .docs/spec.md
Read .docs/roadmap.md
```

**2. 要望のヒアリング**:

1. `$ARGUMENTS` が明確な場合 → そのまま使用
2. `$ARGUMENTS` が不明確な場合 → AskUserQuestion で詳細を確認
3. `$ARGUMENTS` が空の場合 → `TODO.md` を読み込むか、ユーザーに確認

**タスクタイプの判断**:
- 新機能追加（feature）: 新しい機能やエンハンスメント
- バグフィックス（bugfix）: 既存機能の不具合修正

バグフィックスの場合、以下も確認:
- 症状（期待動作 vs 実際の動作）
- 再現手順
- 深刻度（Critical / High / Medium / Low）

**3. 重要ポイントの整理**:

要望を分析し、重要ポイントを整理:

```markdown
## 重要ポイント（案）

### タスクタイプ: [feature / bugfix]

1. [ポイント]
2. [ポイント]
...

### 影響範囲
- 影響を受けるモジュール: [モジュール名]
- 関連要件: [FR-XXX など]
```

**4. Codex と相談**:

重要ポイントが整理できたら、codex を呼び出して相談:

```bash
codex exec --sandbox read-only '
## プロジェクト概要
{既存プロジェクトの概要を簡潔に記載}

## 追加タスク
{ユーザーの要望を記載}

## 重要ポイント（案）
{整理した重要ポイントを記載}

上記の重要ポイントについて、不足している観点や考慮すべき点があれば教えてください。
'
```

> **Note**: `codex exec` の引数にはシングルクォートで囲んだプロンプトを渡します。

**5. ユーザーに最終確認**:

Codex の返答を踏まえて改めて考え、重要ポイントをユーザーに見せて確認。
ユーザーの確認が取れたら、次のフェーズへ進む。

### Phase 1: ドキュメント更新

Task ツールで サブエージェント `document-editor` を呼び出し、以下のプロンプトを実行させてください。

**Phase 0 の文脈を明示的に渡し、spec → roadmap → task を一括で更新します。**

```
## ドキュメントの更新

### 追加の指示・要望・バグ報告
{Phase 0 で確認したユーザからの指示・要望・バグ報告を要約して記載する}

### 重要ポイント
{Phase 0 で確認した重要ポイントを記載}

### 背景・補足
{Phase 0 での議論で得られた追加の文脈があれば記載}

---

以下を順に実行してください:
1. /docs-spec action=update
2. /docs-roadmap action=update
3. /docs-task action=update
```

サブエージェントの作業完了後、以下が更新されていることを確認:
- `.docs/spec.md`
- `.docs/roadmap.md`
- `.docs/tasks/*.md`


### Phase 2: Codex レビュー

全ドキュメントの更新が完了したら、最後にまとめてレビューを実行:

```
/codex-review
```

レビューで指摘があれば修正し、`ok: true` になるまで反復する。


## 成果報告

```
## タスク追加完了

### 更新されたドキュメント
- `.docs/spec.md`
- `.docs/roadmap.md`
- `.docs/tasks/`

### 追加されたタスク
[追加したタスクのリストを記載する]

### 次のステップ
/project-autopilot --start=T-M{X}-{N}
```

## 使用例

```bash
# 機能追加
/project-new-task ダークモード対応を追加したい

# バグフィックス
/project-new-task ログイン時に500エラーが発生する

# 対話形式
/project-new-task
```
