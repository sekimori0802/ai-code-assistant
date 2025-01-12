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

  console.log('メッセージ送信リクエスト:', {
    userId,
    message,
    user: req.user
  });

  try {
    await db.beginTransactionAsync();

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

    // チャットログの保存
    const chatId = uuidv4();
    console.log('チャットログを保存:', {
      chatId,
      userId,
      message,
      response,
      timestamp
    });

    await db.runAsync(
      'INSERT INTO chat_logs (id, user_id, message, response, timestamp) VALUES (?, ?, ?, ?, ?)',
      [chatId, userId, message, response, timestamp]
    );

    // 保存したメッセージを取得
    const savedMessage = await db.getAsync(
      'SELECT * FROM chat_logs WHERE id = ?',
      [chatId]
    );

    console.log('保存されたメッセージ:', savedMessage);

    await db.commitAsync();

    res.json({
      status: 'success',
      data: {
        id: savedMessage.id,
        message: savedMessage.message,
        response: savedMessage.response,
        timestamp: savedMessage.timestamp
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

  console.log('チャット履歴取得リクエスト:', {
    userId,
    user: req.user
  });

  try {
    // チャット履歴を取得（降順に変更）
    const rows = await db.allAsync(
      'SELECT * FROM chat_logs WHERE user_id = ? ORDER BY timestamp DESC',
      [userId]
    );

    console.log('取得したチャット履歴:', rows);

    // 空の配列を返すように修正
    const history = rows ? rows.map(row => ({
      id: row.id,
      message: row.message,
      response: row.response,
      timestamp: row.timestamp
    })) : [];

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

  console.log('チャット履歴削除リクエスト:', {
    messageId: id,
    userId,
    user: req.user
  });

  try {
    await db.beginTransactionAsync();

    // メッセージの存在確認
    const message = await db.getAsync(
      'SELECT * FROM chat_logs WHERE id = ? AND user_id = ?',
      [id, userId]
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
      'DELETE FROM chat_logs WHERE id = ? AND user_id = ?',
      [id, userId]
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
