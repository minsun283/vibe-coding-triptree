const mongoose = require('mongoose');

// 장바구니에 담긴 개별 상품 항목 스키마
const cartItemSchema = new mongoose.Schema(
  {
    // 담은 상품 (Product 컬렉션 참조)
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, '상품 정보는 필수입니다.'],
    },
    // 선택한 인원 수 (결제 금액 = unitPrice × headcount)
    headcount: {
      type: Number,
      required: [true, '인원 수는 필수입니다.'],
      min: [1, '인원 수는 1 이상이어야 합니다.'],
    },
    // 담을 당시의 1인 금액 (상품 가격 변경 시에도 기존 장바구니 금액 유지)
    unitPrice: {
      type: Number,
      required: [true, '1인 금액은 필수입니다.'],
      min: [0, '1인 금액은 0 이상이어야 합니다.'],
    },
  },
  {
    _id: true, // 항목별 수정·삭제를 위한 고유 ID
    timestamps: true, // 항목 추가·수정 시각
  }
);

// 사용자별 장바구니 스키마 (로그인 사용자 1명당 장바구니 1개)
const cartSchema = new mongoose.Schema(
  {
    // 장바구니 소유 사용자 (User 컬렉션 참조, 중복 불가)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '사용자 정보는 필수입니다.'],
      unique: true,
    },
    // 장바구니에 담긴 상품 목록
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true, // 장바구니 생성·수정 시각
  }
);

// 장바구니 전체 결제 예상 금액 (모든 항목의 1인 금액 × 인원 합계)
cartSchema.virtual('totalAmount').get(function getTotalAmount() {
  return this.items.reduce(
    (sum, item) => sum + item.unitPrice * item.headcount,
    0
  );
});

// API 응답(JSON) 및 객체 변환 시 virtual 필드(totalAmount) 포함
cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
