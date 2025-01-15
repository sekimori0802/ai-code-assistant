const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// AIチャットルームの作成
async function createChatRoom(req, res) {
  const { name, aiType } = req.body;
  const userId = req.user.id;

  console.log('AIチャットルーム作成リクエスト:', {
    name,
    aiType,
    userId,
    user: req.user
  });

  try {
    await db.beginTransactionAsync();

    // AIチャットルームの作成
    const roomId = uuidv4();
    await db.runAsync(
      'INSERT INTO chat_rooms (id, name, created_by, ai_type) VALUES (?, ?, ?, ?)',
      [roomId, name, userId, aiType || 'code_generation']
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
        ai_type: room.ai_type,
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
}

// トークルーム一覧の取得
async function getChatRooms(req, res) {
  const userId = req.user.id;

  console.log('トークルーム一覧取得リクエスト:', {
    userId,
    user: req.user
  });

  try {
    // ユーザーのAIチャットルーム一覧を取得
    console.log('トークルーム検索クエリ実行:', { userId, roomId: req.query.roomId });

    console.log('トークルーム検索開始:', { roomId: req.query.roomId, userId });

    const rooms = await db.allAsync(`
      SELECT r.*, COUNT(m.user_id) as member_count,
             (SELECT message 
              FROM chat_room_messages 
              WHERE room_id = r.id 
              ORDER BY created_at DESC 
              LIMIT 1) as last_message
      FROM chat_rooms r
      LEFT JOIN chat_room_members m ON r.id = m.room_id
      WHERE EXISTS (
        SELECT 1 
        FROM chat_room_members 
        WHERE room_id = r.id 
        AND user_id = ?
      )
      GROUP BY r.id
      ORDER BY r.updated_at DESC
    `, [userId]);

    console.log('トークルーム検索結果:', rooms);

    res.json({
      status: 'success',
      data: {
        rooms: rooms.map(room => ({
          id: room.id,
          name: room.name,
          created_by: room.created_by,
          ai_type: room.ai_type,
          member_count: room.member_count,
          last_message: room.last_message,
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
}

// トークルームへのメンバー追加
async function addMember(req, res) {
  const { roomId } = req.params;
  const userId = req.user.id;

  console.log('メンバー追加リクエスト:', {
    roomId,
    userId,
    user: req.user
  });

  try {
    await db.beginTransactionAsync();

    // ルームが存在するか確認
    const room = await db.getAsync(
      'SELECT * FROM chat_rooms WHERE id = ?',
      [roomId]
    );

    if (!room) {
      await db.rollbackAsync();
      return res.status(404).json({
        status: 'error',
        message: '指定されたルームが見つかりません'
      });
    }

    // 既にメンバーでないことを確認
    const existingMember = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
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
      [roomId, userId]
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
}

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

    // ルームのメンバーシップを確認
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

    // トークルームのメンバー数を取得
    const memberCount = await db.getAsync(
      'SELECT COUNT(user_id) as count FROM chat_room_members WHERE room_id = ?',
      [roomId]
    );

    // AIモデルを呼び出す条件を確認
    const shouldCallAI = memberCount.count === 1 || message.includes('@AI');

    if (shouldCallAI) {
      console.log('AIモデルを呼び出します');
      // AIモデル呼び出しロジックをここに追加
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
}

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
    // トークルームが存在するか確認
    const room = await db.getAsync(
      'SELECT * FROM chat_rooms WHERE id = ?',
      [roomId]
    );

    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: '指定されたトークルームが見つかりません'
      });
    }

    // ユーザーがトークルームのメンバーであるか確認
    let membership = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    // 未参加の場合は自動的に参加させる
    if (!membership) {
      await db.runAsync(
        'INSERT INTO chat_room_members (room_id, user_id, joined_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [roomId, userId]
      );
      membership = { room_id: roomId, user_id: userId }; // 仮のメンバーシップデータ
    }

    // メッセージ一覧を取得
    const messages = await db.allAsync(`
      SELECT 
        m.*,
        CASE 
          WHEN m.user_id = 'system' THEN 'System'
          ELSE COALESCE(u.email, 'Unknown')
        END as user_email
      FROM chat_room_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC
    `, [roomId]);

    // 新規ルームの場合、初期メッセージを追加
    if (messages.length === 0) {
      const room = await db.getAsync('SELECT ai_type FROM chat_rooms WHERE id = ?', [roomId]);
      let welcomeMessage = 'AIアシスタントが会話の準備ができました。ご質問やご要望をお気軽にどうぞ！';
      
      switch (room.ai_type) {
        case 'blog_writing':
          welcomeMessage = 'ブログ記事作成アシスタントです。記事のテーマや構成についてご相談ください。';
          break;
        case 'english_conversation':
          welcomeMessage = 'English conversation assistant here. Let\'s practice English together!';
          break;
        case 'video_editing':
          welcomeMessage = '動画編集アシスタントです。編集のコツやテクニックについてアドバイスいたします。';
          break;
        case 'pc_productivity':
          welcomeMessage = 'PC作業の効率化アシスタントです。時短テクニックやツールの活用法をご案内します。';
          break;
        default:
          welcomeMessage = 'コード生成アシスタントです。プログラミングについてご質問ください。';
      }

      const welcomeMessageId = uuidv4();
      await db.runAsync(
        'INSERT INTO chat_room_messages (id, room_id, user_id, message) VALUES (?, ?, ?, ?)',
        [welcomeMessageId, roomId, 'system', welcomeMessage]
      );

      messages.push({
        id: welcomeMessageId,
        room_id: roomId,
        user_id: 'system',
        user_email: 'System',
        message: welcomeMessage,
        created_at: new Date().toISOString()
      });
    }

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
}

// チャットルームの削除
async function deleteChatRoom(req, res) {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    await db.beginTransactionAsync();

    // ユーザーがルームのメンバーであることを確認
    const membership = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (!membership) {
      await db.rollbackAsync();
      return res.status(403).json({
        status: 'error',
        message: 'チャットルームのメンバーではありません'
      });
    }

    // チャットルームのメッセージを削除
    await db.runAsync(
      'DELETE FROM chat_room_messages WHERE room_id = ?',
      [roomId]
    );

    // チャットルームのメンバーを削除
    await db.runAsync(
      'DELETE FROM chat_room_members WHERE room_id = ?',
      [roomId]
    );

    // チャットルームを削除
    await db.runAsync(
      'DELETE FROM chat_rooms WHERE id = ?',
      [roomId]
    );

    await db.commitAsync();

    res.json({
      status: 'success',
      message: 'チャットルームを削除しました'
    });
  } catch (error) {
    await db.rollbackAsync();
    console.error('チャットルーム削除エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'チャットルームの削除に失敗しました'
    });
  }
}

// 特定のチャットルームの取得
async function getRoom(req, res) {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    // チャットルームの情報を取得
    const room = await db.getAsync(`
      SELECT r.*, COUNT(m.user_id) as member_count,
             (SELECT message 
              FROM chat_room_messages 
              WHERE room_id = r.id 
              ORDER BY created_at DESC 
              LIMIT 1) as last_message
      FROM chat_rooms r
      LEFT JOIN chat_room_members m ON r.id = m.room_id
      WHERE r.id = ?
      GROUP BY r.id
    `, [roomId]);

    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: '指定されたルームが見つかりません'
      });
    }

    res.json({
      status: 'success',
      data: {
        id: room.id,
        name: room.name,
        created_by: room.created_by,
        ai_type: room.ai_type,
        member_count: room.member_count,
        last_message: room.last_message,
        created_at: room.created_at,
        updated_at: room.updated_at
      }
    });
  } catch (error) {
    console.error('チャットルーム取得エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'チャットルームの取得に失敗しました'
    });
  }
}

module.exports = {
  createChatRoom,
  getChatRooms,
  addMember,
  sendMessage,
  getMessages,
  deleteChatRoom,
  getRoom
};
