const Cart = require('../models/Cart');
const Product = require('../models/Product');

const populateCart = { path: 'items.product' };

const handleCartError = (error, res) => {
  if (error.name === 'CastError') {
    return res.status(400).json({ message: '유효하지 않은 ID입니다.' });
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  console.error(error);
  return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate(populateCart);

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    cart = await cart.populate(populateCart);
  }

  return cart;
};

const formatCartResponse = (cart) => ({
  cart,
  totalAmount: cart.totalAmount,
  itemCount: cart.items.length,
});

// GET /api/cart/count - 장바구니 아이템 개수 조회
const getCartItemCount = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId });
    const items = cart?.items ?? [];

    res.json({
      itemCount: items.length,
      totalHeadcount: items.reduce((sum, item) => sum + item.headcount, 0),
    });
  } catch (error) {
    handleCartError(error, res);
  }
};

// GET /api/cart
const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.userId);

    res.json(formatCartResponse(cart));
  } catch (error) {
    handleCartError(error, res);
  }
};

// POST /api/cart/items
const addCartItem = async (req, res) => {
  try {
    const { productId, headcount } = req.body;

    if (!productId) {
      return res.status(400).json({ message: '상품 ID는 필수입니다.' });
    }

    const parsedHeadcount = Number.parseInt(headcount, 10);

    if (Number.isNaN(parsedHeadcount) || parsedHeadcount < 1) {
      return res.status(400).json({ message: '인원 수는 1 이상이어야 합니다.' });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    const cart = await getOrCreateCart(req.user.userId);
    const existingItem = cart.items.find((item) => {
      const currentProductId = item.product?._id ?? item.product;
      return currentProductId.toString() === productId;
    });

    if (existingItem) {
      return res.status(409).json({
        message: '이미 장바구니에 담겨있는 상품입니다.',
      });
    }

    cart.items.push({
      product: product._id,
      headcount: parsedHeadcount,
      unitPrice: product.price,
    });

    await cart.save();
    await cart.populate(populateCart);

    res.status(201).json({
      message: '장바구니에 상품이 담겼습니다.',
      ...formatCartResponse(cart),
    });
  } catch (error) {
    handleCartError(error, res);
  }
};

// PUT /api/cart/items/:itemId
const updateCartItem = async (req, res) => {
  try {
    const { headcount } = req.body;
    const parsedHeadcount = Number.parseInt(headcount, 10);

    if (Number.isNaN(parsedHeadcount) || parsedHeadcount < 1) {
      return res.status(400).json({ message: '인원 수는 1 이상이어야 합니다.' });
    }

    const cart = await getOrCreateCart(req.user.userId);
    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: '장바구니 항목을 찾을 수 없습니다.' });
    }

    item.headcount = parsedHeadcount;
    await cart.save();
    await cart.populate(populateCart);

    res.json({
      message: '장바구니 항목이 수정되었습니다.',
      ...formatCartResponse(cart),
    });
  } catch (error) {
    handleCartError(error, res);
  }
};

// DELETE /api/cart/items/:itemId
const removeCartItem = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.userId);
    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: '장바구니 항목을 찾을 수 없습니다.' });
    }

    item.deleteOne();
    await cart.save();
    await cart.populate(populateCart);

    res.json({
      message: '장바구니에서 상품이 삭제되었습니다.',
      ...formatCartResponse(cart),
    });
  } catch (error) {
    handleCartError(error, res);
  }
};

// DELETE /api/cart
const clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.userId);

    cart.items = [];
    await cart.save();
    await cart.populate(populateCart);

    res.json({
      message: '장바구니가 비워졌습니다.',
      ...formatCartResponse(cart),
    });
  } catch (error) {
    handleCartError(error, res);
  }
};

module.exports = {
  getCart,
  getCartItemCount,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
