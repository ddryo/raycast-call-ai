---
name: implement
description: ロードマップに記載されたタスクを実装する
tools: Read, Write, Edit, Bash, Glob, Grep, TodoWrite
user-invocable: true
---

ロードマップに記載されたタスク番号 (T-M{X}-{N}) が指定されて実装を行う場合、サブエージェントを呼び出して実装を行う。

## サブエージェントで実装

Task ツールで `task-implementer-opus` を呼び出し、以下のようにタスク ID を渡して実装を依頼します。

```
T-M{X}-{N} を実装してください。
```
