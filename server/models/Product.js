const mongoose = require('mongoose');

const RECOMMENDED_SEASONS = ['봄', '여름', '가을', '겨울'];
const GROUP_TYPES = ['기업', '학교', '공공기관', '동호회', '기타'];
const PRODUCT_TYPES = ['스포츠강습', '워크샵', '여행', '기타'];
const PRODUCT_CATEGORIES = ['추천상품', 'NEW', 'BEST', '여름엔 여기!', '골프여행'];
const DATE_TYPES = ['상시', '기간'];

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [8, 'SKU는 8자 이하로 입력해 주세요.'],
      validate: {
        validator: (value) => /^[A-Z0-9]+$/.test(value),
        message: 'SKU는 영문 대문자와 숫자만 사용할 수 있습니다.',
      },
    },
    name: {
      type: String,
      required: [true, '상품 이름은 필수입니다.'],
      trim: true,
      maxlength: [120, '상품 이름은 120자 이하로 입력해 주세요.'],
    },
    thumbnail: {
      type: String,
      required: [true, '썸네일 이미지 URL은 필수입니다.'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, '상품 가격은 필수입니다.'],
      min: [0, '상품 가격은 0 이상이어야 합니다.'],
    },
    dateType: {
      type: String,
      required: [true, '날짜 유형은 필수입니다.'],
      enum: {
        values: DATE_TYPES,
        message: '{VALUE}는 유효한 날짜 유형이 아닙니다.',
      },
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      required: [true, '장소는 필수입니다.'],
      trim: true,
      maxlength: [200, '장소는 200자 이하로 입력해 주세요.'],
    },
    recommendedSeason: {
      type: [String],
      required: [true, '추천 계절은 필수입니다.'],
      validate: {
        validator: (values) =>
          Array.isArray(values) &&
          values.length > 0 &&
          values.every((value) => RECOMMENDED_SEASONS.includes(value)),
        message: '추천 계절을 하나 이상 선택해 주세요.',
      },
    },
    groupType: {
      type: [String],
      default: [],
      validate: {
        validator: (values) =>
          Array.isArray(values) &&
          values.every((value) => GROUP_TYPES.includes(value)),
        message: '유효하지 않은 단체 유형입니다.',
      },
    },
    productType: {
      type: [String],
      required: [true, '상품 유형은 필수입니다.'],
      validate: {
        validator: (values) =>
          Array.isArray(values) &&
          values.length > 0 &&
          values.every((value) => PRODUCT_TYPES.includes(value)),
        message: '상품 유형을 하나 이상 선택해 주세요.',
      },
    },
    productCategory: {
      type: [String],
      default: [],
      validate: {
        validator: (values) =>
          Array.isArray(values) &&
          values.every((value) => PRODUCT_CATEGORIES.includes(value)),
        message: '유효하지 않은 상품분류입니다.',
      },
    },
    image: {
      type: String,
      required: [true, '이미지 URL은 필수입니다.'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, '상품 설명은 필수입니다.'],
      trim: true,
      maxlength: [2000, '상품 설명은 2000자 이하로 입력해 주세요.'],
    },
  },
  {
    timestamps: true,
  }
);

productSchema.pre('validate', function validateDatePeriod(next) {
  if (this.dateType === '기간') {
    if (!this.startDate || !this.endDate) {
      this.invalidate('startDate', '기간 입력 시 시작일과 종료일은 필수입니다.');
      return next();
    }

    if (this.endDate < this.startDate) {
      this.invalidate('endDate', '종료일은 시작일 이후여야 합니다.');
      return next();
    }
  } else if (this.dateType === '상시') {
    this.startDate = null;
    this.endDate = null;
  }

  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
module.exports.RECOMMENDED_SEASONS = RECOMMENDED_SEASONS;
module.exports.GROUP_TYPES = GROUP_TYPES;
module.exports.PRODUCT_TYPES = PRODUCT_TYPES;
module.exports.PRODUCT_CATEGORIES = PRODUCT_CATEGORIES;
module.exports.DATE_TYPES = DATE_TYPES;
