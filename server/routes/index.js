const express = require('express');
const adminRoutes = require('./admin');
const authRoutes = require('./auth');
const boardRoutes = require('./board');
const cartRoutes = require('./carts');
const contactRoutes = require('./contacts');
const orderRoutes = require('./orders');
const productRoutes = require('./products');
const quoteRoutes = require('./quotes');
const reviewRoutes = require('./reviews');
const userRoutes = require('./users');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/board', boardRoutes);
router.use('/cart', cartRoutes);
router.use('/contacts', contactRoutes);
router.use('/orders', orderRoutes);
router.use('/products', productRoutes);
router.use('/quotes', quoteRoutes);
router.use('/reviews', reviewRoutes);
router.use('/users', userRoutes);

module.exports = router;
