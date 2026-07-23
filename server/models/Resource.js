const mongoose = require('mongoose');

const RESOURCE_STATUSES = ['기획중', '진행중', '검토중', '수정요청', '완료'];
const RESOURCE_DEPARTMENTS = ['대행사', '브랜드', '외국인', '디자인'];

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 10000;
const MAX_RESOURCE_FILES = 10;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_COMMENT_LENGTH = 2000;

const resourceCommentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '댓글 작성자 정보는 필수입니다.'],
    },
    content: {
      type: String,
      required: [true, '댓글 내용은 필수입니다.'],
      trim: true,
      maxlength: [MAX_COMMENT_LENGTH, `댓글은 ${MAX_COMMENT_LENGTH}자 이하로 입력해 주세요.`],
    },
  },
  {
    timestamps: true,
  }
);

const resourceFileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, '파일 이름은 필수입니다.'],
      trim: true,
      maxlength: [MAX_FILE_NAME_LENGTH, `파일 이름은 ${MAX_FILE_NAME_LENGTH}자 이하로 입력해 주세요.`],
    },
    url: {
      type: String,
      required: [true, '파일 URL은 필수입니다.'],
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    size: {
      type: Number,
      min: [0, '파일 크기는 0 이상이어야 합니다.'],
    },
  },
  {
    timestamps: true,
  }
);

const resourceSchema = new mongoose.Schema(
  {
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
    status: {
      type: String,
      required: [true, '진행상황은 필수입니다.'],
      enum: {
        values: RESOURCE_STATUSES,
        message: '{VALUE}는 유효한 진행상황이 아닙니다.',
      },
      default: '기획중',
      index: true,
    },
    statusChangedAt: {
      type: Date,
      default: Date.now,
    },
    department: {
      type: String,
      required: [true, '담당부서는 필수입니다.'],
      enum: {
        values: RESOURCE_DEPARTMENTS,
        message: '{VALUE}는 유효한 담당부서가 아닙니다.',
      },
      index: true,
    },
    files: {
      type: [resourceFileSchema],
      required: [true, '첨부 파일은 필수입니다.'],
      validate: {
        validator: (files) =>
          Array.isArray(files) && files.length >= 1 && files.length <= MAX_RESOURCE_FILES,
        message: `첨부 파일은 1개 이상 ${MAX_RESOURCE_FILES}개 이하로 등록해 주세요.`,
      },
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '담당자는 필수입니다.'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '등록자 정보는 필수입니다.'],
      index: true,
    },
    comments: {
      type: [resourceCommentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

resourceSchema.index({ createdAt: -1 });
resourceSchema.index({ status: 1, createdAt: -1 });
resourceSchema.index({ department: 1, createdAt: -1 });
resourceSchema.index({ assignee: 1, status: 1, createdAt: -1 });
resourceSchema.index({ createdBy: 1, createdAt: -1 });

resourceSchema.pre('save', function updateStatusChangedAt(next) {
  if (this.isModified('status')) {
    this.statusChangedAt = new Date();
  }

  next();
});

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;
module.exports.RESOURCE_STATUSES = RESOURCE_STATUSES;
module.exports.RESOURCE_DEPARTMENTS = RESOURCE_DEPARTMENTS;
module.exports.MAX_TITLE_LENGTH = MAX_TITLE_LENGTH;
module.exports.MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH;
module.exports.MAX_RESOURCE_FILES = MAX_RESOURCE_FILES;
module.exports.MAX_FILE_NAME_LENGTH = MAX_FILE_NAME_LENGTH;
module.exports.MAX_COMMENT_LENGTH = MAX_COMMENT_LENGTH;
