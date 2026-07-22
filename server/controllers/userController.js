const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS);

const formatUser = (user) => {
  // password 필드를 제외한 유저 객체 반환
  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
};

const handleUserError = (error, res) => {
  // Mongoose 에러를 HTTP 상태 코드로 변환
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  console.error(error);
  return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
};

// 전체 유저 목록 조회 (최신순)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(formatUser));
  } catch (error) {
    handleUserError(error, res);
  }
};

// 특정 유저 조회
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(formatUser(user));
  } catch (error) {
    handleUserError(error, res);
  }
};

// 새 유저 생성 (공개 회원가입)
// user_type은 요청 body에서 받지 않습니다. 관리자 승격은 관리자 전용 API(PUT /api/users/:id)에서만 가능합니다.
const createUser = async (req, res) => {
  try {
    const { email, name, password, address } = req.body;

    if (!email?.trim() || !name?.trim() || !password) {
      return res.status(400).json({
        message: '이메일, 이름, 비밀번호는 필수입니다.',
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      email: email.trim(),
      name: name.trim(),
      password: hashedPassword,
      user_type: 'customer',
      address: address?.trim() || undefined,
    });

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      user: formatUser(user),
    });
  } catch (error) {
    handleUserError(error, res);
  }
};

// 유저 정보 수정 (password는 선택)
const updateUser = async (req, res) => {
  try {
    const { email, name, password, user_type, address } = req.body;

    const updates = { email, name, user_type, address };

    if (password) {
      updates.password = await hashPassword(password);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(formatUser(user));
  } catch (error) {
    handleUserError(error, res);
  }
};

// 이메일/비밀번호 로그인
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: '이메일과 비밀번호는 필수입니다.',
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
      '+password'
    );

    if (!user) {
      return res.status(401).json({
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, user_type: user.user_type },
      jwtSecret,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: '로그인에 성공했습니다.',
      token,
      user: formatUser(user),
    });
  } catch (error) {
    handleUserError(error, res);
  }
};

// 토큰으로 현재 로그인한 유저 조회
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: formatUser(user),
    });
  } catch (error) {
    handleUserError(error, res);
  }
};

// 현재 로그인한 유저 정보 수정
const updateCurrentUser = async (req, res) => {
  try {
    const { name, email, address, password, currentPassword } = req.body;

    const user = await User.findById(req.user.userId).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name !== undefined) {
      if (!name?.trim()) {
        return res.status(400).json({ message: '이름은 필수입니다.' });
      }

      user.name = name.trim();
    }

    if (email !== undefined) {
      if (!email?.trim()) {
        return res.status(400).json({ message: '이메일은 필수입니다.' });
      }

      user.email = email.trim().toLowerCase();
    }

    if (address !== undefined) {
      user.address = address.trim();
    }

    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ message: '현재 비밀번호를 입력해 주세요.' });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다.' });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
      }

      user.password = await hashPassword(password);
    }

    await user.save();

    res.json({
      message: '내 정보가 수정되었습니다.',
      user: formatUser(user),
    });
  } catch (error) {
    handleUserError(error, res);
  }
};

// 유저 삭제
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully',
      user: formatUser(user),
    });
  } catch (error) {
    handleUserError(error, res);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
  updateUser,
  deleteUser,
};
