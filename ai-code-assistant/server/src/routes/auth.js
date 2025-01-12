const express = require('express');
const router = express.Router();
const { register, login, resetPassword } = require('../controllers/auth');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// 認証が不要なルート
router.post('/register', register);
router.post('/login', login);

// 認証が必要なルート
router.use(authenticateToken);

// トークン検証用エンドポイント
router.get('/verify', (req, res) => {
  // authenticateTokenミドルウェアを通過していれば、req.userが設定されている
  res.json({
    status: 'success',
    data: {
      user: {
        id: req.user.id,
        email: req.user.email
      }
    }
  });
});

// パスワードリセット（管理者のみ）
router.post('/reset-password', isAdmin, resetPassword);

module.exports = router;
