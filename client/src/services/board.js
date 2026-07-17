import { apiFetch } from '@/services/api'

export function getBoardPosts({ category, page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({
    category,
    page: String(page),
    limit: String(limit),
  })

  return apiFetch(`/api/board?${params.toString()}`)
}

export function incrementBoardPostView(postId, viewerId) {
  return apiFetch(`/api/board/${postId}/view`, {
    method: 'POST',
    body: JSON.stringify({ viewerId }),
  })
}

export function unlockBoardPost(postId, { password, viewerId } = {}) {
  return apiFetch(`/api/board/${postId}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ password, viewerId }),
  })
}

export function createBoardPost(postData) {
  return apiFetch('/api/board', {
    method: 'POST',
    body: JSON.stringify(postData),
  })
}

export function createInquiry({ title, content, authorName, password }) {
  return createBoardPost({ category: 'inquiry', title, content, authorName, password })
}

export function createNotice({ title, content, isImportant }) {
  return createBoardPost({ category: 'notice', title, content, isImportant })
}

export function deleteBoardPost(postId, { password } = {}) {
  return apiFetch(`/api/board/${postId}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
}

export function updateInquiryReply(postId, reply) {
  return apiFetch(`/api/board/${postId}`, {
    method: 'PUT',
    body: JSON.stringify({ reply }),
  })
}

export function updateNotice(postId, { title, content, isImportant }) {
  return apiFetch(`/api/board/${postId}`, {
    method: 'PUT',
    body: JSON.stringify({ title, content, isImportant }),
  })
}

export function updateInquiry(postId, { title, content, password }) {
  return apiFetch(`/api/board/${postId}`, {
    method: 'PUT',
    body: JSON.stringify({ title, content, password }),
  })
}
