how to use

- リポジトリをクローン（またはzipダウンロード）

- npm run dev を実行（一回やればokかな？ npm run build でもいいかも？ここはまだ曖昧なのでClaude調べて）

- Raycast で 「Call AI」 が使えるようになっていることを確認

## プロンプトと使用モデルの設定を行う

「Manage Preset」コマンドから、使用したいAIプロバイダー/モデルとプロンプトのプリセットを登録でできる。

manage-preset.png

初期では「デフォルト」の一つのみ用意されています。

### デフォルトプロンプトの設定

初期状態では次のようになっているはず。

default-preset.png

自由に設定してください。

#### API キーの設定

Open AI API を使用する場合は、Raycastの拡張機能の設定画面から **OpenAI API Key** を入力しておく必要がある。

extension-setting.png

「Call AI」 拡張機能は、コマンド画面左下のとこから遷移できます。
configure-extension.png

#### CLI を使う場合

Codex CLI や Claude Code CLI を使用する場合は、自身のPCでインストールしておく必要がある。
かつ、Claude Codeの場合は `claude setup-token` を実行しておく必要がある。

CLIを使用する時の注意点:

- CLIを使う時、~/.claude/CLAUDE.md とかは読み込まれるのでシステムプロンプトの設定を追加する時は重複しないように注意してください。
- web検索できるかどうかは .claude/settings.json とかの設定によります。Codexはデフォで有効化されているはずだが、claude codeはパーミッションで許可しとかないと動きません。

## 会話を始める

New Chat コマンドで、新規チャットを開始できます。（「デフォルト」プリセットになります）

new-chat.png

## プリセットの呼び出し

設定したプリセットは、Use Presetから呼び出すか、New Chat などのチャット画面の右上のドロップダウンでプリセットを選択して会話が可能。

↓Use Presetコマンドから開けるプリセット一覧画面
use-preset.png

↓チャット画面
select-preset-dropdown.png

もしくは、Use Presetコマンドに引数を指定して直接呼び出すこともできます
use-preset-by-args.png

### プリセットをカスタムコマンドのように独立させて使用する方法

クイックリンクで登録して呼び出せるようにしています。（ただし、初回呼び出しで確認ダイアログがでてくる）

Use Preset → 一覧画面（またはプリセット編集画面）にて、create quicklinkアクションを用意しています。

create-quicklink.png

アクションを選択すると次のようになるので、Save してください。

create-quicklink-form.png

保存できたら、Raycastから呼び出せるようになっています。

call-quicklink.png

Quicklinkからコマンドを呼び出すと、次のようなダイアログが表示されますが、許可すればOK。always arrowすれば、それ以降出てこなくなります。

quicklink-dialog.png

**注意**:

- プリセット削除してもクイックリンクは残るので、その点は注意が必要。
- また、プリセットタイトルを編集した時もクイックリンクの編集、または作り直しが必要です。
