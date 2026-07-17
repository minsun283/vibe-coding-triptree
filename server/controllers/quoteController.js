const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const Order = require('../models/Order');
const Quote = require('../models/Quote');
const User = require('../models/User');
const {
  DEFAULT_EXPIRES_DAYS,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  QUOTE_PLACEHOLDER_THUMBNAIL,
  generatePayToken,
} = require('../models/Quote');
const { PAYMENT_METHODS } = require('../models/Order');
const {
  verifyPortonePayment,
  PortonePaymentVerificationError,
} = require('../services/portoneService');
const {
  QUOTE_ISSUED_SMS_TEXT,
  sendQuoteIssuedSms,
} = require('../services/solapiService');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const populateQuote = [
  { path: 'contact', select: 'customerName phone email groupType programType preferredDate preferredEndDate user' },
  { path: 'user', select: 'name email' },
  { path: 'order', select: 'orderNumber status' },
  { path: 'createdBy', select: 'name' },
];

const handleQuoteError = (error, res) => {
  if (error.name === 'CastError') {
    return res.status(400).json({ message: '유효하지 않은 ID입니다.' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: '이미 처리된 견적입니다.' });
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

const getDepositAccountFromEnv = () => {
  const bank = process.env.BANK_ACCOUNT_BANK?.trim();
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER?.trim();
  const accountHolder = process.env.BANK_ACCOUNT_HOLDER?.trim();

  if (!bank || !accountNumber || !accountHolder) {
    return null;
  }

  return { bank, accountNumber, accountHolder };
};

const generateOrderNumber = async () => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${today}-`;
  const count = await Order.countDocuments({
    orderNumber: { $regex: `^${prefix}` },
  });

  return `${prefix}${String(count + 1).padStart(4, '0')}`;
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

const buildOrderItemFromQuote = (quote, contactDoc) => ({
  productSku: 'QUOTE',
  productName: quote.title,
  thumbnail: QUOTE_PLACEHOLDER_THUMBNAIL,
  location: contactDoc.programType,
  pricing: {
    unitPrice: quote.totalAmount,
    headcount: 1,
    lineTotal: quote.totalAmount,
  },
});

const buildOrderContactFromQuote = (quote, contactDoc, user) => ({
  name: contactDoc.customerName,
  email: (contactDoc.email || user.email).toLowerCase(),
  phone: contactDoc.phone,
  address: user.address || '',
});

const isQuoteExpired = (quote) => quote.expiresAt && quote.expiresAt.getTime() < Date.now();

const serializeQuote = (quote, { includePayUrl = false } = {}) => {
  const plainQuote = typeof quote.toObject === 'function' ? quote.toObject() : { ...quote };

  if (includePayUrl && plainQuote.payToken) {
    plainQuote.payUrl = `/quotes/pay/${plainQuote.payToken}`;
  }

  return plainQuote;
};

const findQuoteByToken = (token) => {
  if (!token?.trim()) {
    return null;
  }

  return Quote.findOne({ payToken: token.trim() }).populate(populateQuote);
};

const assertQuotePayable = (quote) => {
  if (!quote) {
    return { error: '견적을 찾을 수 없습니다.', statusCode: 404 };
  }

  if (quote.status === 'paid') {
    return { error: '이미 결제가 완료된 견적입니다.', statusCode: 409 };
  }

  if (quote.status === 'cancelled') {
    return { error: '취소된 견적입니다.', statusCode: 410 };
  }

  if (isQuoteExpired(quote)) {
    return { error: '만료된 견적입니다.', statusCode: 410 };
  }

  if (quote.status !== 'sent') {
    return { error: '결제할 수 없는 견적 상태입니다.', statusCode: 400 };
  }

  if (quote.order) {
    return { error: '이미 결제 진행 중이거나 완료된 견적입니다.', statusCode: 409 };
  }

  return { quote };
};

const canAccessQuote = (quote, reqUser) => {
  if (isAdmin(reqUser)) {
    return true;
  }

  const userId = reqUser?.userId;

  if (!userId) {
    return false;
  }

  if (quote.user?.toString?.() === userId || quote.user?._id?.toString?.() === userId) {
    return true;
  }

  if (quote.contact?.user?.toString?.() === userId || quote.contact?.user?._id?.toString?.() === userId) {
    return true;
  }

  return false;
};

// POST /api/quotes
const createQuote = async (req, res) => {
  try {
    const { contactId, title, description, totalAmount, expiresInDays } = req.body;

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({ message: '유효하지 않은 상담 문의 ID입니다.' });
    }

    const contact = await Contact.findById(contactId);

    if (!contact) {
      return res.status(404).json({ message: '상담 문의를 찾을 수 없습니다.' });
    }

    const trimmedTitle = title?.trim() || `${contact.programType} 견적`;

    if (!trimmedTitle) {
      return res.status(400).json({ message: '견적 제목은 필수입니다.' });
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ message: `견적 제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해 주세요.` });
    }

    const amount = Number(totalAmount);

    if (Number.isNaN(amount) || amount < 1) {
      return res.status(400).json({ message: '견적 금액은 1원 이상이어야 합니다.' });
    }

    const trimmedDescription = description?.trim() || '';

    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({ message: `견적 설명은 ${MAX_DESCRIPTION_LENGTH}자 이하로 입력해 주세요.` });
    }

    const safeExpiresInDays = Number.parseInt(expiresInDays, 10);
    const days = Number.isNaN(safeExpiresInDays) || safeExpiresInDays < 1
      ? DEFAULT_EXPIRES_DAYS
      : Math.min(safeExpiresInDays, 30);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const quote = await Quote.create({
      contact: contact._id,
      user: contact.user || undefined,
      createdBy: req.user.userId,
      title: trimmedTitle,
      description: trimmedDescription || undefined,
      totalAmount: amount,
      status: 'sent',
      payToken: generatePayToken(),
      expiresAt,
      sentAt: new Date(),
    });

    const populatedQuote = await Quote.findById(quote._id).populate(populateQuote);

    let smsNotification = {
      sent: false,
      skipped: true,
      reason: '문자 알림을 발송하지 않았습니다.',
    };

    try {
      smsNotification = await sendQuoteIssuedSms({
        phone: contact.phone,
        text: QUOTE_ISSUED_SMS_TEXT,
      });
    } catch (smsError) {
      console.error('견적 발행 SMS 발송 실패:', smsError);
      smsNotification = {
        sent: false,
        skipped: false,
        reason: smsError.message,
      };
    }

    const responseMessage = smsNotification.sent
      ? '견적이 발행되었습니다. 고객에게 문자 알림을 발송했습니다.'
      : smsNotification.skipped
        ? '견적이 발행되었습니다. (SOLAPI 미설정으로 문자 알림은 발송되지 않았습니다.)'
        : `견적이 발행되었습니다. (문자 알림 발송 실패: ${smsNotification.reason})`;

    res.status(201).json({
      message: responseMessage,
      quote: serializeQuote(populatedQuote, { includePayUrl: true }),
      smsNotification,
    });
  } catch (error) {
    handleQuoteError(error, res);
  }
};

// GET /api/quotes
const getQuotes = async (req, res) => {
  try {
    const isMine = req.query.mine === 'true';
    const filter = {};

    if (isMine) {
      if (!req.user) {
        return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
      }

      const userContacts = await Contact.find({ user: req.user.userId }).select('_id');
      const contactIds = userContacts.map((contact) => contact._id);

      filter.$or = [{ user: req.user.userId }, { contact: { $in: contactIds } }];
    } else if (!isAdmin(req.user)) {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }

    if (req.query.contactId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.contactId)) {
        return res.status(400).json({ message: '유효하지 않은 상담 문의 ID입니다.' });
      }

      filter.contact = req.query.contactId;
    }

    const { page, limit, skip } = parsePaginationQuery(req.query);

    const [quotes, totalItems] = await Promise.all([
      Quote.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(populateQuote),
      Quote.countDocuments(filter),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    res.json({
      quotes: quotes.map((quote) => serializeQuote(quote, { includePayUrl: isAdmin(req.user) || isMine })),
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
    handleQuoteError(error, res);
  }
};

// GET /api/quotes/pay/:token
const getQuoteByToken = async (req, res) => {
  try {
    const quote = await findQuoteByToken(req.params.token);
    const { quote: payableQuote, error, statusCode } = assertQuotePayable(quote);

    if (error) {
      if (quote && (quote.status === 'paid' || isQuoteExpired(quote))) {
        return res.status(statusCode).json({
          message: error,
          quote: serializeQuote(quote),
        });
      }

      return res.status(statusCode).json({ message: error });
    }

    res.json({
      quote: {
        _id: payableQuote._id,
        title: payableQuote.title,
        description: payableQuote.description,
        totalAmount: payableQuote.totalAmount,
        status: payableQuote.status,
        expiresAt: payableQuote.expiresAt,
        contact: payableQuote.contact
          ? {
              customerName: payableQuote.contact.customerName,
              programType: payableQuote.contact.programType,
              groupType: payableQuote.contact.groupType,
              expectedHeadcount: payableQuote.contact.expectedHeadcount,
              preferredDate: payableQuote.contact.preferredDate,
              preferredEndDate: payableQuote.contact.preferredEndDate,
            }
          : null,
      },
    });
  } catch (error) {
    handleQuoteError(error, res);
  }
};

// POST /api/quotes/pay/:token
const payQuote = async (req, res) => {
  try {
    const quote = await findQuoteByToken(req.params.token);
    const { quote: payableQuote, error, statusCode } = assertQuotePayable(quote);

    if (error) {
      return res.status(statusCode).json({ message: error });
    }

    const [contactDoc, user] = await Promise.all([
      Contact.findById(payableQuote.contact?._id || payableQuote.contact),
      User.findById(req.user.userId),
    ]);

    if (!contactDoc) {
      return res.status(404).json({ message: '상담 문의를 찾을 수 없습니다.' });
    }

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const { payment, memo } = req.body;
    const totalAmount = payableQuote.totalAmount;
    const orderItem = buildOrderItemFromQuote(payableQuote, contactDoc);
    const orderContact = buildOrderContactFromQuote(payableQuote, contactDoc, user);

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
      const order = await Order.create({
        orderNumber,
        user: req.user.userId,
        items: [orderItem],
        pricing: {
          subtotal: totalAmount,
          totalAmount,
          currency: 'KRW',
          itemCount: 1,
        },
        status: 'pending',
        source: 'quote',
        quote: payableQuote._id,
        contact: orderContact,
        payment: {
          method: 'bank_transfer',
          status: 'pending',
          paymentId,
          paidAmount: totalAmount,
          depositAccount,
        },
        memo: memo?.trim() || payableQuote.description,
      });

      payableQuote.order = order._id;

      if (!payableQuote.user) {
        payableQuote.user = req.user.userId;
      }

      if (!contactDoc.user) {
        contactDoc.user = req.user.userId;
      }

      await Promise.all([payableQuote.save(), contactDoc.save()]);

      const populatedOrder = await Order.findById(order._id).populate([
        { path: 'user', select: 'name email' },
      ]);

      return res.status(201).json({
        message: '주문이 접수되었습니다. 안내 계좌로 입금해 주세요.',
        order: populatedOrder,
        quote: serializeQuote(payableQuote),
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
    const order = await Order.create({
      orderNumber,
      user: req.user.userId,
      items: [orderItem],
      pricing: {
        subtotal: totalAmount,
        totalAmount,
        currency: 'KRW',
        itemCount: 1,
      },
      status: 'paid',
      source: 'quote',
      quote: payableQuote._id,
      contact: orderContact,
      payment: {
        method: payment?.method,
        status: 'paid',
        paidAt,
        paymentId: verifiedPayment.paymentId,
        transactionId: verifiedPayment.transactionId,
        paidAmount: verifiedPayment.paidAmount,
      },
      memo: memo?.trim() || payableQuote.description,
      paidAt,
    });

    payableQuote.status = 'paid';
    payableQuote.paidAt = paidAt;
    payableQuote.order = order._id;

    if (!payableQuote.user) {
      payableQuote.user = req.user.userId;
    }

    if (!contactDoc.user) {
      contactDoc.user = req.user.userId;
    }

    await Promise.all([payableQuote.save(), contactDoc.save()]);

    const populatedOrder = await Order.findById(order._id).populate([
      { path: 'user', select: 'name email' },
    ]);

    res.status(201).json({
      message: '견적 결제가 완료되었습니다.',
      order: populatedOrder,
      quote: serializeQuote(payableQuote),
    });
  } catch (error) {
    handleQuoteError(error, res);
  }
};

module.exports = {
  createQuote,
  getQuotes,
  getQuoteByToken,
  payQuote,
};
