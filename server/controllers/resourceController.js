const Resource = require('../models/Resource');
const User = require('../models/User');

const {
  RESOURCE_STATUSES,
  RESOURCE_DEPARTMENTS,
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_RESOURCE_FILES,
} = require('../models/Resource');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const parsePaginationQuery = (query) => {
  const page = Number.parseInt(query.page, 10);
  const limit = Number.parseInt(query.limit, 10);
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const safeLimit =
    Number.isNaN(limit) || limit < 1 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const handleResourceError = (error, res) => {
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

const normalizeFiles = (files) => {
  if (files === undefined) {
    return undefined;
  }

  if (!Array.isArray(files)) {
    return [];
  }

  return files
    .map((file) => {
      if (typeof file === 'string') {
        return {
          originalName: 'file',
          url: file.trim(),
        };
      }

      return {
        ...(file._id ? { _id: file._id } : {}),
        ...(file.createdAt ? { createdAt: file.createdAt } : {}),
        originalName: (
          file.originalName ||
          file.original_filename ||
          file.name ||
          'file'
        ).trim(),
        url: (file.url || file.secure_url || '').trim(),
        mimeType: file.mimeType || file.format || file.resource_type || undefined,
        size:
          typeof file.size === 'number'
            ? file.size
            : Number.isFinite(Number(file.bytes))
              ? Number(file.bytes)
              : undefined,
      };
    })
    .filter((file) => file.url)
    .slice(0, MAX_RESOURCE_FILES);
};

const buildResourceFilter = (query, { excludeDepartment = false } = {}) => {
  const filter = {};

  if (query.status && RESOURCE_STATUSES.includes(query.status)) {
    filter.status = query.status;
  }

  if (query.assignee) {
    filter.assignee = query.assignee;
  }

  if (
    !excludeDepartment &&
    query.department &&
    RESOURCE_DEPARTMENTS.includes(query.department)
  ) {
    filter.department = query.department;
  }

  const keyword = query.search?.trim();

  if (keyword) {
    filter.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { content: { $regex: keyword, $options: 'i' } },
    ];
  }

  return filter;
};

const getDepartmentCounts = async (baseFilter = {}) => {
  if (baseFilter.status === '완료') {
    const emptyCounts = { all: 0 };

    RESOURCE_DEPARTMENTS.forEach((department) => {
      emptyCounts[department] = 0;
    });

    return emptyCounts;
  }

  const filter = {
    ...baseFilter,
    status: baseFilter.status || { $ne: '완료' },
  };

  const [totalAll, grouped] = await Promise.all([
    Resource.countDocuments(filter),
    Resource.aggregate([
      { $match: filter },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]),
  ]);

  const counts = { all: totalAll };

  RESOURCE_DEPARTMENTS.forEach((department) => {
    counts[department] = 0;
  });

  grouped.forEach(({ _id, count }) => {
    if (_id && Object.prototype.hasOwnProperty.call(counts, _id)) {
      counts[_id] = count;
    }
  });

  return counts;
};

const validateResourcePayload = async (payload, { requireFiles = false } = {}) => {
  const errors = [];

  if (payload.title !== undefined) {
    const title = payload.title?.trim();

    if (!title) {
      errors.push('제목은 필수입니다.');
    } else if (title.length > MAX_TITLE_LENGTH) {
      errors.push(`제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해 주세요.`);
    }
  } else if (requireFiles) {
    errors.push('제목은 필수입니다.');
  }

  if (payload.content !== undefined) {
    const content = payload.content?.trim();

    if (!content) {
      errors.push('내용은 필수입니다.');
    } else if (content.length > MAX_CONTENT_LENGTH) {
      errors.push(`내용은 ${MAX_CONTENT_LENGTH}자 이하로 입력해 주세요.`);
    }
  } else if (requireFiles) {
    errors.push('내용은 필수입니다.');
  }

  if (payload.status !== undefined && !RESOURCE_STATUSES.includes(payload.status)) {
    errors.push('유효하지 않은 진행상황입니다.');
  } else if (requireFiles && !payload.status) {
    errors.push('진행상황은 필수입니다.');
  }

  if (payload.department !== undefined) {
    if (!payload.department) {
      errors.push('담당부서는 필수입니다.');
    } else if (!RESOURCE_DEPARTMENTS.includes(payload.department)) {
      errors.push('유효하지 않은 담당부서입니다.');
    }
  } else if (requireFiles) {
    errors.push('담당부서는 필수입니다.');
  }

  if (payload.assignee !== undefined) {
    if (!payload.assignee) {
      errors.push('담당자는 필수입니다.');
    } else {
      const assignee = await User.findById(payload.assignee).select('_id');

      if (!assignee) {
        errors.push('존재하지 않는 담당자입니다.');
      }
    }
  } else if (requireFiles) {
    errors.push('담당자는 필수입니다.');
  }

  if (payload.files !== undefined) {
    const normalizedFiles = normalizeFiles(payload.files);

    if (normalizedFiles.length === 0) {
      errors.push('첨부 파일은 1개 이상 등록해 주세요.');
    }
  } else if (requireFiles) {
    errors.push('첨부 파일은 1개 이상 등록해 주세요.');
  }

  return errors;
};

const populateResourceQuery = (query) =>
  query
    .populate('assignee', 'name email user_type')
    .populate('createdBy', 'name email user_type')
    .populate('comments.user', 'name email user_type');

// GET /api/resources
const getResources = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaginationQuery(req.query);
    const filter = buildResourceFilter(req.query);
    const countFilter = buildResourceFilter(req.query, { excludeDepartment: true });

    const [resources, totalItems, departmentCounts] = await Promise.all([
      populateResourceQuery(
        Resource.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      ),
      Resource.countDocuments(filter),
      getDepartmentCounts(countFilter),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    res.json({
      resources,
      departmentCounts,
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
    handleResourceError(error, res);
  }
};

// GET /api/resources/:id
const getResourceById = async (req, res) => {
  try {
    const resource = await populateResourceQuery(Resource.findById(req.params.id));

    if (!resource) {
      return res.status(404).json({ message: '자료를 찾을 수 없습니다.' });
    }

    res.json({ resource });
  } catch (error) {
    handleResourceError(error, res);
  }
};

// POST /api/resources
const createResource = async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      content: req.body.content,
      status: req.body.status || '기획중',
      department: req.body.department,
      assignee: req.body.assignee,
      files: req.body.files,
    };

    const errors = await validateResourcePayload(payload, { requireFiles: true });

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(' ') });
    }

    const resource = await Resource.create({
      title: payload.title.trim(),
      content: payload.content.trim(),
      status: payload.status,
      department: payload.department,
      assignee: payload.assignee,
      files: normalizeFiles(payload.files),
      createdBy: req.user.userId,
    });

    const populatedResource = await populateResourceQuery(Resource.findById(resource._id));

    res.status(201).json({ resource: populatedResource });
  } catch (error) {
    handleResourceError(error, res);
  }
};

// PUT /api/resources/:id
const updateResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: '자료를 찾을 수 없습니다.' });
    }

    const payload = {
      title: req.body.title,
      content: req.body.content,
      status: req.body.status,
      department: req.body.department,
      assignee: req.body.assignee,
      files: req.body.files,
    };

    const errors = await validateResourcePayload(payload);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(' ') });
    }

    if (payload.title !== undefined) {
      resource.title = payload.title.trim();
    }

    if (payload.content !== undefined) {
      resource.content = payload.content.trim();
    }

    if (payload.status !== undefined) {
      resource.status = payload.status;
    }

    if (payload.department !== undefined) {
      resource.department = payload.department;
    }

    if (payload.assignee !== undefined) {
      resource.assignee = payload.assignee;
    }

    if (payload.files !== undefined) {
      resource.files = normalizeFiles(payload.files);
    }

    await resource.save();

    const populatedResource = await populateResourceQuery(Resource.findById(resource._id));

    res.json({ resource: populatedResource });
  } catch (error) {
    handleResourceError(error, res);
  }
};

// POST /api/resources/:id/comments
const addResourceComment = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: '자료를 찾을 수 없습니다.' });
    }

    const content = req.body.content?.trim();

    if (!content) {
      return res.status(400).json({ message: '댓글 내용을 입력해 주세요.' });
    }

    resource.comments.push({
      user: req.user.userId,
      content,
    });

    await resource.save();

    const populatedResource = await populateResourceQuery(Resource.findById(resource._id));

    res.status(201).json({ resource: populatedResource });
  } catch (error) {
    handleResourceError(error, res);
  }
};

// DELETE /api/resources/:id
const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: '자료를 찾을 수 없습니다.' });
    }

    await resource.deleteOne();

    res.json({ message: '자료가 삭제되었습니다.' });
  } catch (error) {
    handleResourceError(error, res);
  }
};

const buildContentDisposition = (filename) => {
  const fallback = 'download'
  const safeAscii = (filename || fallback).replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')

  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(filename || fallback)}`;
};

// GET /api/resources/:id/files/:fileId/download
const downloadResourceFile = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: '자료를 찾을 수 없습니다.' });
    }

    const file = resource.files.id(req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: '첨부 파일을 찾을 수 없습니다.' });
    }

    const fileResponse = await fetch(file.url);

    if (!fileResponse.ok) {
      return res.status(502).json({ message: '파일을 불러올 수 없습니다.' });
    }

    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    const contentType =
      fileResponse.headers.get('content-type') || file.mimeType || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', buildContentDisposition(file.originalName));
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    handleResourceError(error, res);
  }
};

module.exports = {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  downloadResourceFile,
  addResourceComment,
};
