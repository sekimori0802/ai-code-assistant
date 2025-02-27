const jwt = require('jsonwebtoken');
const db = require('../config/database');

// JWTトークンの検証ミドルウェア
const authenticateToken = async (req, res, next) => {
  let transaction = false;
  try {
    // ヘッダーまたはクエリパラメータからトークンを取得
    const authHeader = req.headers['authorization'];
    const queryToken = req.query.token;
    console.log('認証情報:', {
      header: authHeader,
      query: queryToken ? '存在します' : '存在しません'
    });

    let token = queryToken;
    if (!token && authHeader) {
      token = authHeader.split(' ')[1];
    }
    console.log('トークン:', token ? '存在します' : '存在しません');

    if (!token) {
      console.log('トークンが見つかりません');
      return res.status(401).json({
        status: 'error',
        message: '認証トークンが必要です'
      });
    }

    // トークンの検証
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('デコードされたトークン:', decoded);

    // ユーザーの存在確認（トランザクションなし）
    const user = await db.getAsync(
      'SELECT id, email FROM users WHERE id = ?',
      [decoded.id]
    );
    console.log('データベースのユーザー:', user);

    if (!user) {
      console.log('ユーザーが見つかりません:', decoded.id);
      return res.status(401).json({
        status: 'error',
        message: 'ユーザーが見つかりません'
      });
    }

    // リクエストにユーザー情報を追加
    req.user = {
      id: user.id,
      email: user.email
    };
    console.log('認証成功:', req.user);

    next();
  } catch (error) {
    console.error('認証エラー:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: '認証トークンの有効期限が切れています'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: '無効な認証トークンです'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'サーバーエラーが発生しました'
    });
  }
};

// 管理者権限の確認ミドルウェア
const isAdmin = async (req, res, next) => {
  try {
    console.log('管理者権限チェック:', req.user);

    const user = await db.getAsync(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.id]
    );
    console.log('ユーザーの管理者権限:', user);

    if (!user || !user.is_admin) {
      console.log('管理者権限がありません:', req.user.id);
      return res.status(403).json({
        status: 'error',
        message: '管理者権限が必要です'
      });
    }

    console.log('管理者権限確認成功');
    next();
  } catch (error) {
    console.error('管理者権限チェックエラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'サーバーエラーが発生しました'
    });
  }
};

module.exports = {
  authenticateToken,
  isAdmin
};
