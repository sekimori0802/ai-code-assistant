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

// メッセージの送信
const sendMessage = async (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;
  const defaultRoomId = '00000000-0000-0000-0000-000000000000';

  console.log('メッセージ送信リクエスト:', {
    userId,
    message,
    user: req.user
  });

  try {
    await db.beginTransactionAsync();

    // ユーザーがデフォルトルームのメンバーでない場合は追加
    const membership = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [defaultRoomId, userId]
    );

    if (!membership) {
      await db.runAsync(
        'INSERT INTO chat_room_members (room_id, user_id, joined_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [defaultRoomId, userId]
      );
    }

    // OpenAI APIを使用して応答を生成
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0].message.content;
    const timestamp = new Date().toISOString();

    // ユーザーのメッセージを保存
    const userMessageId = uuidv4();
    await db.runAsync(
      'INSERT INTO chat_room_messages (id, room_id, user_id, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [userMessageId, defaultRoomId, userId, message, timestamp]
    );

    // AIの応答を保存
    const aiMessageId = uuidv4();
    await db.runAsync(
      'INSERT INTO chat_room_messages (id, room_id, user_id, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [aiMessageId, defaultRoomId, 'system', response, timestamp]
    );

    // トークルームの更新日時を更新
    await db.runAsync(
      'UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [defaultRoomId]
    );

    await db.commitAsync();

    res.json({
      status: 'success',
      data: {
        userMessage: {
          id: userMessageId,
          message: message,
          timestamp: timestamp
        },
        aiResponse: {
          id: aiMessageId,
          message: response,
          timestamp: timestamp
        }
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

// チャット履歴の取得
const getChatHistory = async (req, res) => {
  const userId = req.user.id;
  const defaultRoomId = '00000000-0000-0000-0000-000000000000';

  console.log('チャット履歴取得リクエスト:', {
    userId,
    user: req.user
  });

  try {
    // デフォルトルームのメッセージを取得
    const messages = await db.allAsync(`
      SELECT m.*, u.email as user_email
      FROM chat_room_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at DESC
    `, [defaultRoomId]);

    console.log('取得したチャット履歴:', messages);

    const history = messages.map(msg => ({
      id: msg.id,
      user_id: msg.user_id,
      user_email: msg.user_email || 'system',
      message: msg.message,
      created_at: msg.created_at
    }));

    console.log('フォーマット済みチャット履歴:', history);

    res.json({
      status: 'success',
      data: {
        history: history
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
  const defaultRoomId = '00000000-0000-0000-0000-000000000000';

  console.log('チャット履歴削除リクエスト:', {
    messageId: id,
    userId,
    user: req.user
  });

  try {
    await db.beginTransactionAsync();

    // メッセージの存在確認
    const message = await db.getAsync(
      'SELECT * FROM chat_room_messages WHERE id = ? AND room_id = ? AND user_id = ?',
      [id, defaultRoomId, userId]
    );

    console.log('削除対象のメッセージ:', message);

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
      [id, defaultRoomId, userId]
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
  sendMessage,
  getChatHistory,
  deleteChatHistory
};
