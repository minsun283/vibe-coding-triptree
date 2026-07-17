const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const Quote = require('../models/Quote');
const {
  GROUP_TYPES,
  EXPECTED_HEADCOUNTS,
  PROGRAM_TYPES,
  MAX_ADMIN_COMMENT_LENGTH,
} = require('../models/Contact');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const CONTACT_FIELDS = [
  'customerName',
  'phone',
  'email',
  'groupType',
  'expectedHeadcount',
  'preferredDate',
  'preferredEndDate',
  'programType',
  'memo',
];

const REQUIRED_FIELDS = [
  'customerName',
  'phone',
  'email',
  'groupType',
  'expectedHeadcount',
  'programType',
];

const handleContactError = (error, res) => {
  if (error.name === 'CastError') {
    return res.status(400).json({ message: '유효하지 않은 ID입니다.' });
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  console.error(error);
  return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
};

const parsePaginationQuery = (query) => {
  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const safeLimit = Number.isNaN(limit) || limit < 1
    ? DEFAULT_LIMIT
    : Math.min(limit, MAX_LIMIT);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const parseDateValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pickContactFields = (body) => {
  const data = {};

  CONTACT_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      data[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
    }
  });

  return data;
};

const normalizeContactData = (data) => {
  const normalized = { ...data };

  if (normalized.preferredDate !== undefined) {
    normalized.preferredDate = parseDateValue(normalized.preferredDate);
  }

  if (normalized.preferredEndDate !== undefined) {
    normalized.preferredEndDate = parseDateValue(normalized.preferredEndDate);
  }

  if (normalized.preferredDate === null) {
    normalized.preferredEndDate = null;
  }

  if (normalized.preferredDate && !normalized.preferredEndDate) {
    normalized.preferredEndDate = normalized.preferredDate;
  }

  if (normalized.memo === '') {
    normalized.memo = undefined;
  }

  if (normalized.email) {
    normalized.email = normalized.email.toLowerCase();
  }

  return normalized;
};

const getMissingFields = (data) =>
  REQUIRED_FIELDS.filter((field) => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

const validatePreferredDate = (value) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return parseDateValue(value) === null ? '유효하지 않은 날짜 형식입니다.' : '';
};

const validatePreferredDateRange = (startDate, endDate) => {
  const startError = validatePreferredDate(startDate);

  if (startError) {
    return startError;
  }

  const endError = validatePreferredDate(endDate);

  if (endError) {
    return endError;
  }

  if (!startDate || !endDate) {
    return '';
  }

  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);

  if (start && end && end.getTime() < start.getTime()) {
    return '종료일은 시작일 이후여야 합니다.';
  }

  return '';
};

const validateEnumFields = (data) => {
  if (data.groupType !== undefined && !GROUP_TYPES.includes(data.groupType)) {
    return '유효하지 않은 단체 유형입니다.';
  }

  if (data.expectedHeadcount !== undefined && !EXPECTED_HEADCOUNTS.includes(data.expectedHeadcount)) {
    return '유효하지 않은 예상 인원입니다.';
  }

  if (data.programType !== undefined && !PROGRAM_TYPES.includes(data.programType)) {
    return '유효하지 않은 단체 프로그램입니다.';
  }

  return '';
};

const buildListFilter = (query, reqUser) => {
  const filter = {};

  if (query.mine === 'true') {
    if (!reqUser?.userId) {
      return { error: '인증 토큰이 필요합니다.', statusCode: 401 };
    }

    filter.user = reqUser.userId;
    return { filter };
  }

  if (query.groupType) {
    if (!GROUP_TYPES.includes(query.groupType)) {
      return { error: '유효하지 않은 단체 유형입니다.' };
    }

    filter.groupType = query.groupType;
  }

  if (query.expectedHeadcount) {
    if (!EXPECTED_HEADCOUNTS.includes(query.expectedHeadcount)) {
      return { error: '유효하지 않은 예상 인원입니다.' };
    }

    filter.expectedHeadcount = query.expectedHeadcount;
  }

  if (query.programType) {
    if (!PROGRAM_TYPES.includes(query.programType)) {
      return { error: '유효하지 않은 단체 프로그램입니다.' };
    }

    filter.programType = query.programType;
  }

  return { filter };
};

const findContactById = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return Contact.findById(id);
};

const isAdmin = (user) => user?.user_type === 'admin';

const isContactOwner = (contact, user) =>
  Boolean(user?.userId && contact.user?.toString() === user.userId);

const hasBlockingQuote = async (contactId) => {
  const count = await Quote.countDocuments({
    contact: contactId,
    status: { $in: ['sent', 'paid'] },
  });

  return count > 0;
};

const assertContactAccess = (contact, user, { allowAdmin = true } = {}) => {
  if (!contact) {
    return { error: '상담 문의를 찾을 수 없습니다.', statusCode: 404 };
  }

  if (allowAdmin && isAdmin(user)) {
    return { contact };
  }

  if (!isContactOwner(contact, user)) {
    return { error: '수정 권한이 없습니다.', statusCode: 403 };
  }

  return { contact };
};

// POST /api/contacts
const createContact = async (req, res) => {
  try {
    const preferredDateError = validatePreferredDateRange(
      req.body.preferredDate,
      req.body.preferredEndDate
    );

    if (preferredDateError) {
      return res.status(400).json({ message: preferredDateError });
    }

    const data = normalizeContactData(pickContactFields(req.body));
    const missingFields = getMissingFields(data);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `필수 항목을 입력해 주세요: ${missingFields.join(', ')}`,
      });
    }

    const enumError = validateEnumFields(data);

    if (enumError) {
      return res.status(400).json({ message: enumError });
    }

    const contact = await Contact.create({
      ...data,
      ...(req.user?.userId ? { user: req.user.userId } : {}),
    });

    res.status(201).json({
      message: '상담 문의가 접수되었습니다.',
      contact,
    });
  } catch (error) {
    handleContactError(error, res);
  }
};

// GET /api/contacts
const getContacts = async (req, res) => {
  try {
    const isMine = req.query.mine === 'true';

    if (!isMine && req.user?.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }

    const { page, limit, skip } = parsePaginationQuery(req.query);
    const { filter, error, statusCode } = buildListFilter(req.query, req.user);

    if (error) {
      return res.status(statusCode ?? 400).json({ message: error });
    }

    const [contacts, totalItems] = await Promise.all([
      Contact.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Contact.countDocuments(filter),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    if (totalPages > 0 && page > totalPages) {
      return res.status(400).json({ message: '유효하지 않은 페이지 번호입니다.' });
    }

    res.json({
      contacts,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    handleContactError(error, res);
  }
};

// GET /api/contacts/:id
const getContactById = async (req, res) => {
  try {
    const contact = await findContactById(req.params.id);
    const { error, statusCode } = assertContactAccess(contact, req.user);

    if (error) {
      return res.status(statusCode).json({ message: error });
    }

    res.json({ contact });
  } catch (error) {
    handleContactError(error, res);
  }
};

// PUT /api/contacts/:id
const updateContact = async (req, res) => {
  try {
    const contact = await findContactById(req.params.id);
    const { error, statusCode } = assertContactAccess(contact, req.user);

    if (error) {
      return res.status(statusCode).json({ message: error });
    }

    if (!isAdmin(req.user) && (await hasBlockingQuote(contact._id))) {
      return res.status(400).json({
        message: '견적서가 발행되거나 결제가 완료된 요청은 수정할 수 없습니다.',
      });
    }

    const preferredDateError = validatePreferredDateRange(
      req.body.preferredDate,
      req.body.preferredEndDate
    );

    if (preferredDateError) {
      return res.status(400).json({ message: preferredDateError });
    }

    const data = normalizeContactData(pickContactFields(req.body));

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: '수정할 항목이 없습니다.' });
    }

    const enumError = validateEnumFields(data);

    if (enumError) {
      return res.status(400).json({ message: enumError });
    }

    Object.assign(contact, data);
    await contact.save();

    res.json({
      message: '상담 문의가 수정되었습니다.',
      contact,
    });
  } catch (error) {
    handleContactError(error, res);
  }
};

// PATCH /api/contacts/:id/comment
const updateContactComment = async (req, res) => {
  try {
    const contact = await findContactById(req.params.id);

    if (!contact) {
      return res.status(404).json({ message: '상담 문의를 찾을 수 없습니다.' });
    }

    if (req.body.adminComment === undefined) {
      return res.status(400).json({ message: '코멘트 내용을 입력해 주세요.' });
    }

    const trimmedComment =
      typeof req.body.adminComment === 'string' ? req.body.adminComment.trim() : '';

    if (trimmedComment.length > MAX_ADMIN_COMMENT_LENGTH) {
      return res.status(400).json({
        message: `코멘트는 ${MAX_ADMIN_COMMENT_LENGTH}자 이하로 입력해 주세요.`,
      });
    }

    contact.adminComment = trimmedComment || undefined;
    contact.adminCommentedAt = trimmedComment ? new Date() : null;
    await contact.save();

    res.json({
      message: trimmedComment ? '코멘트가 등록되었습니다.' : '코멘트가 삭제되었습니다.',
      contact,
    });
  } catch (error) {
    handleContactError(error, res);
  }
};

// DELETE /api/contacts/:id
const deleteContact = async (req, res) => {
  try {
    const contact = await findContactById(req.params.id);
    const { error, statusCode } = assertContactAccess(contact, req.user);

    if (error) {
      return res.status(statusCode).json({ message: error });
    }

    if (!isAdmin(req.user) && (await hasBlockingQuote(contact._id))) {
      return res.status(400).json({
        message: '견적서가 발행되거나 결제가 완료된 요청은 삭제할 수 없습니다.',
      });
    }

    await Quote.deleteMany({ contact: contact._id });
    await contact.deleteOne();

    res.json({ message: '견적 요청이 삭제되었습니다.' });
  } catch (error) {
    handleContactError(error, res);
  }
};

module.exports = {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  updateContactComment,
  deleteContact,
};
