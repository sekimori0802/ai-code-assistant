const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createChatRoom,
  getChatRooms,
  addMember,
  sendMessage,
  getMessages
} = require('../controllers/chatRoom');

// トークルーム関連のエンドポイント
router.post('/', auth, createChatRoom);           // トークルームの作成
router.get('/', auth, getChatRooms);              // トークルーム一覧の取得
router.post('/member', auth, addMember);          // メンバーの追加
router.post('/message', auth, sendMessage);       // メッセージの送信
router.get('/:roomId/messages', auth, getMessages); // メッセージ一覧の取得

module.exports = router;
