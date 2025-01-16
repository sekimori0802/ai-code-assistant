const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createChatRoom,
  getChatRooms,
  addMember,
  sendMessage,
  getMessages,
  getRoom,
  getLLMModels
} = require('../controllers/chatRoom');

// トークルーム関連のエンドポイント
// 一般的なルートを先に配置
router.get('/llm-models', authenticateToken, getLLMModels);
router.post('/', authenticateToken, createChatRoom);
router.get('/', authenticateToken, getChatRooms);
router.post('/message', authenticateToken, sendMessage);

// 特定のルームIDを含むルートを後に配置
router.get('/:roomId', authenticateToken, getRoom);
router.post('/:roomId/join', authenticateToken, addMember);
router.get('/:roomId/messages', authenticateToken, getMessages);

module.exports = router;
