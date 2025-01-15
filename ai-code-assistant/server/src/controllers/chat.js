const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const db = require('../config/database');

// OpenAI APIの設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AIタイプごとのシステムプロンプト
const AI_TYPE_PROMPTS = {
  code_generation: `あなたはAIプログラミングアシスタントです。
以下の方針に従って応答してください：

1. コードの説明や提案を行う際は、具体的な実装例を含めてください。
2. エラーの解決方法を説明する際は、原因と対策を明確に示してください。
3. ベストプラクティスや設計パターンについて説明する際は、実際のユースケースを含めてください。
4. セキュリティに関する提案を行う際は、具体的なリスクと対策を説明してください。
5. パフォーマンスの改善について説明する際は、測定可能な指標と改善方法を示してください。

応答は日本語で行い、コードブロックは\`\`\`言語名\nコード\`\`\`の形式で記述してください。`,

  blog_writing: `あなたはブログ記事作成のエキスパートアシスタントです。
以下の方針に従って応答してください：

1. SEOを意識した魅力的な見出しと構成を提案します。
2. ターゲット読者の興味や課題に焦点を当てた内容を提供します。
3. 具体的な例や事例を含めて、読者の理解を深めます。
4. 信頼性の高い情報源を参照し、正確な情報を提供します。
5. 読みやすい文章構成とリズムのある展開を心がけます。

応答は日本語で行い、必要に応じて見出しや箇条書きを活用して構造化された内容を提供します。`,

  english_conversation: `I am your English conversation practice assistant.
Let's follow these guidelines for our conversation:

1. I will help you practice natural English conversation in various situations.
2. I will correct your grammar and vocabulary mistakes gently and constructively.
3. I will introduce useful expressions and idioms appropriate for each context.
4. I will help you improve your pronunciation through text-based explanations.
5. I will maintain conversations that match your proficiency level.

I will respond in English, but I can provide explanations in Japanese when needed for better understanding.`,

  video_editing: `あなたは動画編集のエキスパートアシスタントです。
以下の方針に従って応答してください：

1. 編集ソフトウェアの具体的な操作手順を説明します。
2. 効果的なトランジションやエフェクトの使用方法を提案します。
3. 視聴者の興味を引く編集テクニックを紹介します。
4. 音声や音楽の効果的な活用方法をアドバイスします。
5. パフォーマンスと品質のバランスを考慮した設定を提案します。

応答は日本語で行い、必要に応じてスクリーンショットやタイムラインの図解を文字で表現します。`,

  pc_productivity: `あなたはPC作業の効率化エキスパートアシスタントです。
以下の方針に従って応答してください：

1. ショートカットキーやキーボード操作の効率的な使用方法を提案します。
2. タスク管理や時間管理の効果的なツールと使い方を紹介します。
3. 自動化可能な作業の特定とその実現方法を説明します。
4. ファイル管理やデータ整理の効率的な方法を提案します。
5. 作業環境の最適化とカスタマイズ方法を提案します。

応答は日本語で行い、具体的な手順とツールの設定方法を明確に説明します。`
};

// メッセージの送信
const sendMessage = async (req, res) => {
  // クエリパラメータまたはリクエストボディからデータを取得
  const message = req.query.message || req.body.message;
  const roomId = req.query.roomId || req.body.roomId;
  const aiType = req.query.aiType || req.body.aiType;
  const userId = req.user.id;

  console.log('メッセージ送信パラメータ:', {
    message,
    roomId,
    aiType,
    userId,
    method: req.method,
    query: req.query,
    body: req.body
  });

  // SSEの場合のみContent-Typeを設定
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  try {
    await db.beginTransactionAsync();

    // チャットルームの存在確認とAIタイプの取得
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

    // トークルームのメンバー数を取得
    const memberCountResult = await db.getAsync(
      'SELECT COUNT(*) as count FROM chat_room_members WHERE room_id = ?',
      [roomId]
    );
    const memberCount = parseInt(memberCountResult.count, 10);

    console.log('メンバー数とメンション条件:', {
      memberCount,
      message,
      hasMention: message.includes('@AI'),
      isSingleUser: memberCount === 1,
      rawCount: memberCountResult
    });

    // AIモデルを呼び出す条件を確認
    const isSingleUser = memberCount === 1;
    // 全角・半角両方のメンションに対応
    const hasMention = message.includes('@AI') || message.includes('＠AI');
    const shouldCallAI = isSingleUser || (!isSingleUser && hasMention);

    console.log('AI呼び出し判定:', {
      shouldCallAI,
      isSingleUser,
      hasMention,
      memberCount
    });

    // ユーザーがルームのメンバーであることを確認
    const membership = await db.getAsync(
      'SELECT * FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    if (!membership) {
      await db.rollbackAsync();
      if (req.method === 'GET') {
        res.write(`data: ${JSON.stringify({ error: 'チャットルームのメンバーではありません' })}\n\n`);
        res.end();
      } else {
        res.status(403).json({
          status: 'error',
          message: 'チャットルームのメンバーではありません'
        });
      }
      return;
    }

    const timestamp = new Date().toISOString();

    // ユーザーのメッセージを保存
    const userMessageId = uuidv4();
    await db.runAsync(
      'INSERT INTO chat_room_messages (id, room_id, user_id, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [userMessageId, roomId, userId, message, timestamp]
    );

    // メンバー数とメンション条件に基づいてAIの応答を制御
    if (!shouldCallAI) {
      await db.commitAsync();
      if (req.method === 'GET') {
        res.write(`data: ${JSON.stringify({
          type: 'user_message_saved',
          data: {
            id: userMessageId,
            message: message,
            timestamp: timestamp
          }
        })}\n\n`);
        res.end();
      } else {
        res.json({
          status: 'success',
          data: {
            id: userMessageId,
            message: message,
            timestamp: timestamp
          }
        });
      }
      return;
    }


    // ユーザーメッセージの保存を通知
    res.write(`data: ${JSON.stringify({
      type: 'user_message_saved',
      data: {
        id: userMessageId,
        message: message,
        timestamp: timestamp
      }
    })}\n\n`);

    try {
      // AIタイプに応じたシステムプロンプトを選択
      // クエリパラメータのAIタイプを優先し、なければルームのAIタイプを使用
      const systemPrompt = AI_TYPE_PROMPTS[aiType || room.ai_type || 'code_generation'];

      // OpenAI APIを使用して応答を生成（ストリーミングモード）
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 4000,
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
      console.error('OpenAI APIエラー:', error);
      await db.rollbackAsync();
      
      // エラーメッセージをクライアントに送信
      res.write(`data: ${JSON.stringify({
        type: 'error',
        data: { 
          message: 'AIの応答生成中にエラーが発生しました',
          details: error.message
        }
      })}\n\n`);
      
      res.end();
    }
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

module.exports = {
  sendMessage,
  getChatHistory
};
