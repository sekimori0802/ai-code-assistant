const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  sendMessage, 
  getChatHistory, 
  deleteChatHistory
} = require('../controllers/chat');
const {
  createChatRoom,
  getChatRooms,
  getMessages,
  addMember,
  sendMessage: chatRoomSendMessage,
  deleteChatRoom
} = require('../controllers/chatRoom');

// 関数名のエイリアス
const createRoom = createChatRoom;
const getRooms = getChatRooms;
const getRoom = getMessages;
const updateRoom = addMember;
const deleteRoom = deleteChatRoom;

// すべてのチャットルートで認証を必要とする
router.use(authenticateToken);

// チャットルーム関連のエンドポイント
router.post('/rooms', async (req, res) => {
  console.log('チャットルーム作成リクエスト:', {
    user: req.user,
    body: req.body
  });
  await createRoom(req, res);
});

router.get('/rooms', async (req, res) => {
  console.log('チャットルーム一覧取得リクエスト:', {
    user: req.user
  });
  await getRooms(req, res);
});

router.get('/rooms/:roomId', async (req, res) => {
  console.log('チャットルーム取得リクエスト:', {
    user: req.user,
    roomId: req.params.roomId
  });
  await getRoom(req, res);
});

router.put('/rooms/:roomId', async (req, res) => {
  console.log('チャットルーム更新リクエスト:', {
    user: req.user,
    roomId: req.params.roomId,
    body: req.body
  });
  await updateRoom(req, res);
});

router.delete('/rooms/:roomId', async (req, res) => {
  console.log('チャットルーム削除リクエスト:', {
    user: req.user,
    roomId: req.params.roomId
  });
  await deleteRoom(req, res);
});

// チャットメッセージ関連のエンドポイント
router.post('/send', async (req, res) => {
  console.log('メッセージ送信リクエスト:', {
    user: req.user,
    body: req.body
  });
  await sendMessage(req, res);
});

router.get('/send', async (req, res) => {
  console.log('メッセージ送信リクエスト (SSE):', {
    user: req.user,
    query: req.query
  });
  await sendMessage(req, res);
});

router.get('/history', async (req, res) => {
  console.log('チャット履歴取得リクエスト:', {
    user: req.user,
    query: req.query
  });
  await getChatHistory(req, res);
});

router.delete('/history/:id', async (req, res) => {
  console.log('チャット履歴削除リクエスト:', {
    user: req.user,
    messageId: req.params.id,
    query: req.query
  });
  await deleteChatHistory(req, res);
});

module.exports = router;
