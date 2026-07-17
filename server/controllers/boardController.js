const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const BoardPost = require('../models/BoardPost');
const BoardPostView = require('../models/BoardPostView');
const { MIN_INQUIRY_PASSWORD_LENGTH } = require('../models/BoardPost');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const populatePost = [{ path: 'user', select: 'name user_type' }];

const handleBoardError = (error, res) => {
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

const isAdmin = (user) => user?.user_type === 'admin';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getViewerKey = (req) => {
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }

  const viewerId = req.body?.viewerId?.trim?.();

  if (viewerId && UUID_PATTERN.test(viewerId)) {
    return `anon:${viewerId}`;
  }

  return null;
};

const stripPassword = (post) => {
  if (!post) {
    return post;
  }

  const plainPost = typeof post.toObject === 'function' ? post.toObject() : { ...post };
  delete plainPost.password;
  return plainPost;
};

const sanitizePostForResponse = (post, reqUser) => {
  const plainPost = stripPassword(post);

  if (plainPost.category === 'inquiry' && !isAdmin(reqUser)) {
    const { content, reply, repliedAt, ...rest } = plainPost;
    return {
      ...rest,
      isLocked: true,
    };
  }

  return plainPost;
};

const buildListFilter = (query) => {
  const { category } = query;

  if (!category || !['notice', 'inquiry'].includes(category)) {
    return { error: '유효한 카테고리(notice, inquiry)가 필요합니다.' };
  }

  return { filter: { category } };
};

const recordUniqueView = async (post, req) => {
  const viewerKey = getViewerKey(req);

  if (!viewerKey) {
    return post.viewCount;
  }

  const existingView = await BoardPostView.findOne({
    post: post._id,
    viewerKey,
  });

  if (existingView) {
    return post.viewCount;
  }

  try {
    await BoardPostView.create({
      post: post._id,
      viewerKey,
    });
    post.viewCount += 1;
    await post.save();
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }
  }

  return post.viewCount;
};

exports.getPosts = async (req, res) => {
  try {
    const { filter, error } = buildListFilter(req.query);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const { page, limit, skip } = parsePaginationQuery(req.query);
    const sort = filter.category === 'notice'
      ? { isImportant: -1, createdAt: -1 }
      : { createdAt: -1 };

    const [posts, totalItems] = await Promise.all([
      BoardPost.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(populatePost)
        .select('-password')
        .lean(),
      BoardPost.countDocuments(filter),
    ]);

    return res.json({
      posts: posts.map((post) => sanitizePostForResponse(post, req.user)),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    });
  } catch (error) {
    return handleBoardError(error, res);
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await BoardPost.findById(req.params.id)
      .populate(populatePost)
      .select('-password');

    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    if (post.category === 'inquiry' && !isAdmin(req.user)) {
      return res.status(403).json({ message: '비밀번호 확인이 필요합니다.' });
    }

    return res.json({ post: stripPassword(post) });
  } catch (error) {
    return handleBoardError(error, res);
  }
};

exports.unlockPost = async (req, res) => {
  try {
    const post = await BoardPost.findById(req.params.id)
      .populate(populatePost)
      .select('+password');

    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    if (post.category !== 'inquiry') {
      return res.status(400).json({ message: '문의 게시글만 비밀번호 확인이 가능합니다.' });
    }

    if (isAdmin(req.user)) {
      const viewCount = await recordUniqueView(post, req);
      const unlockedPost = stripPassword(post);
      unlockedPost.viewCount = viewCount;
      return res.json({ post: unlockedPost });
    }

    const password = req.body?.password?.trim?.();

    if (!password) {
      return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
    }

    if (!post.password) {
      return res.status(403).json({ message: '비밀번호로 확인할 수 없는 게시글입니다.' });
    }

    const isPasswordValid = await bcrypt.compare(password, post.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    const viewCount = await recordUniqueView(post, req);
    const unlockedPost = stripPassword(post);
    unlockedPost.viewCount = viewCount;

    return res.json({ post: unlockedPost });
  } catch (error) {
    return handleBoardError(error, res);
  }
};

exports.incrementViewCount = async (req, res) => {
  try {
    const post = await BoardPost.findById(req.params.id).populate(populatePost);

    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    if (post.category === 'inquiry' && !isAdmin(req.user)) {
      return res.status(403).json({ message: '비밀번호 확인이 필요합니다.' });
    }

    const viewerKey = getViewerKey(req);

    if (!viewerKey) {
      return res.json({ post: stripPassword(post), alreadyViewed: true });
    }

    const existingView = await BoardPostView.findOne({
      post: post._id,
      viewerKey,
    });

    if (existingView) {
      return res.json({ post: stripPassword(post), alreadyViewed: true });
    }

    try {
      await BoardPostView.create({
        post: post._id,
        viewerKey,
      });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      return res.json({ post: stripPassword(post), alreadyViewed: true });
    }

    post.viewCount += 1;
    await post.save();

    return res.json({ post: stripPassword(post), alreadyViewed: false });
  } catch (error) {
    return handleBoardError(error, res);
  }
};

exports.createPost = async (req, res) => {
  try {
    const { category, title, content, isImportant, authorName, password } = req.body;

    if (!category || !['notice', 'inquiry'].includes(category)) {
      return res.status(400).json({ message: '유효한 카테고리(notice, inquiry)가 필요합니다.' });
    }

    if (!title?.trim()) {
      return res.status(400).json({ message: '제목은 필수입니다.' });
    }

    if (!content?.trim()) {
      return res.status(400).json({ message: '내용은 필수입니다.' });
    }

    if (category === 'notice') {
      if (!isAdmin(req.user)) {
        return res.status(403).json({ message: '공지사항은 관리자만 작성할 수 있습니다.' });
      }

      const post = await BoardPost.create({
        category: 'notice',
        title: title.trim(),
        content: content.trim(),
        user: req.user.userId,
        isImportant: Boolean(isImportant),
      });

      await post.populate(populatePost);
      return res.status(201).json({ post: stripPassword(post) });
    }

    if (!authorName?.trim()) {
      return res.status(400).json({ message: '작성자 이름은 필수입니다.' });
    }

    if (!password?.trim()) {
      return res.status(400).json({ message: '비밀번호는 필수입니다.' });
    }

    if (password.trim().length < MIN_INQUIRY_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `비밀번호는 ${MIN_INQUIRY_PASSWORD_LENGTH}자 이상 입력해 주세요.`,
      });
    }

    const post = await BoardPost.create({
      category: 'inquiry',
      title: title.trim(),
      content: content.trim(),
      authorName: authorName.trim(),
      password: password.trim(),
      user: req.user?.userId,
    });

    await post.populate(populatePost);
    return res.status(201).json({ post: sanitizePostForResponse(post, req.user) });
  } catch (error) {
    return handleBoardError(error, res);
  }
};

exports.updatePost = async (req, res) => {
  try {
    const post = await BoardPost.findById(req.params.id).select('+password');

    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    const { title, content, isImportant, reply } = req.body;

    if (post.category === 'notice') {
      if (!isAdmin(req.user)) {
        return res.status(403).json({ message: '공지사항 수정 권한이 없습니다.' });
      }

      if (title !== undefined) post.title = title.trim();
      if (content !== undefined) post.content = content.trim();
      if (isImportant !== undefined) post.isImportant = Boolean(isImportant);
    } else if (post.category === 'inquiry') {
      if (isAdmin(req.user)) {
        if (reply !== undefined) {
          post.reply = reply.trim();
          post.status = reply.trim() ? 'answered' : 'pending';
          post.repliedAt = reply.trim() ? new Date() : undefined;
        }
      } else {
        const passwordToCheck = password?.trim?.();

        if (!passwordToCheck) {
          return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
        }

        if (!post.password) {
          return res.status(403).json({ message: '비밀번호로 수정할 수 없는 게시글입니다.' });
        }

        const isPasswordValid = await bcrypt.compare(passwordToCheck, post.password);

        if (!isPasswordValid) {
          return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
        }

        if (title !== undefined) {
          if (!title.trim()) {
            return res.status(400).json({ message: '제목은 필수입니다.' });
          }

          post.title = title.trim();
        }

        if (content !== undefined) {
          if (!content.trim()) {
            return res.status(400).json({ message: '내용은 필수입니다.' });
          }

          post.content = content.trim();
        }

        if (title === undefined && content === undefined) {
          return res.status(400).json({ message: '수정할 내용이 없습니다.' });
        }
      }
    }

    await post.save();
    await post.populate(populatePost);
    return res.json({ post: stripPassword(post) });
  } catch (error) {
    return handleBoardError(error, res);
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await BoardPost.findById(req.params.id).select('+password');

    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    if (post.category === 'notice') {
      if (!isAdmin(req.user)) {
        return res.status(403).json({ message: '공지사항 삭제 권한이 없습니다.' });
      }
    } else if (post.category === 'inquiry') {
      if (isAdmin(req.user)) {
        // 관리자는 비밀번호 없이 삭제 가능
      } else {
        const password = req.body?.password?.trim?.();

        if (!password) {
          return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
        }

        if (!post.password) {
          return res.status(403).json({ message: '비밀번호로 삭제할 수 없는 게시글입니다.' });
        }

        const isPasswordValid = await bcrypt.compare(password, post.password);

        if (!isPasswordValid) {
          return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
        }
      }
    }

    await BoardPostView.deleteMany({ post: post._id });
    await post.deleteOne();
    return res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    return handleBoardError(error, res);
  }
};
