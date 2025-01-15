const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const chatRoomRoutes = require('./routes/chatRoom');
const db = require('./config/database');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ミドルウェアの設定
// CORSの設定
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// ルートの設定
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat-rooms', chatRoomRoutes);

// ルートエンドポイントの追加
app.get('/', (req, res) => {
  res.send('サーバーは正常に動作しています');
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('サーバーエラー:', err);
  res.status(500).json({
    status: 'error',
    message: '内部サーバーエラーが発生しました'
  });
});

// データベースの初期化
async function initializeDatabase() {
  try {
    // データベースの状態を確認
    await db.logState();

    // デフォルトルームの作成を確認
    const defaultRoom = await db.getAsync(
      'SELECT * FROM chat_rooms WHERE id = ?',
      ['00000000-0000-0000-0000-000000000000']
    );

    if (!defaultRoom) {
      await db.runAsync(`
        INSERT INTO chat_rooms (id, name, created_by, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, ['00000000-0000-0000-0000-000000000000', 'General', 'system']);
      console.log('デフォルトルームを作成しました');
    }

    console.log('データベースの初期化が完了しました');
  } catch (error) {
    console.error('データベースの初期化に失敗:', error);
    throw error;
  }
}

// サーバーの起動
app.listen(port, async () => {
  console.log(`サーバーがポート${port}で起動しました`);
  console.log('環境:', process.env.NODE_ENV || 'development');

  try {
    await initializeDatabase();
  } catch (error) {
    console.error('サーバーの初期化に失敗:', error);
  }
});
