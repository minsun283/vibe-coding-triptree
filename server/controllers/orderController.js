const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Quote = require('../models/Quote');
const User = require('../models/User');
const { ORDER_STATUSES, PAYMENT_METHODS } = require('../models/Order');
const {
  verifyPortonePayment,
  PortonePaymentVerificationError,
} = require('../services/portoneService');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const getDepositAccountFromEnv = () => {
  const bank = process.env.BANK_ACCOUNT_BANK?.trim();
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER?.trim();
  const accountHolder = process.env.BANK_ACCOUNT_HOLDER?.trim();

  if (!bank || !accountNumber || !accountHolder) {
    return null;
  }

  return { bank, accountNumber, accountHolder };
};

const populateOrder = [
  { path: 'user', select: 'name email' },
  { path: 'items.product', select: 'sku name thumbnail price location' },
];

const handleOrderError = (error, res) => {
  if (error.name === 'CastError') {
    return res.status(400).json({ message: '유효하지 않은 ID입니다.' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: '이미 사용 중인 주문번호입니다.' });
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  console.error(error);
  return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
};

const parsePaginationQuery = (query) => {
  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const safeLimit = Number.isNaN(limit) || limit < 1
    ? DEFAULT_LIMIT
    : Math.min(limit, MAX_LIMIT);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const isAdmin = (user) => user?.user_type === 'admin';

const buildOrderFilter = (req) => {
  const filter = {};

  if (!isAdmin(req.user)) {
    filter.user = req.user.userId;
  }

  if (req.query.status && ORDER_STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }

  return filter;
};

const findOrderForUser = async (orderId, reqUser) => {
  const filter = { _id: orderId };

  if (!isAdmin(reqUser)) {
    filter.user = reqUser.userId;
  }

  return Order.findOne(filter).populate(populateOrder);
};

const generateOrderNumber = async () => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${today}-`;
  const count = await Order.countDocuments({
    orderNumber: { $regex: `^${prefix}` },
  });

  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const buildOrderItemFromCartItem = (cartItem, product) => {
  const lineTotal = cartItem.unitPrice * cartItem.headcount;

  return {
    product: product._id,
    productSku: product.sku,
    productName: product.name,
    thumbnail: product.thumbnail,
    location: product.location,
    pricing: {
      unitPrice: cartItem.unitPrice,
      headcount: cartItem.headcount,
      lineTotal,
      productPrice: product.price,
    },
    cartItemId: cartItem._id,
  };
};

const normalizeContact = (contact = {}, user) => {
  const name = contact.name?.trim() || user?.name;
  const email = contact.email?.trim() || user?.email;

  if (!name) {
    return { error: '주문자 이름은 필수입니다.' };
  }

  if (!email) {
    return { error: '주문자 이메일은 필수입니다.' };
  }

  return {
    contact: {
      name,
      email: email.toLowerCase(),
      phone: contact.phone?.trim() || '',
      address: contact.address?.trim() || user?.address || '',
    },
  };
};

const applyStatusSideEffects = (order, nextStatus) => {
  const now = new Date();

  if (nextStatus === 'confirmed' && !order.confirmedAt) {
    order.confirmedAt = now;
  }

  if (nextStatus === 'cancel_requested' && !order.cancellationRequestedAt) {
    order.cancellationRequestedAt = now;
  }

  if (nextStatus === 'paid' && order.cancellationRequestedAt) {
    order.cancellationRequestedAt = null;
  }

  if (nextStatus === 'cancelled' && !order.cancelledAt) {
    order.cancelledAt = now;

    if (order.payment?.status === 'pending') {
      order.payment.status = 'failed';
    }
  }

  if (nextStatus === 'paid') {
    if (!order.paidAt) {
      order.paidAt = now;
    }

    if (order.payment?.status === 'pending') {
      order.payment.status = 'paid';
      order.payment.paidAt = now;
    }
  }
};

const findDuplicateOrder = async ({ paymentId, transactionId }) => {
  const filters = [];

  if (paymentId) {
    filters.push({ 'payment.paymentId': paymentId });
  }

  if (transactionId) {
    filters.push({ 'payment.transactionId': transactionId });
  }

  if (filters.length === 0) {
    return null;
  }

  return Order.findOne({ $or: filters });
};

const syncQuoteWithOrderStatus = async (order) => {
  if (!order.quote) {
    return;
  }

  if (order.status === 'cancelled' || order.status === 'refunded') {
    await Quote.findByIdAndUpdate(order.quote, { status: 'cancelled' });
    return;
  }

  if (['paid', 'confirmed', 'in_progress', 'completed'].includes(order.status)) {
    await Quote.findByIdAndUpdate(order.quote, {
      status: 'paid',
      paidAt: order.paidAt || new Date(),
      order: order._id,
    });
  }
};

// POST /api/orders/:id/cancel-request
const requestOrderCancellation = async (req, res) => {
  try {
    const order = await findOrderForUser(req.params.id, req.user);

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    if (isAdmin(req.user)) {
      return res.status(403).json({ message: '관리자는 이 API를 사용할 수 없습니다.' });
    }

    if (order.status !== 'paid') {
      return res.status(400).json({ message: '결제완료 상태의 주문만 취소를 요청할 수 있습니다.' });
    }

    const cancelReason = req.body?.cancelReason?.trim();

    if (cancelReason && cancelReason.length > 300) {
      return res.status(400).json({ message: '취소 사유는 300자 이하로 입력해 주세요.' });
    }

    order.status = 'cancel_requested';
    order.cancellationRequestedAt = new Date();

    if (cancelReason) {
      order.cancelReason = cancelReason;
    }

    await order.save();
    await order.populate(populateOrder);

    res.json({
      message: '취소 요청이 접수되었습니다. 관리자 승인 후 취소됩니다.',
      order,
    });
  } catch (error) {
    handleOrderError(error, res);
  }
};

// PATCH /api/orders/:id/cancel-request/approve
const approveOrderCancellation = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(populateOrder);

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    if (order.status !== 'cancel_requested') {
      return res.status(400).json({ message: '취소 요청 상태의 주문만 승인할 수 있습니다.' });
    }

    order.status = 'cancelled';
    applyStatusSideEffects(order, 'cancelled');

    await order.save();
    await syncQuoteWithOrderStatus(order);
    await order.populate(populateOrder);

    res.json({
      message: '취소 요청이 승인되어 주문이 취소되었습니다.',
      order,
    });
  } catch (error) {
    handleOrderError(error, res);
  }
};

// PATCH /api/orders/:id/cancel-request/reject
const rejectOrderCancellation = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(populateOrder);

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    if (order.status !== 'cancel_requested') {
      return res.status(400).json({ message: '취소 요청 상태의 주문만 반려할 수 있습니다.' });
    }

    order.status = 'paid';
    order.cancellationRequestedAt = null;
    applyStatusSideEffects(order, 'paid');

    await order.save();
    await order.populate(populateOrder);

    res.json({
      message: '취소 요청이 반려되어 결제완료 상태로 유지됩니다.',
      order,
    });
  } catch (error) {
    handleOrderError(error, res);
  }
};

// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { cartItemIds, contact, payment, memo } = req.body;

    if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      return res.status(400).json({ message: '주문할 장바구니 항목을 선택해 주세요.' });
    }

    const invalidCartItemId = cartItemIds.find(
      (cartItemId) => !mongoose.Types.ObjectId.isValid(cartItemId)
    );

    if (invalidCartItemId) {
      return res.status(400).json({ message: '유효하지 않은 장바구니 항목 ID입니다.' });
    }

    const [user, cart] = await Promise.all([
      User.findById(req.user.userId),
      Cart.findOne({ user: req.user.userId }),
    ]);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: '장바구니가 비어 있습니다.' });
    }

    const selectedItems = cartItemIds.map((cartItemId) => {
      const item = cart.items.id(cartItemId);
      return item ? { cartItemId, item } : null;
    });

    if (selectedItems.some((entry) => entry === null)) {
      return res.status(400).json({ message: '장바구니에서 찾을 수 없는 항목이 있습니다.' });
    }

    const productIds = selectedItems.map((entry) => entry.item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    const missingProduct = productIds.find(
      (productId) => !productMap.has(productId.toString())
    );

    if (missingProduct) {
      return res.status(404).json({ message: '주문할 상품을 찾을 수 없습니다.' });
    }

    const { contact: normalizedContact, error: contactError } = normalizeContact(
      contact,
      user
    );

    if (contactError) {
      return res.status(400).json({ message: contactError });
    }

    const orderItems = selectedItems.map(({ item }) =>
      buildOrderItemFromCartItem(item, productMap.get(item.product.toString()))
    );

    const subtotal = orderItems.reduce((sum, item) => sum + item.pricing.lineTotal, 0);
    const totalAmount = subtotal;

    if (payment?.method && !PAYMENT_METHODS.includes(payment.method)) {
      return res.status(400).json({ message: '유효하지 않은 결제 수단입니다.' });
    }

    const isManualBankTransfer =
      payment?.method === 'bank_transfer' && payment?.manualDeposit === true;

    if (isManualBankTransfer) {
      const depositAccount = getDepositAccountFromEnv();

      if (!depositAccount) {
        return res.status(500).json({
          message: '무통장입금 계좌가 서버에 설정되지 않았습니다. server/.env를 확인해 주세요.',
        });
      }

      const paymentId = payment?.paymentId?.trim() || `manual_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const duplicateOrder = await findDuplicateOrder({ paymentId });

      if (duplicateOrder) {
        return res.status(409).json({
          message: '이미 처리된 주문입니다.',
          orderNumber: duplicateOrder.orderNumber,
        });
      }

      const orderNumber = await generateOrderNumber();
      let order;

      try {
        order = await Order.create({
          orderNumber,
          user: req.user.userId,
          items: orderItems,
          pricing: {
            subtotal,
            totalAmount,
            currency: 'KRW',
            itemCount: orderItems.length,
          },
          status: 'pending',
          contact: normalizedContact,
          payment: {
            method: 'bank_transfer',
            status: 'pending',
            paymentId,
            paidAmount: totalAmount,
            depositAccount,
          },
          memo: memo?.trim(),
        });

        selectedItems.forEach(({ item }) => {
          item.deleteOne();
        });

        await cart.save();
      } catch (persistError) {
        if (order?._id) {
          await Order.findByIdAndDelete(order._id);
        }

        throw persistError;
      }

      const populatedOrder = await Order.findById(order._id).populate(populateOrder);

      return res.status(201).json({
        message: '주문이 접수되었습니다. 안내 계좌로 입금해 주세요.',
        order: populatedOrder,
      });
    }

    const paymentId = payment?.paymentId?.trim();
    const transactionId = payment?.transactionId?.trim();

    if (!paymentId) {
      return res.status(400).json({ message: '결제 ID(paymentId)가 필요합니다.' });
    }

    const duplicateOrder = await findDuplicateOrder({ paymentId, transactionId });

    if (duplicateOrder) {
      return res.status(409).json({
        message: '이미 처리된 결제입니다.',
        orderNumber: duplicateOrder.orderNumber,
      });
    }

    let verifiedPayment;

    try {
      verifiedPayment = await verifyPortonePayment({
        paymentId,
        expectedAmount: totalAmount,
        paymentMethod: payment?.method,
        transactionId,
      });
    } catch (verifyError) {
      if (verifyError instanceof PortonePaymentVerificationError) {
        return res.status(verifyError.statusCode).json({ message: verifyError.message });
      }

      throw verifyError;
    }

    const paidAt = verifiedPayment.paidAt;
    const orderNumber = await generateOrderNumber();
    let order;

    try {
      order = await Order.create({
        orderNumber,
        user: req.user.userId,
        items: orderItems,
        pricing: {
          subtotal,
          totalAmount,
          currency: 'KRW',
          itemCount: orderItems.length,
        },
        status: 'paid',
        contact: normalizedContact,
        payment: {
          method: payment?.method,
          status: 'paid',
          paidAt,
          paymentId: verifiedPayment.paymentId,
          transactionId: verifiedPayment.transactionId,
          paidAmount: verifiedPayment.paidAmount,
        },
        memo: memo?.trim(),
        paidAt,
      });

      selectedItems.forEach(({ item }) => {
        item.deleteOne();
      });

      await cart.save();
    } catch (persistError) {
      if (order?._id) {
        await Order.findByIdAndDelete(order._id);
      }

      throw persistError;
    }

    const populatedOrder = await Order.findById(order._id).populate(populateOrder);

    res.status(201).json({
      message: '주문이 완료되었습니다.',
      order: populatedOrder,
    });
  } catch (error) {
    handleOrderError(error, res);
  }
};

// GET /api/orders
const getOrders = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaginationQuery(req.query);
    const filter = buildOrderFilter(req);

    const [orders, totalItems] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(populateOrder),
      Order.countDocuments(filter),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    if (totalPages > 0 && page > totalPages) {
      return res.status(400).json({ message: '유효하지 않은 페이지 번호입니다.' });
    }

    res.json({
      orders,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    handleOrderError(error, res);
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await findOrderForUser(req.params.id, req.user);

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    res.json({ order });
  } catch (error) {
    handleOrderError(error, res);
  }
};

// PUT /api/orders/:id
const updateOrder = async (req, res) => {
  try {
    const order = await findOrderForUser(req.params.id, req.user);

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    const adminUser = isAdmin(req.user);
    const { status, memo, contact, cancelReason, payment } = req.body;

    if (status !== undefined) {
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ message: '유효하지 않은 주문 상태입니다.' });
      }

      if (!adminUser) {
        return res.status(403).json({ message: '주문 상태 변경 권한이 없습니다.' });
      }

      order.status = status;
      applyStatusSideEffects(order, status);

      if (status === 'refunded' && order.payment) {
        order.payment.status = 'refunded';
      }
    }

    if (memo !== undefined) {
      if (!adminUser) {
        return res.status(403).json({ message: '요청사항 수정 권한이 없습니다.' });
      }

      order.memo = memo.trim();
    }

    if (contact !== undefined) {
      if (!adminUser) {
        return res.status(403).json({ message: '연락처 수정 권한이 없습니다.' });
      }

      const { contact: normalizedContact, error: contactError } = normalizeContact(
        contact,
        null
      );

      if (contactError) {
        return res.status(400).json({ message: contactError });
      }

      order.contact = normalizedContact;
    }

    if (cancelReason !== undefined) {
      order.cancelReason = cancelReason.trim();

      if (order.status === 'cancelled' && !order.cancelledAt) {
        order.cancelledAt = new Date();
      }
    }

    if (payment !== undefined) {
      if (!adminUser) {
        return res.status(403).json({ message: '결제 정보 수정 권한이 없습니다.' });
      }

      if (payment.method !== undefined) {
        if (payment.method && !PAYMENT_METHODS.includes(payment.method)) {
          return res.status(400).json({ message: '유효하지 않은 결제 수단입니다.' });
        }

        order.payment.method = payment.method;
      }

      if (payment.transactionId !== undefined) {
        order.payment.transactionId = payment.transactionId?.trim();
      }
    }

    if (
      status === undefined &&
      memo === undefined &&
      contact === undefined &&
      cancelReason === undefined &&
      payment === undefined
    ) {
      return res.status(400).json({ message: '수정할 정보가 없습니다.' });
    }

    await order.save();

    await syncQuoteWithOrderStatus(order);

    await order.populate(populateOrder);

    res.json({
      message: '주문이 수정되었습니다.',
      order,
    });
  } catch (error) {
    handleOrderError(error, res);
  }
};

// DELETE /api/orders/:id
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    res.json({
      message: '주문이 삭제되었습니다.',
      order,
    });
  } catch (error) {
    handleOrderError(error, res);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  requestOrderCancellation,
  approveOrderCancellation,
  rejectOrderCancellation,
};
