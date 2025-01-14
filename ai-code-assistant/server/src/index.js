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
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ルートの設定
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat-rooms', chatRoomRoutes);

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('サーバーエラー:', err);
  res.status(500).json({
    status: 'error',
    message: '内部サーバーエラーが発生しました'
  });
});

// サーバーの起動
app.listen(port, async () => {
  console.log(`サーバーがポート${port}で起動しました`);
  console.log('環境:', process.env.NODE_ENV || 'development');

  try {
    // データベースの状態を確認
    await db.logState();
  } catch (error) {
    console.error('データベース状態の確認に失敗:', error);
  }
});
