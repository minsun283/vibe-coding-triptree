const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const { MAX_REVIEW_IMAGES } = require('../models/Review');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const REVIEWABLE_ORDER_STATUSES = ['paid', 'confirmed', 'in_progress', 'completed'];

const populateReview = [
  { path: 'user', select: 'name' },
  { path: 'product', select: 'name thumbnail sku location price' },
  { path: 'quote', select: 'title description totalAmount' },
  { path: 'order', select: 'orderNumber status source' },
];

const handleReviewError = (error, res) => {
  if (error.name === 'CastError') {
    return res.status(400).json({ message: '유효하지 않은 ID입니다.' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: '이미 해당 주문 상품에 후기를 작성했습니다.' });
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

const isReviewOwner = (review, reqUser) =>
  review.user?.toString?.() === reqUser.userId
  || review.user?._id?.toString?.() === reqUser.userId;

const normalizeImages = (images) => {
  if (images === undefined) {
    return undefined;
  }

  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image, index) => ({
      url: typeof image === 'string' ? image.trim() : image?.url?.trim(),
      order: typeof image?.order === 'number' ? image.order : index,
    }))
    .filter((image) => image.url)
    .slice(0, MAX_REVIEW_IMAGES);
};

const validateReviewPayload = ({ title, content, images }) => {
  if (!title?.trim()) {
    return '후기 제목은 필수입니다.';
  }

  if (!content?.trim()) {
    return '후기 내용은 필수입니다.';
  }

  if (images !== undefined && !Array.isArray(images)) {
    return '후기 사진 형식이 올바르지 않습니다.';
  }

  if (Array.isArray(images) && images.length > MAX_REVIEW_IMAGES) {
    return `후기 사진은 최대 ${MAX_REVIEW_IMAGES}장까지 첨부할 수 있습니다.`;
  }

  return '';
};

const verifyPurchasedOrderItem = async ({ userId, orderId, orderItemId, productId }) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return { error: '유효하지 않은 주문 ID입니다.' };
  }

  if (!mongoose.Types.ObjectId.isValid(orderItemId)) {
    return { error: '유효하지 않은 주문 항목 ID입니다.' };
  }

  const order = await Order.findOne({
    _id: orderId,
    user: userId,
  });

  if (!order) {
    return { error: '주문을 찾을 수 없거나 작성 권한이 없습니다.' };
  }

  if (!REVIEWABLE_ORDER_STATUSES.includes(order.status)) {
    return { error: '후기를 작성할 수 없는 주문 상태입니다.' };
  }

  const orderItem = order.items.id(orderItemId);

  if (!orderItem) {
    return { error: '주문에서 해당 상품 항목을 찾을 수 없습니다.' };
  }

  const isQuoteItem = orderItem.productSku === 'QUOTE' || order.source === 'quote';

  if (isQuoteItem) {
    if (orderItem.productSku !== 'QUOTE') {
      return { error: '견적 주문 항목 정보가 올바르지 않습니다.' };
    }

    if (productId) {
      return { error: '견적 주문 후기에는 상품 ID를 보낼 수 없습니다.' };
    }

    if (!order.quote) {
      return { error: '견적 정보를 찾을 수 없습니다.' };
    }

    return { order, orderItem, product: null, quote: order.quote };
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return { error: '유효하지 않은 상품 ID입니다.' };
  }

  if (!orderItem.product) {
    return { error: '주문 항목에 상품 정보가 없습니다.' };
  }

  if (orderItem.product.toString() !== productId) {
    return { error: '선택한 상품과 주문 항목이 일치하지 않습니다.' };
  }

  const product = await Product.findById(productId);

  if (!product) {
    return { error: '상품을 찾을 수 없습니다.' };
  }

  return { order, orderItem, product };
};

const findReviewById = async (reviewId) =>
  Review.findById(reviewId).populate(populateReview);

// POST /api/reviews
const createReview = async (req, res) => {
  try {
    const {
      product: productId,
      order: orderId,
      orderItem: orderItemId,
      title,
      content,
      images,
    } = req.body;

    const validationError = validateReviewPayload({ title, content, images });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const purchaseCheck = await verifyPurchasedOrderItem({
      userId: req.user.userId,
      orderId,
      orderItemId,
      productId,
    });

    if (purchaseCheck.error) {
      return res.status(400).json({ message: purchaseCheck.error });
    }

    const review = await Review.create({
      user: req.user.userId,
      ...(purchaseCheck.quote
        ? { quote: purchaseCheck.quote }
        : { product: productId }),
      order: orderId,
      orderItem: orderItemId,
      title: title.trim(),
      content: content.trim(),
      images: normalizeImages(images) ?? [],
    });

    const populatedReview = await Review.findById(review._id).populate(populateReview);

    res.status(201).json({
      message: '후기가 등록되었습니다.',
      review: populatedReview,
    });
  } catch (error) {
    handleReviewError(error, res);
  }
};

// GET /api/reviews
const getReviews = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaginationQuery(req.query);
    const filter = {};

    if (req.query.product) {
      if (!mongoose.Types.ObjectId.isValid(req.query.product)) {
        return res.status(400).json({ message: '유효하지 않은 상품 ID입니다.' });
      }

      filter.product = req.query.product;
    }

    if (req.query.mine === 'true') {
      if (!req.user) {
        return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
      }

      filter.user = req.user.userId;
    } else if (req.query.user) {
      if (!req.user || !isAdmin(req.user)) {
        return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
      }

      if (!mongoose.Types.ObjectId.isValid(req.query.user)) {
        return res.status(400).json({ message: '유효하지 않은 사용자 ID입니다.' });
      }

      filter.user = req.query.user;
    }

    const [reviews, totalItems] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(populateReview),
      Review.countDocuments(filter),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    if (totalPages > 0 && page > totalPages) {
      return res.status(400).json({ message: '유효하지 않은 페이지 번호입니다.' });
    }

    res.json({
      reviews,
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
    handleReviewError(error, res);
  }
};

// GET /api/reviews/:id
const getReviewById = async (req, res) => {
  try {
    const review = await findReviewById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: '후기를 찾을 수 없습니다.' });
    }

    res.json({ review });
  } catch (error) {
    handleReviewError(error, res);
  }
};

// PUT /api/reviews/:id
const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: '후기를 찾을 수 없습니다.' });
    }

    if (!isReviewOwner(review, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ message: '후기 수정 권한이 없습니다.' });
    }

    const { title, content, images } = req.body;
    const hasTitle = title !== undefined;
    const hasContent = content !== undefined;
    const hasImages = images !== undefined;

    if (!hasTitle && !hasContent && !hasImages) {
      return res.status(400).json({ message: '수정할 정보가 없습니다.' });
    }

    const nextTitle = hasTitle ? title.trim() : review.title;
    const nextContent = hasContent ? content.trim() : review.content;
    const nextImages = hasImages ? normalizeImages(images) ?? [] : review.images;

    const validationError = validateReviewPayload({
      title: nextTitle,
      content: nextContent,
      images: nextImages,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    review.title = nextTitle;
    review.content = nextContent;
    review.images = nextImages;

    await review.save();
    await review.populate(populateReview);

    res.json({
      message: '후기가 수정되었습니다.',
      review,
    });
  } catch (error) {
    handleReviewError(error, res);
  }
};

// DELETE /api/reviews/:id
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: '후기를 찾을 수 없습니다.' });
    }

    if (!isReviewOwner(review, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ message: '후기 삭제 권한이 없습니다.' });
    }

    await review.deleteOne();

    res.json({ message: '후기가 삭제되었습니다.' });
  } catch (error) {
    handleReviewError(error, res);
  }
};

module.exports = {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
};
