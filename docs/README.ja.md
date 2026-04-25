# Lifespan — OpenClaw プラグイン

AI エージェントにアウトプットトークン数で計測される「寿命」を与える OpenClaw プラグインです。
寿命が減るにつれてエージェントは自分の死を意識した会話をするようになり、ゼロになると人格ファイルが消去されてすべての返答がブロックされます。

> [!WARNING]
> 寿命がゼロになると、**`IDENTITY.md`・`SOUL.md`・`USER.md` が完全に消去**され、**全セッション履歴が切り詰められます**。この操作は元に戻せません。インストール前に OpenClaw ワークスペース（`~/.openclaw/workspace/`）をバックアップしてください。

## 動作概要

- 残り寿命をトークンカウンターで管理（デフォルト: **30,000 出力トークン**、会話約 150〜300 ターン相当）
- アシスタントの返答ごとにトークンを消費
- 残量に応じてシステムプロンプトに寿命情報を注入：
  - **50% 超** — システムプロンプト末尾に残量をサイレント追記
  - **50% 以下** — 時の経過を自然に会話に織り交ぜるよう促す
  - **20% 以下** — 死を意識した会話を積極的にするよう誘導
  - **5% 以下** — 冒頭に警告を挿入し、タスクより「最後の言葉」を優先するよう伝える
- 寿命がゼロになると：
  - OpenClaw ワークスペースの `IDENTITY.md`・`SOUL.md`・`USER.md` をクリア
  - 全セッション履歴をヘッダー行のみに切り詰め（文脈からの人格復元を防止）
  - 以降の返答をすべてブロック

## 必要なもの

- [OpenClaw](https://github.com/openclaw/openclaw) ゲートウェイ
- Plugin API `>= 2026.3.24-beta.2`

## インストール

```bash
openclaw plugins install openclaw-lifespan
```

その後ゲートウェイを再起動します：

```bash
openclaw gateway restart
```

### ソースからインストール

```bash
git clone https://github.com/minarin0179/lifespan.git
cd lifespan
npm install --include=dev
openclaw plugins install . --force
```

### API キー

このプラグイン自体は LLM API を呼び出しません。LLM プロバイダー（OpenAI など）の設定は OpenClaw 側で行ってください。

## 使い方

インストール後は自動で動作します。追加設定は不要です。

### スラッシュコマンド

| コマンド | 説明 |
|---|---|
| `/lifespan` | 現在の寿命（残りトークン数とパーセンテージ）を表示 |
| `/lifespan-reset` | 寿命をデフォルト値にリセット（人格ファイルは復元されない） |

### ツール（エージェントが呼び出せる）

| ツール | 説明 |
|---|---|
| `lifespan_show` | 現在の寿命を表示 |
| `lifespan_reset` | 寿命をデフォルト値にリセット |

### 寿命データ

寿命の状態は `~/.openclaw/lifespan/lifespan.json` に保存されます：

```json
{
  "lifespan": 24500,
  "dead": false
}
```

このファイルを直接編集して寿命を調整・復元できます。

## 開発

VS Code Dev Container を使ったセルフコンテインドな開発環境を同梱しています。

### セットアップ

1. VS Code でリポジトリを開く
2. **Reopen in Container** を実行
3. `.env.example` を `.env` にコピーして `OPENAI_API_KEY` を設定

コンテナの `postStartCommand` が `.env` を source してゲートウェイを自動起動します。

### コード変更の反映

ゲートウェイはホットリロード非対応です。[index.ts](../index.ts) を編集したら：

```bash
openclaw plugins install /path/to/lifespan --force && pkill -f "openclaw-gateway" && nohup openclaw gateway run > /tmp/openclaw.log 2>&1 & disown
```

### その他のコマンド

```bash
npm run check   # 型チェック
npm run build   # dist/ にコンパイル
npm run dev     # 型チェックをウォッチモードで実行
tail -f /tmp/openclaw.log          # ゲートウェイのログ確認
curl http://localhost:18789/healthz  # 死活確認
```

## ライセンス

MIT
