const express = require('express');
const contactController = require('../controllers/contactController');
const { authenticate, authorizeAdmin, optionalAuthenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/contacts - 상담 문의 접수 (공개, 로그인 시 사용자 연결)
router.post('/', optionalAuthenticate, contactController.createContact);

// GET /api/contacts - 상담 문의 목록 조회
//   ?mine=true       내 견적 요청 (로그인)
//   ?page=1&limit=10
//   ?groupType=기업
//   ?expectedHeadcount=50명이하
//   ?programType=워크샵
router.get('/', optionalAuthenticate, contactController.getContacts);

// PATCH /api/contacts/:id/comment - 관리자 코멘트 등록/수정
router.patch('/:id/comment', authenticate, authorizeAdmin, contactController.updateContactComment);

// GET /api/contacts/:id - 상담 문의 상세 조회 (본인 또는 관리자)
router.get('/:id', authenticate, contactController.getContactById);

// PUT /api/contacts/:id - 상담 문의 수정 (본인 또는 관리자)
router.put('/:id', authenticate, contactController.updateContact);

// DELETE /api/contacts/:id - 상담 문의 삭제 (본인 또는 관리자)
router.delete('/:id', authenticate, contactController.deleteContact);

module.exports = router;
