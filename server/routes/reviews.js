const express = require('express');
const reviewController = require('../controllers/reviewController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/reviews - 후기 목록 조회 (공개)
//   ?product=상품ID  상품별 필터
//   ?mine=true       내 후기만 (로그인 필요)
//   ?user=사용자ID   특정 사용자 후기 (관리자)
//   ?page=1&limit=10 페이지네이션
router.get('/', optionalAuthenticate, reviewController.getReviews);

// GET /api/reviews/:id - 후기 상세 조회 (공개)
router.get('/:id', reviewController.getReviewById);

// POST /api/reviews - 후기 작성 (로그인, 구매 확인)
router.post('/', authenticate, reviewController.createReview);

// PUT /api/reviews/:id - 후기 수정 (작성자 / 관리자)
router.put('/:id', authenticate, reviewController.updateReview);

// DELETE /api/reviews/:id - 후기 삭제 (작성자 / 관리자)
router.delete('/:id', authenticate, reviewController.deleteReview);

module.exports = router;
