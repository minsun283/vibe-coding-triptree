const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/users - 회원가입 (공개)
// 본인 정보 조회/수정은 /api/auth/me 를 사용합니다.
router.post('/', userController.createUser);

// 이하 모든 회원 관리 API는 관리자 전용입니다.
router.use(authenticate, authorizeAdmin);

// GET /api/users - 전체 유저 목록 조회 (관리자)
router.get('/', userController.getUsers);

// GET /api/users/:id - 특정 유저 조회 (관리자)
router.get('/:id', userController.getUserById);

// PUT /api/users/:id - 유저 정보 수정 (관리자)
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - 유저 삭제 (관리자)
router.delete('/:id', userController.deleteUser);

module.exports = router;
