# AI Code Assistant

## 環境構築

### 必要な環境
- Node.js (v14以上)
- npm (v6以上)
- PostgreSQL

### セットアップ手順

1. リポジトリのクローン
```bash
git clone [リポジトリURL]
cd ai-code-assistant
```

2. 環境変数の設定
```bash
# server/.envファイルを作成
cp server/.env.example server/.env
# 必要な環境変数を設定
```

3. パッケージのインストール
```bash
# ルートディレクトリで実行
npm install        # ルートの依存パッケージをインストール
npm run setup     # クライアントとサーバーの依存パッケージを一括インストール
```

4. データベースのセットアップ
```bash
# .envファイルにデータベース設定を記載
# SQLiteを使用するため、特別なセットアップは不要です
```

## アプリケーションの起動

アプリケーションは以下のコマンド1つで起動できます：

```bash
# ルートディレクトリで実行
npm run dev
```

このコマンドは、フロントエンドとバックエンドを同時に起動します。

## アクセス方法

- フロントエンド: http://localhost:3001
- バックエンドAPI: http://localhost:5000

## 開発者向け情報

### 主要な技術スタック
- フロントエンド: React.js, TailwindCSS
- バックエンド: Node.js, Express
- データベース: PostgreSQL
- 認証: JWT

### ディレクトリ構造
```
ai-code-assistant/
├── client/             # フロントエンドのソースコード
│   ├── src/
│   │   ├── components/ # Reactコンポーネント
│   │   ├── contexts/   # Reactコンテキスト
│   │   └── services/   # APIサービス
│   └── public/         # 静的ファイル
└── server/             # バックエンドのソースコード
    ├── src/
    │   ├── config/     # 設定ファイル
    │   ├── controllers/# コントローラー
    │   ├── middleware/ # ミドルウェア
    │   └── routes/     # ルート定義
    └── tests/          # テストファイル
