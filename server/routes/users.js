const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// GET /api/users - 전체 유저 목록 조회
router.get('/', userController.getUsers);

// GET /api/users/:id - 특정 유저 조회
router.get('/:id', userController.getUserById);

// POST /api/users - 새 유저 생성
router.post('/', userController.createUser);

// PUT /api/users/:id - 유저 정보 수정
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - 유저 삭제
router.delete('/:id', userController.deleteUser);

module.exports = router;
