const express = require('express');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login - 이메일/비밀번호 로그인
router.post('/login', userController.loginUser);

// GET /api/auth/me - 토큰으로 현재 유저 정보 조회
router.get('/me', authenticate, userController.getCurrentUser);

// PUT /api/auth/me - 현재 유저 정보 수정
router.put('/me', authenticate, userController.updateCurrentUser);

module.exports = router;
