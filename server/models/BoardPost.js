const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BOARD_CATEGORIES = ['notice', 'inquiry'];
const INQUIRY_STATUSES = ['pending', 'answered'];

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 5000;
const MAX_REPLY_LENGTH = 5000;
const MAX_AUTHOR_NAME_LENGTH = 50;
const MIN_INQUIRY_PASSWORD_LENGTH = 4;
const SALT_ROUNDS = 10;

const boardPostSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: BOARD_CATEGORIES,
      required: [true, '게시판 카테고리는 필수입니다.'],
      index: true,
    },
    title: {
      type: String,
      required: [true, '제목은 필수입니다.'],
      trim: true,
      maxlength: [MAX_TITLE_LENGTH, `제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해 주세요.`],
    },
    content: {
      type: String,
      required: [true, '내용은 필수입니다.'],
      trim: true,
      maxlength: [MAX_CONTENT_LENGTH, `내용은 ${MAX_CONTENT_LENGTH}자 이하로 입력해 주세요.`],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    authorName: {
      type: String,
      trim: true,
      maxlength: [MAX_AUTHOR_NAME_LENGTH, `작성자 이름은 ${MAX_AUTHOR_NAME_LENGTH}자 이하로 입력해 주세요.`],
    },
    password: {
      type: String,
      select: false,
    },
    isImportant: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: INQUIRY_STATUSES,
      default: 'pending',
    },
    reply: {
      type: String,
      trim: true,
      maxlength: [MAX_REPLY_LENGTH, `답변은 ${MAX_REPLY_LENGTH}자 이하로 입력해 주세요.`],
    },
    repliedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

boardPostSchema.index({ category: 1, createdAt: -1 });
boardPostSchema.index({ category: 1, isImportant: -1, createdAt: -1 });

boardPostSchema.pre('save', async function hashInquiryPassword(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  if (this.password.startsWith('$2')) {
    return next();
  }

  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    return next();
  } catch (error) {
    return next(error);
  }
});

const BoardPost = mongoose.model('BoardPost', boardPostSchema);

module.exports = BoardPost;
module.exports.BOARD_CATEGORIES = BOARD_CATEGORIES;
module.exports.INQUIRY_STATUSES = INQUIRY_STATUSES;
module.exports.MAX_TITLE_LENGTH = MAX_TITLE_LENGTH;
module.exports.MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH;
module.exports.MAX_REPLY_LENGTH = MAX_REPLY_LENGTH;
module.exports.MAX_AUTHOR_NAME_LENGTH = MAX_AUTHOR_NAME_LENGTH;
module.exports.MIN_INQUIRY_PASSWORD_LENGTH = MIN_INQUIRY_PASSWORD_LENGTH;
