const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createChatRoom,
  getChatRooms,
  addMember,
  sendMessage,
  getMessages
} = require('../controllers/chatRoom');

// トークルーム関連のエンドポイント
router.post('/', authenticateToken, createChatRoom);
router.get('/', authenticateToken, getChatRooms);
router.post('/:roomId/join', authenticateToken, addMember);
router.post('/message', authenticateToken, sendMessage);
router.get('/:roomId/messages', authenticateToken, getMessages);

module.exports = router;
