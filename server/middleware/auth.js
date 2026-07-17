const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('JWT_SECRET is not defined');
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '토큰이 만료되었습니다.' });
    }

    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user?.user_type !== 'admin') {
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  }

  next();
};

const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('JWT_SECRET is not defined');
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
  } catch {
    // 공개 조회 API에서는 토큰 오류를 무시합니다.
  }

  return next();
};

module.exports = { authenticate, authorizeAdmin, optionalAuthenticate };
