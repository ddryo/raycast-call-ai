---
description: 完了タスクを縮小し、archive.md に集約する
allowed-tools: Read, Write, Edit, Glob, Bash
---

# Task Archive - 完了タスクのアーカイブ

完了タスク（✅）を縮小し、詳細を `.docs/archive.md` に集約する。

## 用途

- プロジェクト完了後、履歴をコンパクトにまとめたい場合
- 完了タスクの詳細ファイルを整理したい場合

## 手順

### 1. 完了タスクの抽出

1. `.docs/roadmap.md` を読み込む
2. 完了タスク（✅）を抽出
3. 対応する `.docs/tasks/*.md` の内容を取得

### 2. archive.md への追記

`.docs/archive.md` に完了タスクの詳細を追記（ファイルが存在しない場合は新規作成）。

### archive.md テンプレート

```markdown
# タスクアーカイブ

完了したタスクの履歴。

## M1: MVP（YYYY-MM-DD 完了）

- T-M1-1: プロジェクト初期化
- T-M1-2: Linter・Formatter設定

## M2: コア機能拡張（YYYY-MM-DD 完了）

- T-M2-1: REST APIエンドポイント実装
- T-M2-2: データベース連携
```

### 3. roadmap.md の縮小

完了タスクを1行要約形式に書き換え。

### 縮小後の roadmap.md 形式

```markdown
# 実装ロードマップ

## 完了済み

- M1: MVP（3タスク）- YYYY-MM-DD
- M2: コア機能拡張（5タスク）- YYYY-MM-DD

## 進行中

### M3: 拡張機能

- 🔄 T-M3-1: 新機能A
- ⬜ T-M3-2: 新機能B

## 状態の凡例
| 記号 | 意味 |
|------|------|
| ⬜ | 未着手 |
| 🔄 | 進行中 |
| ✅ | 完了 |
```

### 4. タスクファイルの削除

アーカイブ済みの `.docs/tasks/*.md` を削除。

## 注意事項

- 未完了タスク（⬜, 🔄）は縮小対象外。roadmap.md にそのまま残る
- archive.md が既に存在する場合は末尾に追記
- アーカイブ後も git 履歴から元の tasks/*.md は参照可能
- アーカイブ前に確認プロンプトを表示

## 完了時の報告

```markdown
## アーカイブ完了

### アーカイブしたタスク
- T-M1-1: プロジェクト初期化
- T-M1-2: 基本設定
- T-M2-1: API実装

### 削除したファイル
- .docs/tasks/T-M1-1.md
- .docs/tasks/T-M1-2.md
- .docs/tasks/T-M2-1.md

### 更新したファイル
- .docs/roadmap.md（縮小版に更新）
- .docs/archive.md（詳細を追記）
```
