const mongoose = require('mongoose');
const crypto = require('crypto');

const QUOTE_STATUSES = ['sent', 'paid', 'expired', 'cancelled'];

const DEFAULT_EXPIRES_DAYS = 7;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;
const QUOTE_PLACEHOLDER_THUMBNAIL = '/images/jeju.png';

const quoteSchema = new mongoose.Schema(
  {
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, '상담 문의 정보는 필수입니다.'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '견적 작성자 정보는 필수입니다.'],
    },
    title: {
      type: String,
      required: [true, '견적 제목은 필수입니다.'],
      trim: true,
      maxlength: [MAX_TITLE_LENGTH, `견적 제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해 주세요.`],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [MAX_DESCRIPTION_LENGTH, `견적 설명은 ${MAX_DESCRIPTION_LENGTH}자 이하로 입력해 주세요.`],
    },
    totalAmount: {
      type: Number,
      required: [true, '견적 금액은 필수입니다.'],
      min: [1, '견적 금액은 1원 이상이어야 합니다.'],
    },
    status: {
      type: String,
      enum: {
        values: QUOTE_STATUSES,
        message: '{VALUE}는 유효한 견적 상태가 아닙니다.',
      },
      default: 'sent',
      index: true,
    },
    payToken: {
      type: String,
      required: [true, '결제 토큰은 필수입니다.'],
      unique: true,
      trim: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, '견적 만료일은 필수입니다.'],
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
  },
  {
    timestamps: true,
  }
);

quoteSchema.index({ user: 1, createdAt: -1 });
quoteSchema.index({ contact: 1, createdAt: -1 });

const generatePayToken = () => crypto.randomBytes(24).toString('hex');

const Quote = mongoose.model('Quote', quoteSchema);

module.exports = Quote;
module.exports.QUOTE_STATUSES = QUOTE_STATUSES;
module.exports.DEFAULT_EXPIRES_DAYS = DEFAULT_EXPIRES_DAYS;
module.exports.MAX_TITLE_LENGTH = MAX_TITLE_LENGTH;
module.exports.MAX_DESCRIPTION_LENGTH = MAX_DESCRIPTION_LENGTH;
module.exports.QUOTE_PLACEHOLDER_THUMBNAIL = QUOTE_PLACEHOLDER_THUMBNAIL;
module.exports.generatePayToken = generatePayToken;
