const express = require('express');
const router = express.Router();
const { sendMessage, getChatHistory, deleteChatHistory } = require('../controllers/chat');
const { authenticateToken } = require('../middleware/auth');

// すべてのチャットルートで認証を必要とする
router.use(authenticateToken);

// チャットメッセージの送信
router.post('/send', async (req, res) => {
  console.log('メッセージ送信リクエスト:', {
    user: req.user,
    body: req.body
  });
  await sendMessage(req, res);
});

// チャット履歴の取得
router.get('/history', async (req, res) => {
  console.log('チャット履歴取得リクエスト:', {
    user: req.user
  });
  await getChatHistory(req, res);
});

// チャット履歴の削除
router.delete('/history/:id', async (req, res) => {
  console.log('チャット履歴削除リクエスト:', {
    user: req.user,
    messageId: req.params.id
  });
  await deleteChatHistory(req, res);
});

module.exports = router;
