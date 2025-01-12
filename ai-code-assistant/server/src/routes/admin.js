const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// すべての管理者ルートで認証と管理者権限を必要とする
router.use(authenticateToken);
router.use(isAdmin);

// ユーザー一覧の取得
router.get('/users', async (req, res) => {
  try {
    const users = await db.allAsync(
      'SELECT id, email, created_at, updated_at FROM users',
      []
    );

    res.json({
      status: 'success',
      data: {
        users: users
      }
    });
  } catch (error) {
    console.error('ユーザー一覧の取得エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'ユーザー一覧の取得に失敗しました'
    });
  }
});

// ユーザーの削除
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.beginTransactionAsync();

    const result = await db.runAsync(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      await db.rollbackAsync();
      return res.status(404).json({
        status: 'error',
        message: 'ユーザーが見つかりません'
      });
    }

    await db.commitAsync();

    res.json({
      status: 'success',
      message: 'ユーザーを削除しました'
    });
  } catch (error) {
    await db.rollbackAsync();
    console.error('ユーザー削除エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'ユーザーの削除に失敗しました'
    });
  }
});

// チャットログの取得
router.get('/chat-logs', async (req, res) => {
  try {
    const logs = await db.allAsync(`
      SELECT 
        c.id,
        c.message,
        c.response,
        c.timestamp,
        u.email as user_email
      FROM chat_logs c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.timestamp DESC
    `, []);

    res.json({
      status: 'success',
      data: {
        logs: logs
      }
    });
  } catch (error) {
    console.error('チャットログの取得エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'チャットログの取得に失敗しました'
    });
  }
});

// LLM設定の更新
router.post('/llm-settings', async (req, res) => {
  const { api_key, model } = req.body;

  try {
    await db.beginTransactionAsync();

    // 既存の設定を削除
    await db.runAsync('DELETE FROM llm_settings');

    // 新しい設定を追加
    const id = uuidv4();
    await db.runAsync(
      'INSERT INTO llm_settings (id, api_key, model) VALUES (?, ?, ?)',
      [id, api_key, model]
    );

    await db.commitAsync();

    res.json({
      status: 'success',
      message: 'LLM設定を更新しました'
    });
  } catch (error) {
    await db.rollbackAsync();
    console.error('LLM設定の更新エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'LLM設定の更新に失敗しました'
    });
  }
});

module.exports = router;
