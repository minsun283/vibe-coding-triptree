const mongoose = require('mongoose');

const MAX_REVIEW_IMAGES = 5;
const MAX_REVIEW_TITLE_LENGTH = 100;
const MAX_REVIEW_CONTENT_LENGTH = 2000;

const reviewImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, '후기 이미지 URL은 필수입니다.'],
      trim: true,
    },
    order: {
      type: Number,
      min: [0, '이미지 순서는 0 이상이어야 합니다.'],
      default: 0,
    },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    // 후기 작성자
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '작성자 정보는 필수입니다.'],
      index: true,
    },
    // 후기 대상 상품 (견적 주문 후기는 비워 둘 수 있음)
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      index: true,
    },
    // 견적 주문 후기용 견적 참조
    quote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      index: true,
    },
    // 구매 이력 확인용 주문 (구매한 상품에만 후기 작성)
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, '주문 정보는 필수입니다.'],
      index: true,
    },
    // 주문 내 특정 항목 (동일 상품 중복 구매 시 구분)
    orderItem: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, '주문 항목 정보는 필수입니다.'],
    },
    // 후기 제목
    title: {
      type: String,
      required: [true, '후기 제목은 필수입니다.'],
      trim: true,
      maxlength: [MAX_REVIEW_TITLE_LENGTH, `후기 제목은 ${MAX_REVIEW_TITLE_LENGTH}자 이하로 입력해 주세요.`],
    },
    // 후기 내용
    content: {
      type: String,
      required: [true, '후기 내용은 필수입니다.'],
      trim: true,
      maxlength: [MAX_REVIEW_CONTENT_LENGTH, `후기 내용은 ${MAX_REVIEW_CONTENT_LENGTH}자 이하로 입력해 주세요.`],
    },
    // 사진 첨부 (Cloudinary 등 URL 저장)
    images: {
      type: [reviewImageSchema],
      default: [],
      validate: {
        validator: (images) => Array.isArray(images) && images.length <= MAX_REVIEW_IMAGES,
        message: `후기 사진은 최대 ${MAX_REVIEW_IMAGES}장까지 첨부할 수 있습니다.`,
      },
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ user: 1, orderItem: 1 }, { unique: true });

reviewSchema.pre('validate', function validateReviewTarget(next) {
  if (!this.product && !this.quote) {
    this.invalidate('product', '후기 대상 정보가 없습니다.');
  }

  if (this.product && this.quote) {
    this.invalidate('product', '후기 대상은 상품 또는 견적 중 하나만 지정할 수 있습니다.');
  }

  next();
});

reviewSchema.pre('validate', function normalizeReviewImages(next) {
  if (!Array.isArray(this.images)) {
    return next();
  }

  this.images = this.images
    .map((image, index) => ({
      url: typeof image === 'string' ? image.trim() : image?.url?.trim(),
      order: typeof image?.order === 'number' ? image.order : index,
    }))
    .filter((image) => image.url);

  next();
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
module.exports.MAX_REVIEW_IMAGES = MAX_REVIEW_IMAGES;
module.exports.MAX_REVIEW_TITLE_LENGTH = MAX_REVIEW_TITLE_LENGTH;
module.exports.MAX_REVIEW_CONTENT_LENGTH = MAX_REVIEW_CONTENT_LENGTH;
