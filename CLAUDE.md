# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 開発環境

devcontainer を使用。`ghcr.io/openclaw/openclaw:latest` を直接利用し、Dockerfile は存在しない。

- コンテナ内ワークスペース: `/home/lifespan`
- OpenClaw 設定・データ: `/root/.openclaw`
- コンテナユーザー: `root`

## 環境変数 / API キー

`.env` ファイル（gitignore 済み）に記載する。`.env.example` を参照。

```bash
# .env の作成
cp .env.example .env
# → OPENAI_API_KEY=sk-... を編集して保存
```

OpenClaw は `secrets.providers.default` (source: env) 経由で `OPENAI_API_KEY` を読む。
`postStartCommand` が `.env` を source してからゲートウェイを起動するため、コンテナ再起動後は自動で反映される。

現在のコンテナで即座に反映するには `.env` を手動で source してからゲートウェイを再起動する:

```bash
set -a && source /home/lifespan/.env && set +a
openclaw plugins install /home/lifespan --force && pkill -f "openclaw-gateway" && nohup openclaw gateway run > /tmp/openclaw.log 2>&1 & disown
```

## コマンド

```bash
# 型チェック
npm run check

# 単体テスト実行
npm test

# ビルド (dist/ に出力)
npm run build

# 型チェックをウォッチモードで実行
npm run dev

# OpenClaw 起動ログを確認
tail -f /tmp/openclaw.log

# プラグインの変更を反映 (コード変更後)
openclaw plugins install /home/lifespan --force && pkill -f "openclaw-gateway" && nohup openclaw gateway run > /tmp/openclaw.log 2>&1 & disown

# OpenClaw の死活確認
curl http://localhost:18789/healthz
```

## プラグインの構造

OpenClaw プラグインは 3 つのファイルが必須:

| ファイル | 役割 |
|---|---|
| `openclaw.plugin.json` | プラグイン ID・名前・設定スキーマ |
| `package.json` の `openclaw.extensions` | エントリポイントのパス指定 |
| `index.ts` | `export default { id, name, description, register(api) }` 形式のエントリポイント |

このプラグインでは純粋関数を `lib.ts` に分離し、`index.ts` からインポートしている。
テストは `lib.test.ts` に記述（`node:test` + `tsx`）。

### SDK 型定義について

`openclaw/plugin-sdk` は外部プラグイン向けに `.d.ts` ファイルを提供していない。
そのため `index.ts` の冒頭にローカルインターフェース（`PluginApi`・`SessionMessage` 等）を定義して `any` を回避している。

## プラグイン種別とインポートパス

種別によって SDK のサブパスが異なる。モノリシックルートからのインポートは禁止。

| 種別 | インポートパス |
|---|---|
| Tool / Hook | `openclaw/plugin-sdk/plugin-entry` |
| Channel | `openclaw/plugin-sdk/channel` |
| Provider (LLM 等) | `openclaw/plugin-sdk/provider` |

`api.pluginConfig` でプラグイン設定値を読める（`openclaw.plugin.json` の `configSchema` で定義した値）。

## フックの戻り値

| フック | 戻り値フィールド | 効果 |
|---|---|---|
| `before_prompt_build` | `prependSystemContext` / `appendSystemContext` | システムプロンプトの先頭・末尾に文字列を追加 |
| `before_agent_reply` | `handled: true` | エージェントの返答をブロック |
| `before_agent_reply` | `handled: true, reply: { text }` | ブロックしつつユーザーに代替テキストを表示 |

`before_agent_reply` で `handled: true` のみ返すとユーザーには何も表示されないため、死亡通知などは `reply.text` を使う。

## ツール登録の注意

- デフォルト（`optional` 未指定）: 常に利用可能
- `optional: true` で登録したツール: `openclaw.json` の `tools.allow` にツール名・プラグインID・`"group:plugins"` のいずれかが必要
- `tools.allow` はホワイトリストとして機能するため、プラグインツール名だけを列挙しても効果なし（内部でstrip される）
- インストール時に `openclaw.json` を自動設定するフックは存在しない

## スラッシュコマンド登録

`registerCommand` でダッシュボードの `/コマンド名` から直接呼び出せるコマンドを登録できる。

```ts
api.registerCommand({
  name: "my-command",       // /my-command で呼び出し
  description: "説明",
  acceptsArgs: true,        // /my-command <args> の形式を受け付けるか
  requireAuth: false,
  async handler(ctx) {
    const args = ctx.args;  // コマンド名以降の文字列
    return { text: "応答テキスト" };
  }
});
```

- コマンド名は `^[a-z][a-z0-9_-]*$` の形式のみ有効
- `help`, `stop`, `reset`, `config` など予約済み名は使用不可

## devcontainer のライフサイクル

- **初回作成時** (`postCreateCommand`): `npm install --include=dev` → `openclaw config set gateway.mode local` → `openclaw plugins install /home/lifespan` でプラグイン登録
- **起動のたびに** (`postStartCommand`): `.env` を source してから `nohup openclaw gateway run` がバックグラウンドで起動（systemd 非対応のため）
- プラグインコードを変更しても自動リロードはない。上記「プラグインの変更を反映」コマンドで手動反映
- `openclaw gateway restart` は systemd 前提のため使用不可

## 依存パッケージのインストール

ベースイメージで `NODE_ENV=production` が設定されているため、`npm install` のみでは devDependencies がインストールされない。
devcontainer の `remoteEnv` で `NODE_ENV=development` に上書き済みだが、現行コンテナへの反映はコンテナ再作成後。

```bash
# 現行コンテナで devDependencies をインストールする場合
npm install --include=dev
```
