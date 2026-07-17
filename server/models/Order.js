const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'pending',
  'paid',
  'cancel_requested',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'refunded',
];

const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const PAYMENT_METHODS = ['card', 'bank_transfer', 'kakao_pay', 'naver_pay'];

const CURRENCIES = ['KRW'];

// 주문 항목별 구매 당시 가격 스냅샷
const orderItemPricingSchema = new mongoose.Schema(
  {
    // 구매 당시 1인 금액 (장바구니 unitPrice 복사)
    unitPrice: {
      type: Number,
      required: [true, '구매 당시 1인 금액은 필수입니다.'],
      min: [0, '1인 금액은 0 이상이어야 합니다.'],
    },
    // 구매 당시 인원 수
    headcount: {
      type: Number,
      required: [true, '구매 당시 인원 수는 필수입니다.'],
      min: [1, '인원 수는 1 이상이어야 합니다.'],
    },
    // 구매 당시 항목 금액 (unitPrice × headcount)
    lineTotal: {
      type: Number,
      required: [true, '구매 당시 항목 금액은 필수입니다.'],
      min: [0, '항목 금액은 0 이상이어야 합니다.'],
    },
    // 구매 당시 상품 등록가 (Product.price 스냅샷)
    productPrice: {
      type: Number,
      min: [0, '상품 등록가는 0 이상이어야 합니다.'],
    },
  },
  { _id: false }
);

// 주문에 포함된 개별 상품 항목 스키마
const orderItemSchema = new mongoose.Schema(
  {
    // 원본 상품 참조 (견적 주문은 비워 둘 수 있음)
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    // 주문 시점 SKU 스냅샷
    productSku: {
      type: String,
      required: [true, 'SKU 스냅샷은 필수입니다.'],
      trim: true,
      uppercase: true,
    },
    // 주문 시점 상품명 스냅샷
    productName: {
      type: String,
      required: [true, '상품명 스냅샷은 필수입니다.'],
      trim: true,
      maxlength: [120, '상품명은 120자 이하로 입력해 주세요.'],
    },
    // 주문 시점 썸네일 URL 스냅샷
    thumbnail: {
      type: String,
      required: [true, '썸네일 스냅샷은 필수입니다.'],
      trim: true,
    },
    // 주문 시점 장소 스냅샷
    location: {
      type: String,
      trim: true,
      maxlength: [200, '장소는 200자 이하로 입력해 주세요.'],
    },
    // 구매 당시 가격 정보
    pricing: {
      type: orderItemPricingSchema,
      required: [true, '구매 당시 가격 정보는 필수입니다.'],
    },
    // 어떤 장바구니 항목에서 생성됐는지 추적 (선택)
    cartItemId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

// 주문 전체 구매 당시 금액 스냅샷
const orderPricingSchema = new mongoose.Schema(
  {
    // 모든 항목 lineTotal 합계
    subtotal: {
      type: Number,
      required: [true, '구매 당시 소계는 필수입니다.'],
      min: [0, '소계는 0 이상이어야 합니다.'],
    },
    // 실제 결제 금액
    totalAmount: {
      type: Number,
      required: [true, '구매 당시 결제 금액은 필수입니다.'],
      min: [0, '결제 금액은 0 이상이어야 합니다.'],
    },
    currency: {
      type: String,
      required: [true, '통화는 필수입니다.'],
      enum: {
        values: CURRENCIES,
        message: '{VALUE}는 지원하지 않는 통화입니다.',
      },
      default: 'KRW',
    },
    // 주문 상품 종류 수
    itemCount: {
      type: Number,
      required: [true, '주문 상품 수는 필수입니다.'],
      min: [1, '주문 상품은 1개 이상이어야 합니다.'],
    },
  },
  { _id: false }
);

const depositAccountSchema = new mongoose.Schema(
  {
    bank: {
      type: String,
      required: [true, '입금 은행명은 필수입니다.'],
      trim: true,
    },
    accountNumber: {
      type: String,
      required: [true, '입금 계좌번호는 필수입니다.'],
      trim: true,
    },
    accountHolder: {
      type: String,
      required: [true, '예금주명은 필수입니다.'],
      trim: true,
    },
  },
  { _id: false }
);

// 결제 정보 (주문에 embedded)
const orderPaymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: '{VALUE}는 유효한 결제 수단이 아닙니다.',
      },
    },
    status: {
      type: String,
      required: [true, '결제 상태는 필수입니다.'],
      enum: {
        values: PAYMENT_STATUSES,
        message: '{VALUE}는 유효한 결제 상태가 아닙니다.',
      },
      default: 'paid',
    },
    paidAt: {
      type: Date,
    },
    depositAccount: {
      type: depositAccountSchema,
    },
    // PG사 거래 ID (추후 연동용)
    transactionId: {
      type: String,
      trim: true,
    },
    // 포트원 V2 결제 ID (가맹점 채번)
    paymentId: {
      type: String,
      trim: true,
    },
    // 실제 결제된 금액 (PG 대조용)
    paidAmount: {
      type: Number,
      required: [true, '결제 금액은 필수입니다.'],
      min: [0, '결제 금액은 0 이상이어야 합니다.'],
    },
  },
  { _id: false }
);

// 주문자 연락처 스냅샷
const orderContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, '주문자 이름은 필수입니다.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, '주문자 이메일은 필수입니다.'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // 사람이 읽는 주문번호 (예: ORD-20260712-0001)
    orderNumber: {
      type: String,
      required: [true, '주문번호는 필수입니다.'],
      unique: true,
      trim: true,
    },
    // 주문한 사용자
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '사용자 정보는 필수입니다.'],
      index: true,
    },
    // 주문 상품 목록
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: '주문 상품은 1개 이상이어야 합니다.',
      },
    },
    // 주문 전체 구매 당시 금액
    pricing: {
      type: orderPricingSchema,
      required: [true, '구매 당시 금액 정보는 필수입니다.'],
    },
    // 주문 상태 (무통장입금 대기: pending, 기본값: 결제완료)
    status: {
      type: String,
      required: [true, '주문 상태는 필수입니다.'],
      enum: {
        values: ORDER_STATUSES,
        message: '{VALUE}는 유효한 주문 상태가 아닙니다.',
      },
      default: 'paid',
      index: true,
    },
    // 주문자 연락처 스냅샷
    contact: {
      type: orderContactSchema,
      required: [true, '주문자 연락처는 필수입니다.'],
    },
    // 결제 정보
    payment: {
      type: orderPaymentSchema,
      required: [true, '결제 정보는 필수입니다.'],
    },
    // 고객 요청사항
    memo: {
      type: String,
      trim: true,
      maxlength: [500, '요청사항은 500자 이하로 입력해 주세요.'],
    },
    // 주문 전체 결제 완료 시각 (조회 편의)
    paidAt: {
      type: Date,
    },
    // 관리자 확인 시각
    confirmedAt: {
      type: Date,
    },
    // 취소 시각
    cancelledAt: {
      type: Date,
    },
    // 고객 취소 요청 시각
    cancellationRequestedAt: {
      type: Date,
    },
    // 취소 사유
    cancelReason: {
      type: String,
      trim: true,
      maxlength: [300, '취소 사유는 300자 이하로 입력해 주세요.'],
    },
    // 견적 주문 출처
    source: {
      type: String,
      enum: ['cart', 'quote'],
      default: 'cart',
      index: true,
    },
    // 연결된 견적
    quote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.paymentId': 1 }, { unique: true, sparse: true });
orderSchema.index({ 'payment.transactionId': 1 }, { unique: true, sparse: true });

orderSchema.pre('validate', function validateOrderPricing(next) {
  if (!this.items?.length || !this.pricing) {
    return next();
  }

  if (this.source !== 'quote') {
    this.items.forEach((item, index) => {
      if (!item.product) {
        this.invalidate(`items.${index}.product`, '상품 정보는 필수입니다.');
      }
    });
  }

  const calculatedSubtotal = this.items.reduce(
    (sum, item) => sum + (item.pricing?.lineTotal ?? 0),
    0
  );

  if (this.pricing.subtotal !== calculatedSubtotal) {
    this.invalidate(
      'pricing.subtotal',
      '소계는 모든 항목 금액의 합과 일치해야 합니다.'
    );
  }

  if (this.pricing.itemCount !== this.items.length) {
    this.invalidate(
      'pricing.itemCount',
      '주문 상품 수는 항목 개수와 일치해야 합니다.'
    );
  }

  if (this.pricing.totalAmount < this.pricing.subtotal) {
    this.invalidate(
      'pricing.totalAmount',
      '결제 금액은 소계보다 작을 수 없습니다.'
    );
  }

  if (this.payment?.paidAmount !== undefined && this.pricing?.totalAmount !== undefined) {
    if (this.payment.paidAmount !== this.pricing.totalAmount) {
      this.invalidate(
        'payment.paidAmount',
        '결제 금액은 주문 총액과 일치해야 합니다.'
      );
    }
  }

  if (this.payment?.status === 'paid' && !this.payment?.paidAt) {
    this.invalidate('payment.paidAt', '결제 완료 시각은 필수입니다.');
  }

  if (
    this.payment?.method === 'bank_transfer'
    && this.payment?.status === 'pending'
    && !this.payment?.depositAccount
  ) {
    this.invalidate('payment.depositAccount', '무통장입금 주문에는 입금 계좌 정보가 필요합니다.');
  }

  this.items.forEach((item, index) => {
    const expectedLineTotal = item.pricing.unitPrice * item.pricing.headcount;

    if (item.pricing.lineTotal !== expectedLineTotal) {
      this.invalidate(
        `items.${index}.pricing.lineTotal`,
        '항목 금액은 1인 금액 × 인원 수와 일치해야 합니다.'
      );
    }
  });

  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.CURRENCIES = CURRENCIES;
