const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

// 모든 주문 API는 로그인(JWT) 필요
router.use(authenticate);

// POST /api/orders - 주문 생성 (장바구니 → 주문)
router.post('/', orderController.createOrder);

// GET /api/orders - 주문 목록 조회 (본인 주문 / 관리자는 전체)
router.get('/', orderController.getOrders);

// GET /api/orders/:id - 주문 상세 조회
router.get('/:id', orderController.getOrderById);

// POST /api/orders/:id/cancel-request - 고객 취소 요청
router.post('/:id/cancel-request', orderController.requestOrderCancellation);

// PATCH /api/orders/:id/cancel-request/approve - 관리자 취소 승인
router.patch(
  '/:id/cancel-request/approve',
  authorizeAdmin,
  orderController.approveOrderCancellation
);

// PATCH /api/orders/:id/cancel-request/reject - 관리자 취소 반려
router.patch(
  '/:id/cancel-request/reject',
  authorizeAdmin,
  orderController.rejectOrderCancellation
);

// PUT /api/orders/:id - 주문 수정 (관리자)
router.put('/:id', orderController.updateOrder);

// DELETE /api/orders/:id - 주문 삭제 (관리자)
router.delete('/:id', authorizeAdmin, orderController.deleteOrder);

module.exports = router;
