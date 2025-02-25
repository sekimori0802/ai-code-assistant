# AI Code Assistant

AIを活用したアシスタントアプリケーション。複数のAIプロバイダー（OpenAI, Google, Anthropic）に対応し、効率的な業務をサポートします。

## 機能

- 複数のAIモデルに対応（OpenAI, Google, Anthropic）
- 複数のAIタイプに対応（プログラミング,ブログ記事,英会話,動画編集）
- チャットルームごとに異なるAIモデル、AIタイプの設定が可能
- 複数人でのチャットが可能
- ユーザー認証とセッション管理
- チャット履歴の保存と管理
- レスポンシブなUIデザイン

## 環境構築

### 必要な環境
- Node.js (v14以上)
- npm (v6以上)

### セットアップ手順

1. リポジトリのクローン
```bash
git clone https://github.com/sekimori0802/ai-code-assistant.git
cd ai-code-assistant
```

2. 環境変数の設定
```bash
# サーバー側の環境変数設定
cp server/.env.example server/.env

# クライアント側の環境変数設定
cp client/.env.example client/.env
```

必要な環境変数：

**サーバー側 (.env)**
- PORT: サーバーポート（デフォルト: 5000）
- NODE_ENV: 環境設定（development/production）
- DB_PATH: SQLiteデータベースのパス
- JWT_SECRET: JWT認証用の秘密鍵
- OPENAI_API_KEY: OpenAI APIキー
- GOOGLE_API_KEY: Google APIキー
- ANTHROPIC_API_KEY: Anthropic APIキー

**クライアント側 (.env)**
- REACT_APP_API_URL: バックエンドAPIのURL
- REACT_APP_DEFAULT_EMAIL: デフォルトユーザーのメールアドレス
- REACT_APP_DEFAULT_PASSWORD: デフォルトユーザーのパスワード

3. パッケージのインストール
```bash
# ルートディレクトリで実行
npm install
npm run setup     # クライアントとサーバーの依存パッケージを一括インストール
```

## アプリケーションの起動

```bash
# ルートディレクトリで実行
npm run dev
```

このコマンドで、フロントエンドとバックエンドが同時に起動します。

## アクセス方法

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:5000

## 技術スタック

### フロントエンド
- React.js
- TailwindCSS
- Axios（APIクライアント）
- React Context（状態管理）

### バックエンド
- Node.js
- Express
- SQLite（データベース）
- JWT（認証）
- 各種AI API（OpenAI, Google, Anthropic）

## ディレクトリ構造
```
ai-code-assistant/
├── client/                 # フロントエンドのソースコード
│   ├── src/
│   │   ├── components/    # Reactコンポーネント
│   │   │   ├── auth/     # 認証関連コンポーネント
│   │   │   ├── chat/     # チャット関連コンポーネント
│   │   │   └── layout/   # レイアウトコンポーネント
│   │   ├── contexts/     # Reactコンテキスト
│   │   └── services/     # APIサービス
│   └── public/           # 静的ファイル
└── server/               # バックエンドのソースコード
    ├── src/
    │   ├── config/      # 設定ファイル
    │   ├── controllers/ # コントローラー
    │   ├── middleware/  # ミドルウェア
    │   ├── migrations/  # データベースマイグレーション
    │   └── routes/      # ルート定義
    └── data/           # SQLiteデータベースファイル
```

## ライセンス

MIT License
