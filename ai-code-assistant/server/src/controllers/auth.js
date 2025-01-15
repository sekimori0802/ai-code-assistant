const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// ユーザー登録
const register = async (req, res) => {
  const { email, password } = req.body;

  try {
    await db.beginTransactionAsync();

    // メールアドレスの重複チェック
    const existingUser = await db.getAsync(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      await db.rollbackAsync();
      return res.status(400).json({
        status: 'error',
        message: 'このメールアドレスは既に登録されています'
      });
    }

    // パスワードのハッシュ化
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ユーザーの作成
    const userId = uuidv4();
    await db.runAsync(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, email, hashedPassword]
    );

    // JWTトークンの生成
    const token = jwt.sign(
      { id: userId, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 作成したユーザー情報を取得
    const user = await db.getAsync(
      'SELECT id, email, created_at FROM users WHERE id = ?',
      [userId]
    );

    await db.commitAsync();

    res.status(201).json({
      status: 'success',
      message: 'ユーザー登録が完了しました',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        }
      }
    });
  } catch (error) {
    await db.rollbackAsync();
    console.error('ユーザー登録エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'サーバーエラーが発生しました'
    });
  }
};

// ログイン
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    await db.beginTransactionAsync();

    // ユーザーの検索
    console.log('ログイン処理開始:', { email });

    const user = await db.getAsync(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    console.log('ユーザー検索結果:', user);

    if (!user) {
      await db.rollbackAsync();
      return res.status(401).json({
        status: 'error',
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
    }

    // パスワードの検証
    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log('パスワード検証結果:', validPassword);
    if (!validPassword) {
      await db.rollbackAsync();
      return res.status(401).json({
        status: 'error',
        message: 'メールアドレスまたはパスワードが正しくありません'
      });
    }

    // JWTトークンの生成
    console.log('JWT_SECRET:', process.env.JWT_SECRET);

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('JWTトークン生成成功:', token);

    // 最終ログイン日時の更新
    await db.runAsync(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    await db.commitAsync();

    res.json({
      status: 'success',
      message: 'ログインに成功しました',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        }
      }
    });
  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'サーバーエラーが発生しました'
    });
  }
};

// パスワードリセット
const resetPassword = async (req, res) => {
  const { userId, newPassword } = req.body;

  try {
    await db.beginTransactionAsync();

    // ユーザーの存在確認
    const user = await db.getAsync(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      await db.rollbackAsync();
      return res.status(404).json({
        status: 'error',
        message: 'ユーザーが見つかりません'
      });
    }

    // パスワードのハッシュ化
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // パスワードの更新
    await db.runAsync(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );

    await db.commitAsync();

    res.json({
      status: 'success',
      message: 'パスワードが更新されました'
    });
  } catch (error) {
    await db.rollbackAsync();
    console.error('パスワードリセットエラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'サーバーエラーが発生しました'
    });
  }
};

// トークン検証
const verifyToken = async (req, res) => {
  try {
    const user = req.user;
    console.log('トークン検証リクエスト:', { user });

    // ユーザー情報の取得
    const userData = await db.getAsync(
      'SELECT id, email, created_at FROM users WHERE id = ?',
      [user.id]
    );

    if (!userData) {
      return res.status(401).json({
        status: 'error',
        message: '無効なトークンです'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          created_at: userData.created_at
        }
      }
    });
  } catch (error) {
    console.error('トークン検証エラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'サーバーエラーが発生しました'
    });
  }
};

module.exports = {
  register,
  login,
  resetPassword,
  verifyToken
};
