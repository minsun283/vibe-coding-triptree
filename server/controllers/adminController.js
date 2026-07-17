const Order = require('../models/Order');
const Product = require('../models/Product');

const REVENUE_ORDER_STATUSES = ['paid', 'confirmed', 'in_progress', 'completed'];
const NEW_ORDER_STATUSES = ['paid'];

const getAdminStats = async (req, res) => {
  try {
    const [newOrders, totalOrders, totalProducts, salesResult] = await Promise.all([
      Order.countDocuments({ status: { $in: NEW_ORDER_STATUSES } }),
      Order.countDocuments(),
      Product.countDocuments(),
      Order.aggregate([
        {
          $match: {
            status: { $in: REVENUE_ORDER_STATUSES },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$pricing.totalAmount' },
          },
        },
      ]),
    ]);

    res.json({
      newOrders,
      totalOrders,
      totalProducts,
      totalSales: salesResult[0]?.totalSales ?? 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

module.exports = {
  getAdminStats,
};
