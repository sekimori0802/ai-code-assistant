const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createChatRoom,
  getChatRooms,
  addMember,
  sendMessage,
  getMessages,
  getRoom
} = require('../controllers/chatRoom');

// トークルーム関連のエンドポイント
// 特定のルームIDを含むルートを先に配置
router.get('/:roomId', authenticateToken, getRoom);
router.post('/:roomId/join', authenticateToken, addMember);
router.get('/:roomId/messages', authenticateToken, getMessages);

// 一般的なルートを後に配置
router.post('/', authenticateToken, createChatRoom);
router.get('/', authenticateToken, getChatRooms);
router.post('/message', authenticateToken, sendMessage);

module.exports = router;
