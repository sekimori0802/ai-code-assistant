const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// トークルームの作成
async function createChatRoom(req, res) {
  const { name } = req.body;
  const userId = req.user.id;

  console.log('トークルーム作成リクエスト:', {
    name,
    userId,
    user: req.user
  });

  try {
    await db.beginTransactionAsync();

    // トークルームの作成
    const roomId = uuidv4();
    await db.runAsync(
      'INSERT INTO chat_rooms (id, name, created_by) VALUES (?, ?, ?)',
      [roomId, name, userId]
    );

    // 作成者をメンバーとして追加
    await db.runAsync(
      'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
      [roomId, userId]
    );

    await db.commitAsync();

    // 作成したトークルームの情報を取得
    const room = await db.getAsync(
      'SELECT * FROM chat_rooms WHERE id = ?',
      [roomId]
    );

    res.json({
      status: 'success',
      data: {
        id: room.id,
        name: room.name,
        created_by: room.created_by,
        created_at: room.created_at
      }
    });
  } catch (error) {
    await db.rollbackAsync();
    console.error('トークルームの作成エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'トークルームの作成に失敗しました'
    });
  }
};

// トークルーム一覧の取得
async function getChatRooms(req, res) {
  const userId = req.user.id;

  console.log('トークルーム一覧取得リクエスト:', {
    userId,
    user: req.user
  });

  try {
    // ユーザーが参加しているトークルーム一覧を取得
    const rooms = await db.allAsync(`
      SELECT r.*, COUNT(m.user_id) as member_count
      FROM chat_rooms r
      JOIN chat_room_members m ON r.id = m.room_id
      WHERE r.id IN (
        SELECT room_id 
        FROM chat_room_members 
        WHERE user_id = ?
      )
      GROUP BY r.id
      ORDER BY r.updated_at DESC
    `, [userId]);

    res.json({
      status: 'success',
      data: {
        rooms: rooms.map(room => ({
          id: room.id,
          name: room.name,
          created_by: room.created_by,
          member_count: room.member_count,
          created_at: room.created_at,
          updated_at: room.updated_at
        }))
      }
    });
  } catch (error) {
    console.error('トークルーム一覧の取得エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'トークルーム一覧の取得に失敗しました'
    });
  }
};

// トークルームへのメンバー追加
async function addMember(req, res) {
  const { roomId, userId: newMemberId } = req.body;
  const requesterId = req.user.id;

  console.log('メンバー追加リクエスト:', {
    roomId,
    newMemberId,
    requesterId,
    user: req.user
  });

  try {
    await db.beginTransactionAsync();

    // リクエスト送信者がトークルームのメンバーであることを確認
    const requesterMembership = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, requesterId]
    );

    if (!requesterMembership) {
      await db.rollbackAsync();
      return res.status(403).json({
        status: 'error',
        message: 'トークルームのメンバーではありません'
      });
    }

    // 追加するユーザーが既にメンバーでないことを確認
    const existingMember = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, newMemberId]
    );

    if (existingMember) {
      await db.rollbackAsync();
      return res.status(400).json({
        status: 'error',
        message: '既にメンバーとして追加されています'
      });
    }

    // メンバーとして追加
    await db.runAsync(
      'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
      [roomId, newMemberId]
    );

    await db.commitAsync();

    res.json({
      status: 'success',
      message: 'メンバーを追加しました'
    });
  } catch (error) {
    await db.rollbackAsync();
    console.error('メンバー追加エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'メンバーの追加に失敗しました'
    });
  }
};

// トークルーム内のメッセージ送信
async function sendMessage(req, res) {
  const { roomId, message } = req.body;
  const userId = req.user.id;

  console.log('メッセージ送信リクエスト:', {
    roomId,
    userId,
    message,
    user: req.user
  });

  try {
    await db.beginTransactionAsync();

    // ユーザーがトークルームのメンバーであることを確認
    const membership = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (!membership) {
      await db.rollbackAsync();
      return res.status(403).json({
        status: 'error',
        message: 'トークルームのメンバーではありません'
      });
    }

    // メッセージを保存
    const messageId = uuidv4();
    await db.runAsync(
      'INSERT INTO chat_room_messages (id, room_id, user_id, message) VALUES (?, ?, ?, ?)',
      [messageId, roomId, userId, message]
    );

    // トークルームの更新日時を更新
    await db.runAsync(
      'UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [roomId]
    );

    await db.commitAsync();

    // 保存したメッセージを取得
    const savedMessage = await db.getAsync(
      'SELECT * FROM chat_room_messages WHERE id = ?',
      [messageId]
    );

    res.json({
      status: 'success',
      data: {
        id: savedMessage.id,
        room_id: savedMessage.room_id,
        user_id: savedMessage.user_id,
        message: savedMessage.message,
        created_at: savedMessage.created_at
      }
    });
  } catch (error) {
    await db.rollbackAsync();
    console.error('メッセージの送信エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'メッセージの送信に失敗しました'
    });
  }
};

// トークルーム内のメッセージ一覧取得
async function getMessages(req, res) {
  const { roomId } = req.params;
  const userId = req.user.id;

  console.log('メッセージ一覧取得リクエスト:', {
    roomId,
    userId,
    user: req.user
  });

  try {
    // ユーザーがトークルームのメンバーであることを確認
    const membership = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (!membership) {
      return res.status(403).json({
        status: 'error',
        message: 'トークルームのメンバーではありません'
      });
    }

    // メッセージ一覧を取得
    const messages = await db.allAsync(`
      SELECT m.*, u.email as user_email
      FROM chat_room_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at DESC
    `, [roomId]);

    res.json({
      status: 'success',
      data: {
        messages: messages.map(message => ({
          id: message.id,
          room_id: message.room_id,
          user_id: message.user_id,
          user_email: message.user_email,
          message: message.message,
          created_at: message.created_at
        }))
      }
    });
  } catch (error) {
    console.error('メッセージ一覧の取得エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'メッセージ一覧の取得に失敗しました'
    });
  }
};

module.exports = {
  createChatRoom,
  getChatRooms,
  addMember,
  sendMessage,
  getMessages
};
