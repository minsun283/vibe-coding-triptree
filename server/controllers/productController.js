const Product = require('../models/Product');

const PRODUCT_FIELDS = [
  'sku',
  'name',
  'thumbnail',
  'price',
  'dateType',
  'startDate',
  'endDate',
  'location',
  'recommendedSeason',
  'groupType',
  'productType',
  'productCategory',
  'image',
  'description',
];

const BASE_REQUIRED_FIELDS = [
  'sku',
  'name',
  'thumbnail',
  'price',
  'dateType',
  'location',
  'recommendedSeason',
  'productType',
  'image',
  'description',
];

const FIELD_LABELS = {
  sku: 'SKU',
  name: '상품 이름',
  thumbnail: '썸네일 이미지',
  price: '상품 가격',
  dateType: '날짜 유형',
  startDate: '시작일',
  endDate: '종료일',
  location: '장소',
  recommendedSeason: '추천 계절',
  groupType: '단체 유형',
  productType: '상품 유형',
  productCategory: '상품분류',
  image: '이미지',
  description: '상품 설명',
};

const handleProductError = (error, res) => {
  if (error.name === 'CastError') {
    return res.status(400).json({ message: '유효하지 않은 상품 ID입니다.' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: '이미 사용 중인 SKU입니다.' });
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  console.error(error);
  return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
};

const pickProductFields = (body) => {
  const data = {};

  PRODUCT_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      data[field] =
        typeof body[field] === 'string' ? body[field].trim() : body[field];
    }
  });

  return data;
};

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeProductData = (data) => {
  const normalized = { ...data };

  if (normalized.sku) {
    normalized.sku = normalized.sku.toUpperCase();
  }

  if (normalized.price !== undefined) {
    normalized.price = Number(normalized.price);
  }

  if (normalized.recommendedSeason !== undefined) {
    normalized.recommendedSeason = Array.isArray(normalized.recommendedSeason)
      ? [...new Set(normalized.recommendedSeason)]
      : [normalized.recommendedSeason].filter(Boolean);
  }

  if (normalized.groupType !== undefined) {
    normalized.groupType = Array.isArray(normalized.groupType)
      ? [...new Set(normalized.groupType)]
      : [normalized.groupType].filter(Boolean);
  }

  if (normalized.productType !== undefined) {
    normalized.productType = Array.isArray(normalized.productType)
      ? [...new Set(normalized.productType)]
      : [normalized.productType].filter(Boolean);
  }

  if (normalized.productCategory !== undefined) {
    normalized.productCategory = Array.isArray(normalized.productCategory)
      ? [...new Set(normalized.productCategory)]
      : [normalized.productCategory].filter(Boolean);
  }

  if (normalized.dateType === '상시') {
    normalized.startDate = null;
    normalized.endDate = null;
  } else if (normalized.dateType === '기간') {
    normalized.startDate = parseDateValue(normalized.startDate);
    normalized.endDate = parseDateValue(normalized.endDate);
  }

  return normalized;
};

const getMissingFields = (data) =>
  BASE_REQUIRED_FIELDS.filter((field) => {
    if (field === 'recommendedSeason' || field === 'groupType' || field === 'productType') {
      return !Array.isArray(data[field]) || data[field].length === 0;
    }

    const value = data[field];
    return value === undefined || value === null || value === '';
  });

const validateDateFields = (data) => {
  if (data.dateType === '기간') {
    if (!data.startDate || !data.endDate) {
      return '기간 입력 시 시작일과 종료일을 모두 선택해 주세요.';
    }

    if (data.endDate < data.startDate) {
      return '종료일은 시작일 이후여야 합니다.';
    }
  }

  return '';
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 2;
const MAX_LIMIT = 50;

const parsePaginationQuery = (query) => {
  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);

  const safePage = Number.isNaN(page) || page < 1 ? DEFAULT_PAGE : page;
  const safeLimit = Number.isNaN(limit) || limit < 1
    ? DEFAULT_LIMIT
    : Math.min(limit, MAX_LIMIT);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const buildProductFilter = (query) => {
  const filter = {};
  const location = query.location?.trim?.();

  if (location) {
    filter.location = location;
  }

  const category = query.category?.trim?.();

  if (category) {
    filter.productCategory = category;
  }

  const rangeStart = parseDateValue(query.startDate);
  const rangeEnd = parseDateValue(query.endDate);

  if (rangeStart && rangeEnd) {
    const startOfRange = new Date(rangeStart);
    startOfRange.setHours(0, 0, 0, 0);

    const endOfRange = new Date(rangeEnd);
    endOfRange.setHours(23, 59, 59, 999);

    filter.$or = [
      { dateType: '상시' },
      {
        dateType: '기간',
        startDate: { $lte: endOfRange },
        endDate: { $gte: startOfRange },
      },
    ];
  }

  return filter;
};

// GET /api/products
const getProducts = async (req, res) => {
  try {
    if (req.query.all === 'true') {
      const products = await Product.find().sort({ createdAt: -1 });

      return res.json({
        products,
        totalItems: products.length,
      });
    }

    const { page, limit, skip } = parsePaginationQuery(req.query);
    const filter = buildProductFilter(req.query);

    const [products, totalItems] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    if (totalPages > 0 && page > totalPages) {
      return res.status(400).json({ message: '유효하지 않은 페이지 번호입니다.' });
    }

    res.json({
      products,
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
    handleProductError(error, res);
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    res.json(product);
  } catch (error) {
    handleProductError(error, res);
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  try {
    const productData = normalizeProductData(pickProductFields(req.body));
    const missingFields = getMissingFields(productData);

    if (missingFields.length > 0) {
      const labels = missingFields.map((field) => FIELD_LABELS[field] ?? field);
      return res.status(400).json({
        message: `다음 필드는 필수입니다: ${labels.join(', ')}`,
      });
    }

    if (Number.isNaN(productData.price)) {
      return res.status(400).json({ message: '상품 가격은 숫자여야 합니다.' });
    }

    const dateValidationError = validateDateFields(productData);
    if (dateValidationError) {
      return res.status(400).json({ message: dateValidationError });
    }

    const product = await Product.create(productData);

    res.status(201).json({
      message: '상품이 등록되었습니다.',
      product,
    });
  } catch (error) {
    handleProductError(error, res);
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const productData = normalizeProductData(pickProductFields(req.body));

    if (Object.keys(productData).length === 0) {
      return res.status(400).json({ message: '수정할 정보가 없습니다.' });
    }

    if (productData.price !== undefined && Number.isNaN(productData.price)) {
      return res.status(400).json({ message: '상품 가격은 숫자여야 합니다.' });
    }

    if (productData.dateType) {
      const dateValidationError = validateDateFields(productData);
      if (dateValidationError) {
        return res.status(400).json({ message: dateValidationError });
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, productData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    res.json({
      message: '상품이 수정되었습니다.',
      product,
    });
  } catch (error) {
    handleProductError(error, res);
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    res.json({
      message: '상품이 삭제되었습니다.',
      product,
    });
  } catch (error) {
    handleProductError(error, res);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
