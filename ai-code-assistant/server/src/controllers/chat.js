const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const db = require('../config/database');

// OpenAI APIの設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// システムプロンプト
const SYSTEM_PROMPT = `あなたはAIプログラミングアシスタントです。
以下の方針に従って応答してください：

1. コードの説明や提案を行う際は、具体的な実装例を含めてください。
2. エラーの解決方法を説明する際は、原因と対策を明確に示してください。
3. ベストプラクティスや設計パターンについて説明する際は、実際のユースケースを含めてください。
4. セキュリティに関する提案を行う際は、具体的なリスクと対策を説明してください。
5. パフォーマンスの改善について説明する際は、測定可能な指標と改善方法を示してください。

応答は日本語で行い、コードブロックは\`\`\`言語名\nコード\`\`\`の形式で記述してください。`;

// チャットルームの作成
const createRoom = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  try {
    await db.beginTransactionAsync();

    // チャットルームの作成
    const roomId = uuidv4();
    await db.runAsync(
      'INSERT INTO chat_rooms (id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [roomId, name, userId]
    );

    // 作成者をメンバーとして追加
    await db.runAsync(
      'INSERT INTO chat_room_members (room_id, user_id, joined_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [roomId, userId]
    );

    await db.commitAsync();

    res.json({
      status: 'success',
      data: {
        id: roomId,
        name: name,
        created_by: userId,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    await db.rollbackAsync();
    console.error('チャットルーム作成エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'チャットルームの作成に失敗しました'
    });
  }
};

// チャットルーム一覧の取得
const getRooms = async (req, res) => {
  const userId = req.user.id;

  try {
    const rooms = await db.allAsync(`
      SELECT 
        r.*,
        COUNT(DISTINCT m.user_id) as member_count,
        (
          SELECT message 
          FROM chat_room_messages 
          WHERE room_id = r.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message
      FROM chat_rooms r
      LEFT JOIN chat_room_members m ON r.id = m.room_id
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
          last_message: room.last_message,
          created_at: room.created_at,
          updated_at: room.updated_at
        }))
      }
    });
  } catch (error) {
    console.error('チャットルーム一覧の取得エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'チャットルーム一覧の取得に失敗しました'
    });
  }
};

// 特定のチャットルームの取得
const getRoom = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    // ユーザーがルームのメンバーであることを確認
    const membership = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (!membership) {
      return res.status(403).json({
        status: 'error',
        message: 'チャットルームのメンバーではありません'
      });
    }

    const room = await db.getAsync(`
      SELECT 
        r.*,
        COUNT(DISTINCT m.user_id) as member_count,
        (
          SELECT message 
          FROM chat_room_messages 
          WHERE room_id = r.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message
      FROM chat_rooms r
      LEFT JOIN chat_room_members m ON r.id = m.room_id
      WHERE r.id = ?
      GROUP BY r.id
    `, [roomId]);

    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'チャットルームが見つかりません'
      });
    }

    res.json({
      status: 'success',
      data: {
        id: room.id,
        name: room.name,
        created_by: room.created_by,
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
};

// チャットルームの更新
const updateRoom = async (req, res) => {
  const { roomId } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  try {
    await db.beginTransactionAsync();

    // ルームの存在確認とユーザーの権限確認
    const room = await db.getAsync(
      'SELECT * FROM chat_rooms WHERE id = ? AND created_by = ?',
      [roomId, userId]
    );

    if (!room) {
      await db.rollbackAsync();
      return res.status(404).json({
        status: 'error',
        message: 'チャットルームが見つかないか、更新権限がありません'
      });
    }

    // ルーム名の更新
    await db.runAsync(
      'UPDATE chat_rooms SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, roomId]
    );

    await db.commitAsync();

    res.json({
      status: 'success',
      data: {
        id: roomId,
        name: name,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    await db.rollbackAsync();
    console.error('チャットルーム更新エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'チャットルームの更新に失敗しました'
    });
  }
};

// チャットルームの削除
const deleteRoom = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    await db.beginTransactionAsync();

    // ルームの存在確認とユーザーの権限確認
    const room = await db.getAsync(
      'SELECT * FROM chat_rooms WHERE id = ? AND created_by = ?',
      [roomId, userId]
    );

    if (!room) {
      await db.rollbackAsync();
      return res.status(404).json({
        status: 'error',
        message: 'チャットルームが見つかないか、削除権限がありません'
      });
    }

    // メッセージの削除
    await db.runAsync(
      'DELETE FROM chat_room_messages WHERE room_id = ?',
      [roomId]
    );

    // メンバーシップの削除
    await db.runAsync(
      'DELETE FROM chat_room_members WHERE room_id = ?',
      [roomId]
    );

    // ルームの削除
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
};

// メッセージの送信
const sendMessage = async (req, res) => {
  const { message, roomId } = req.body;
  const userId = req.user.id;

  // Content-Type を設定
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    await db.beginTransactionAsync();

    // チャットルームの存在確認
    const room = await db.getAsync(
      'SELECT * FROM chat_rooms WHERE id = ?',
      [roomId]
    );

    if (!room) {
      await db.rollbackAsync();
      res.write(`data: ${JSON.stringify({ error: 'チャットルームが見つかりません' })}\n\n`);
      res.end();
      return;
    }

    // ユーザーがルームのメンバーであることを確認
    const membership = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (!membership) {
      await db.rollbackAsync();
      res.write(`data: ${JSON.stringify({ error: 'チャットルームのメンバーではありません' })}\n\n`);
      res.end();
      return;
    }

    const timestamp = new Date().toISOString();

    // ユーザーのメッセージを保存
    const userMessageId = uuidv4();
    await db.runAsync(
      'INSERT INTO chat_room_messages (id, room_id, user_id, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [userMessageId, roomId, userId, message, timestamp]
    );

    // ユーザーメッセージの保存を通知
    res.write(`data: ${JSON.stringify({
      type: 'user_message_saved',
      data: {
        id: userMessageId,
        message: message,
        timestamp: timestamp
      }
    })}\n\n`);

    // OpenAI APIを使用して応答を生成（ストリーミングモード）
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 8000,
      stream: true,
    });

    let fullResponse = '';

    // ストリームからの応答を処理
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        // クライアントにチャンクを送信
        res.write(`data: ${JSON.stringify({
          type: 'ai_response_chunk',
          data: { content }
        })}\n\n`);
      }
    }

    // AIの完全な応答を保存
    const aiMessageId = uuidv4();
    await db.runAsync(
      'INSERT INTO chat_room_messages (id, room_id, user_id, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [aiMessageId, roomId, 'system', fullResponse, timestamp]
    );

    // トークルームの更新日時を更新
    await db.runAsync(
      'UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [roomId]
    );

    await db.commitAsync();

    // 完了通知を送信
    res.write(`data: ${JSON.stringify({
      type: 'ai_response_complete',
      data: {
        id: aiMessageId,
        message: fullResponse,
        timestamp: timestamp
      }
    })}\n\n`);

    res.end();
  } catch (error) {
    await db.rollbackAsync();
    console.error('メッセージの送信エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'メッセージの送信に失敗しました'
    });
  }
};

// チャット履歴の取得
const getChatHistory = async (req, res) => {
  const userId = req.user.id;
  const { roomId } = req.query;

  try {
    // チャットルームの存在確認
    const room = await db.getAsync(
      'SELECT * FROM chat_rooms WHERE id = ?',
      [roomId]
    );

    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'チャットルームが見つかりません'
      });
    }

    // ユーザーがルームのメンバーであることを確認
    const membership = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (!membership) {
      return res.status(403).json({
        status: 'error',
        message: 'チャットルームのメンバーではありません'
      });
    }

    // チャットルームのメッセージを取得
    const messages = await db.allAsync(`
      SELECT m.*, u.email as user_email
      FROM chat_room_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC
    `, [roomId]);

    res.json({
      status: 'success',
      data: {
        history: messages.map(msg => ({
          id: msg.id,
          user_id: msg.user_id,
          user_email: msg.user_email || 'system',
          message: msg.message,
          created_at: msg.created_at
        }))
      }
    });
  } catch (error) {
    console.error('チャット履歴の取得エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'チャット履歴の取得に失敗しました'
    });
  }
};

// チャット履歴の削除
const deleteChatHistory = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { roomId } = req.query;

  try {
    await db.beginTransactionAsync();

    // メッセージの存在確認
    const message = await db.getAsync(
      'SELECT * FROM chat_room_messages WHERE id = ? AND room_id = ? AND user_id = ?',
      [id, roomId, userId]
    );

    if (!message) {
      await db.rollbackAsync();
      return res.status(404).json({
        status: 'error',
        message: '指定されたチャット履歴が見つかりません'
      });
    }

    // メッセージの削除
    await db.runAsync(
      'DELETE FROM chat_room_messages WHERE id = ? AND room_id = ? AND user_id = ?',
      [id, roomId, userId]
    );

    await db.commitAsync();

    res.json({
      status: 'success',
      message: 'チャット履歴を削除しました'
    });
  } catch (error) {
    await db.rollbackAsync();
    console.error('チャット履歴の削除エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'チャット履歴の削除に失敗しました'
    });
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  sendMessage,
  getChatHistory,
  deleteChatHistory
};
