const mongoose = require('mongoose');

const GROUP_TYPES = ['기업', '학교', '공공기관', '동호회', '기타'];

const EXPECTED_HEADCOUNTS = ['50명이하', '100명이하', '200명이상'];

const PROGRAM_TYPES = ['워크샵', '여행', '체육대회', '사내행사', '단체강습'];

const MAX_CUSTOMER_NAME_LENGTH = 50;
const MAX_PHONE_LENGTH = 20;
const MAX_EMAIL_LENGTH = 100;
const MAX_MEMO_LENGTH = 1000;
const MAX_ADMIN_COMMENT_LENGTH = 2000;

const contactSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    customerName: {
      type: String,
      required: [true, '이름은 필수입니다.'],
      trim: true,
      maxlength: [MAX_CUSTOMER_NAME_LENGTH, `이름은 ${MAX_CUSTOMER_NAME_LENGTH}자 이하로 입력해 주세요.`],
    },
    phone: {
      type: String,
      required: [true, '연락처는 필수입니다.'],
      trim: true,
      maxlength: [MAX_PHONE_LENGTH, `연락처는 ${MAX_PHONE_LENGTH}자 이하로 입력해 주세요.`],
    },
    email: {
      type: String,
      required: [true, '이메일은 필수입니다.'],
      trim: true,
      lowercase: true,
      maxlength: [MAX_EMAIL_LENGTH, `이메일은 ${MAX_EMAIL_LENGTH}자 이하로 입력해 주세요.`],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '유효한 이메일 형식이 아닙니다.'],
    },
    groupType: {
      type: String,
      required: [true, '단체 유형은 필수입니다.'],
      enum: {
        values: GROUP_TYPES,
        message: '{VALUE}는 유효한 단체 유형이 아닙니다.',
      },
    },
    expectedHeadcount: {
      type: String,
      required: [true, '예상 인원은 필수입니다.'],
      enum: {
        values: EXPECTED_HEADCOUNTS,
        message: '{VALUE}는 유효한 예상 인원이 아닙니다.',
      },
    },
    preferredDate: {
      type: Date,
      default: null,
    },
    preferredEndDate: {
      type: Date,
      default: null,
    },
    programType: {
      type: String,
      required: [true, '단체 프로그램은 필수입니다.'],
      enum: {
        values: PROGRAM_TYPES,
        message: '{VALUE}는 유효한 단체 프로그램이 아닙니다.',
      },
    },
    memo: {
      type: String,
      trim: true,
      maxlength: [MAX_MEMO_LENGTH, `메모는 ${MAX_MEMO_LENGTH}자 이하로 입력해 주세요.`],
    },
    adminComment: {
      type: String,
      trim: true,
      maxlength: [MAX_ADMIN_COMMENT_LENGTH, `코멘트는 ${MAX_ADMIN_COMMENT_LENGTH}자 이하로 입력해 주세요.`],
    },
    adminCommentedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

contactSchema.index({ createdAt: -1 });
contactSchema.index({ user: 1, createdAt: -1 });
contactSchema.index({ groupType: 1, createdAt: -1 });
contactSchema.index({ programType: 1, createdAt: -1 });

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
module.exports.GROUP_TYPES = GROUP_TYPES;
module.exports.EXPECTED_HEADCOUNTS = EXPECTED_HEADCOUNTS;
module.exports.PROGRAM_TYPES = PROGRAM_TYPES;
module.exports.MAX_CUSTOMER_NAME_LENGTH = MAX_CUSTOMER_NAME_LENGTH;
module.exports.MAX_PHONE_LENGTH = MAX_PHONE_LENGTH;
module.exports.MAX_EMAIL_LENGTH = MAX_EMAIL_LENGTH;
module.exports.MAX_MEMO_LENGTH = MAX_MEMO_LENGTH;
module.exports.MAX_ADMIN_COMMENT_LENGTH = MAX_ADMIN_COMMENT_LENGTH;
