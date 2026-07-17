const express = require('express');
const productController = require('../controllers/productController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/products?all=true - 상품 전체 조회
// GET /api/products?page=1&limit=2 - 상품 목록 조회 (페이지네이션, 기본 2개)
router.get('/', productController.getProducts);

// GET /api/products/:id - 특정 상품 조회
router.get('/:id', productController.getProductById);

// POST /api/products - 상품 생성 (관리자)
router.post('/', authenticate, authorizeAdmin, productController.createProduct);

// PUT /api/products/:id - 상품 수정 (관리자)
router.put('/:id', authenticate, authorizeAdmin, productController.updateProduct);

// DELETE /api/products/:id - 상품 삭제 (관리자)
router.delete('/:id', authenticate, authorizeAdmin, productController.deleteProduct);

module.exports = router;
