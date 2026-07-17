const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorizeAdmin);

router.get('/stats', adminController.getAdminStats);

module.exports = router;
