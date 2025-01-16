const express = require('express');
const router = express.Router();
const { register, login, resetPassword, verifyToken, updateSettings } = require('../controllers/auth');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// 認証が不要なルート
router.post('/register', register);
router.post('/login', login);

// 認証が必要なルート
router.use(authenticateToken);

// トークン検証用エンドポイント
router.get('/verify', verifyToken);

// パスワードリセット（管理者のみ）
router.post('/reset-password', isAdmin, resetPassword);

// ユーザー設定の更新
router.put('/settings', updateSettings);

module.exports = router;
