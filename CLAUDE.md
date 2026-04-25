# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 開発環境

devcontainer を使用。`ghcr.io/openclaw/openclaw:latest` を直接利用し、Dockerfile は存在しない。

- コンテナ内ワークスペース: `/home/lifespan`
- OpenClaw 設定・データ: `/root/.openclaw`
- コンテナユーザー: `root`

## コマンド

```bash
# 型チェック
npm run check

# ビルド (dist/ に出力)
npm run build

# 型チェックをウォッチモードで実行
npm run dev

# OpenClaw 起動ログを確認
tail -f /tmp/openclaw.log

# プラグインの変更を反映 (コード変更後)
openclaw plugins install /home/lifespan --force && pkill -f "openclaw gateway run" && nohup openclaw gateway run > /tmp/openclaw.log 2>&1 & disown

# OpenClaw の死活確認
curl http://localhost:18789/healthz
```

## プラグインの構造

OpenClaw プラグインは 3 つのファイルが必須:

| ファイル | 役割 |
|---|---|
| `openclaw.plugin.json` | プラグイン ID・名前・設定スキーマ |
| `package.json` の `openclaw.extensions` | エントリポイントのパス指定 |
| `index.ts` | `definePluginEntry` でエクスポートするエントリポイント |

## プラグイン種別とインポートパス

種別によって SDK のサブパスが異なる。モノリシックルートからのインポートは禁止。

| 種別 | インポートパス |
|---|---|
| Tool / Hook | `openclaw/plugin-sdk/plugin-entry` |
| Channel | `openclaw/plugin-sdk/channel` |
| Provider (LLM 等) | `openclaw/plugin-sdk/provider` |

## ツール登録の注意

- `required` ツール: 常に利用可能
- `optional` ツール: ユーザーが明示的に許可する必要がある。`openclaw.json` の `tools.allow` にツール名を追加

## devcontainer のライフサイクル

- **初回作成時** (`postCreateCommand`): `npm install` → `openclaw config set gateway.mode local` → `openclaw plugins install /home/lifespan` でプラグイン登録
- **起動のたびに** (`postStartCommand`): `nohup openclaw gateway run` がバックグラウンドで起動（systemd 非対応のため）
- プラグインコードを変更しても自動リロードはない。上記「プラグインの変更を反映」コマンドで手動反映
- `openclaw gateway restart` は systemd 前提のため使用不可
