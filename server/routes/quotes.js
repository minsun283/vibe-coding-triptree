const express = require('express');
const quoteController = require('../controllers/quoteController');
const { authenticate, authorizeAdmin, optionalAuthenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/quotes/pay/:token - 견적 결제 정보 조회 (공개)
router.get('/pay/:token', quoteController.getQuoteByToken);

// POST /api/quotes/pay/:token - 견적 결제 (로그인)
router.post('/pay/:token', authenticate, quoteController.payQuote);

// POST /api/quotes - 견적 발행 (관리자)
router.post('/', authenticate, authorizeAdmin, quoteController.createQuote);

// GET /api/quotes - 견적 목록 (관리자 / ?mine=true 고객 / ?contactId=)
router.get('/', optionalAuthenticate, quoteController.getQuotes);

module.exports = router;
