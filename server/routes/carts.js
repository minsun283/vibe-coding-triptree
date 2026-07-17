const express = require('express');
const cartController = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 모든 장바구니 API는 로그인(JWT) 필요
router.use(authenticate);

// GET /api/cart - 내 장바구니 조회
router.get('/', cartController.getCart);

// GET /api/cart/count - 장바구니 아이템 개수 조회
router.get('/count', cartController.getCartItemCount);

// DELETE /api/cart - 내 장바구니 전체 비우기
router.delete('/', cartController.clearCart);

// POST /api/cart/items - 장바구니에 상품 담기
router.post('/items', cartController.addCartItem);

// PUT /api/cart/items/:itemId - 장바구니 항목 인원 수정
router.put('/items/:itemId', cartController.updateCartItem);

// DELETE /api/cart/items/:itemId - 장바구니 항목 삭제
router.delete('/items/:itemId', cartController.removeCartItem);

module.exports = router;
