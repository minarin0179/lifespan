# My Plugin

OpenClaw プラグインの開発リポジトリです。

## 開発環境のセットアップ

VS Code の Dev Containers 拡張機能を使って開発します。

1. このリポジトリを VS Code で開く
2. 「Reopen in Container」を実行
3. コンテナ起動後、ターミナルでゲートウェイを起動する（下記参照）

## ゲートウェイの起動

コンテナ内で毎回手動で起動します。ログがそのまま表示されるので開発中のデバッグに便利です。

```bash
openclaw gateway
```

起動後、別ターミナルで以下を実行してダッシュボードの URL（トークン付き）を確認できます。

```bash
openclaw dashboard
```

表示された URL をブラウザで開いてください。VS Code がポート 18789 を自動転送するので `http://localhost:18789/` でアクセスできます。

## プラグインの開発サイクル

コードを変更したら以下の手順で反映します。

1. `Ctrl+C` でゲートウェイを停止
2. プラグインを再インストール

```bash
openclaw plugins install /home/lifespan --force
```

3. ゲートウェイを再起動

```bash
openclaw gateway
```

## その他のコマンド

```bash
# 型チェック
npm run check

# 型チェックをウォッチモードで実行
npm run dev

# ゲートウェイの死活確認
curl http://localhost:18789/healthz
```
