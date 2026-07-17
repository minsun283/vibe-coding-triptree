const mongoose = require('mongoose');

const USER_TYPES = ['customer', 'admin'];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      validate: {
        validator: (value) => /^[a-zA-Z가-힣\s]+$/.test(value),
        message: '이름은 한글과 영문만 입력할 수 있습니다.',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    user_type: {
      type: String,
      required: [true, 'User type is required'],
      enum: {
        values: USER_TYPES,
        message: '{VALUE} is not a valid user type',
      },
      default: 'customer',
    },
    address: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.USER_TYPES = USER_TYPES;
