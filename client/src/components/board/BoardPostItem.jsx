import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Eye, Lock, MessageSquareReply, Pencil, Trash2 } from 'lucide-react'
import { deleteBoardPost, incrementBoardPostView, unlockBoardPost, updateInquiry, updateInquiryReply, updateNotice } from '@/services/board'
import {
  clearUnlockedInquiry,
  getMyInquiryPassword,
  getUnlockedInquiry,
  isMyInquiry,
  removeMyInquiry,
  setUnlockedInquiry,
} from '@/utils/boardInquiryUnlock'
import { getBoardViewerId } from '@/utils/boardViewer'
import './BoardPostItem.css'

function formatBoardDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}/${month}/${day}`
}

function getAuthorName(post) {
  if (post.category === 'notice') {
    return '관리자'
  }

  return post.authorName ?? post.user?.name ?? '회원'
}

function BoardPostItem({ post, showStatus = false, isAdmin = false, onDeleted, onUpdated }) {
  const isNotice = post.category === 'notice'
  const isInquiry = post.category === 'inquiry' || showStatus
  const cachedUnlock = isInquiry && !isAdmin ? getUnlockedInquiry(post._id) : null
  const isAuthor = isInquiry && isMyInquiry(post._id)

  const [isExpanded, setIsExpanded] = useState(false)
  const [viewCount, setViewCount] = useState(cachedUnlock?.viewCount ?? post.viewCount ?? 0)
  const [unlockedContent, setUnlockedContent] = useState(cachedUnlock)
  const [password, setPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title ?? '')
  const [editContent, setEditContent] = useState(post.content ?? '')
  const [editIsImportant, setEditIsImportant] = useState(Boolean(post.isImportant))
  const [editPassword, setEditPassword] = useState('')
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [replyDraft, setReplyDraft] = useState(post.reply ?? '')
  const [replyError, setReplyError] = useState('')
  const [replySuccess, setReplySuccess] = useState('')
  const [isReplySubmitting, setIsReplySubmitting] = useState(false)
  const [localReply, setLocalReply] = useState(post.reply ?? '')
  const [localRepliedAt, setLocalRepliedAt] = useState(post.repliedAt)
  const [localStatus, setLocalStatus] = useState(post.status)
  const verifiedPasswordRef = useRef(getMyInquiryPassword(post._id))
  const hasRecordedViewRef = useRef(Boolean(cachedUnlock))
  const detailId = `board-post-${post._id}`

  const hasUnlockedContent = Boolean(unlockedContent?.content ?? cachedUnlock?.content)
  const canManageNotice = isNotice && isAdmin
  const canEditInquiry = isInquiry && !isAdmin && isAuthor && hasUnlockedContent
  const canDeleteInquiry = isInquiry && (isAdmin || hasUnlockedContent)
  const canShowManageSection = canManageNotice || canEditInquiry || canDeleteInquiry

  useEffect(() => {
    setReplyDraft(post.reply ?? '')
    setLocalReply(post.reply ?? '')
    setLocalRepliedAt(post.repliedAt)
    setLocalStatus(post.status)
    setEditTitle(post.title ?? '')
    setEditContent(post.content ?? '')
    setEditIsImportant(Boolean(post.isImportant))
  }, [post.reply, post.repliedAt, post.status, post.title, post.content, post.isImportant])

  const loadNoticeViewCount = async () => {
    if (hasRecordedViewRef.current) {
      return
    }

    try {
      const data = await incrementBoardPostView(post._id, getBoardViewerId())
      setViewCount(data.post?.viewCount ?? viewCount)
      hasRecordedViewRef.current = true
    } catch {
      // 조회수 갱신 실패 시 펼치기는 유지합니다.
    }
  }

  const loadAdminInquiryViewCount = async () => {
    if (hasRecordedViewRef.current) {
      return
    }

    try {
      const data = await incrementBoardPostView(post._id, getBoardViewerId())
      setViewCount(data.post?.viewCount ?? viewCount)
      hasRecordedViewRef.current = true
    } catch (error) {
      // 조회수 갱신 실패 시 펼치기는 유지합니다.
    }
  }

  const toggleExpanded = async () => {
    const nextExpanded = !isExpanded
    setIsExpanded(nextExpanded)
    setUnlockError('')

    if (!nextExpanded) {
      setShowDeleteConfirm(false)
      setShowEditForm(false)
      setEditError('')
      setEditSuccess('')
      return
    }

    if (isInquiry && isAdmin) {
      await loadAdminInquiryViewCount()
      return
    }

    if (isInquiry && !isAdmin && hasUnlockedContent) {
      return
    }

    if (!isInquiry) {
      await loadNoticeViewCount()
    }
  }

  const handleUnlockSubmit = async (event) => {
    event.preventDefault()
    setUnlockError('')

    if (!password.trim()) {
      setUnlockError('비밀번호를 입력해 주세요.')
      return
    }

    setIsUnlocking(true)

    try {
      const data = await unlockBoardPost(post._id, {
        password: password.trim(),
        viewerId: getBoardViewerId(),
      })

      const unlocked = {
        content: data.post.content,
        reply: data.post.reply,
        repliedAt: data.post.repliedAt,
        viewCount: data.post.viewCount,
      }

      setUnlockedContent(unlocked)
      setUnlockedInquiry(post._id, data.post)
      setViewCount(data.post.viewCount ?? viewCount)
      verifiedPasswordRef.current = password.trim()
      setPassword('')
      hasRecordedViewRef.current = true
    } catch (error) {
      setUnlockError(error.message)
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleDeleteClick = () => {
    setDeleteError('')
    setShowEditForm(false)
    setEditError('')
    setEditSuccess('')
    setShowDeleteConfirm(true)

    const savedPassword = verifiedPasswordRef.current || getMyInquiryPassword(post._id)

    if (savedPassword) {
      setDeletePassword(savedPassword)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setDeletePassword('')
    setDeleteError('')
  }

  const handleDeleteSubmit = async (event) => {
    event.preventDefault()
    setDeleteError('')

    if (!window.confirm(
      isNotice
        ? '이 공지사항을 삭제할까요? 삭제 후에는 복구할 수 없습니다.'
        : '이 문의를 삭제할까요? 삭제 후에는 복구할 수 없습니다.'
    )) {
      return
    }

    setIsDeleting(true)

    try {
      if (isAdmin) {
        await deleteBoardPost(post._id)
      } else {
        const passwordToUse =
          deletePassword.trim() || verifiedPasswordRef.current || getMyInquiryPassword(post._id)

        if (!passwordToUse) {
          setDeleteError('비밀번호를 입력해 주세요.')
          setIsDeleting(false)
          return
        }

        await deleteBoardPost(post._id, { password: passwordToUse })
      }

      clearUnlockedInquiry(post._id)
      removeMyInquiry(post._id)
      verifiedPasswordRef.current = ''
      setShowDeleteConfirm(false)
      onDeleted?.()
    } catch (error) {
      setDeleteError(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditClick = () => {
    setDeleteError('')
    setShowDeleteConfirm(false)
    setEditError('')
    setEditSuccess('')
    setEditTitle(post.title ?? '')

    if (canManageNotice) {
      setEditContent(post.content ?? '')
      setEditIsImportant(Boolean(post.isImportant))
      setShowEditForm(true)
      return
    }

    setEditContent(unlockedContent?.content ?? cachedUnlock?.content ?? '')
    setEditPassword(verifiedPasswordRef.current || getMyInquiryPassword(post._id))
    setShowEditForm(true)
  }

  const handleEditCancel = () => {
    setShowEditForm(false)
    setEditPassword('')
    setEditError('')
    setEditSuccess('')
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()
    setEditError('')
    setEditSuccess('')

    if (!editTitle.trim()) {
      setEditError('제목을 입력해 주세요.')
      return
    }

    if (!editContent.trim()) {
      setEditError('내용을 입력해 주세요.')
      return
    }

    setIsEditing(true)

    try {
      if (canManageNotice) {
        await updateNotice(post._id, {
          title: editTitle.trim(),
          content: editContent.trim(),
          isImportant: editIsImportant,
        })

        setShowEditForm(false)
        setEditSuccess('공지사항이 수정되었습니다.')
        onUpdated?.()
        return
      }

      const passwordToUse =
        editPassword.trim() || verifiedPasswordRef.current || getMyInquiryPassword(post._id)

      if (!passwordToUse) {
        setEditError('비밀번호를 입력해 주세요.')
        setIsEditing(false)
        return
      }

      const data = await updateInquiry(post._id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        password: passwordToUse,
      })

      const updatedPost = data.post ?? {}

      setUnlockedContent({
        content: updatedPost.content ?? editContent.trim(),
        reply: updatedPost.reply ?? unlockedContent?.reply,
        repliedAt: updatedPost.repliedAt ?? unlockedContent?.repliedAt,
        viewCount: updatedPost.viewCount ?? viewCount,
      })
      setUnlockedInquiry(post._id, {
        ...updatedPost,
        content: updatedPost.content ?? editContent.trim(),
      })
      verifiedPasswordRef.current = passwordToUse
      setShowEditForm(false)
      setEditPassword('')
      setEditSuccess('문의가 수정되었습니다.')
      onUpdated?.()
    } catch (error) {
      setEditError(error.message)
    } finally {
      setIsEditing(false)
    }
  }

  const handleReplySubmit = async (event) => {
    event.preventDefault()
    setReplyError('')
    setReplySuccess('')

    if (!replyDraft.trim()) {
      setReplyError('답변 내용을 입력해 주세요.')
      return
    }

    setIsReplySubmitting(true)

    try {
      const data = await updateInquiryReply(post._id, replyDraft.trim())
      const updatedPost = data.post ?? {}

      setLocalReply(updatedPost.reply ?? replyDraft.trim())
      setLocalRepliedAt(updatedPost.repliedAt)
      setLocalStatus(updatedPost.status ?? 'answered')
      setReplySuccess(localReply ? '답변이 수정되었습니다.' : '답변이 등록되었습니다.')
      onUpdated?.()
    } catch (error) {
      setReplyError(error.message)
    } finally {
      setIsReplySubmitting(false)
    }
  }

  const displayContent = isInquiry
    ? (isAdmin ? post.content : unlockedContent?.content)
    : post.content

  const displayReply = isInquiry
    ? (isAdmin ? localReply : unlockedContent?.reply)
    : post.reply

  const displayRepliedAt = isInquiry
    ? (isAdmin ? localRepliedAt : unlockedContent?.repliedAt)
    : post.repliedAt

  const displayStatus = isInquiry && isAdmin ? localStatus : post.status

  const renderNoticeEditForm = () => (
    <div className="board-post__actions">
      <form className="board-post__edit-form board-post__edit-form--notice" onSubmit={handleEditSubmit}>
        <p className="board-post__edit-guide">공지사항 내용을 수정할 수 있습니다.</p>

        <label className="board-post__edit-field">
          <span className="board-post__edit-label">제목</span>
          <input
            type="text"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            placeholder="공지 제목을 입력해 주세요"
            maxLength={120}
          />
        </label>

        <label className="board-post__edit-field">
          <span className="board-post__edit-label">내용</span>
          <textarea
            value={editContent}
            onChange={(event) => setEditContent(event.target.value)}
            placeholder="공지 내용을 입력해 주세요"
            rows={5}
            maxLength={5000}
          />
        </label>

        <label className="board-post__edit-checkbox">
          <input
            type="checkbox"
            checked={editIsImportant}
            onChange={(event) => setEditIsImportant(event.target.checked)}
          />
          <span>중요 공지로 표시</span>
        </label>

        {editError && <p className="board-post__unlock-error">{editError}</p>}

        <div className="board-post__edit-actions">
          <button
            type="button"
            className="board-post__edit-cancel-btn"
            onClick={handleEditCancel}
            disabled={isEditing}
          >
            취소
          </button>
          <button
            type="submit"
            className="board-post__edit-submit-btn"
            disabled={isEditing}
          >
            {isEditing ? '수정 중...' : '수정하기'}
          </button>
        </div>
      </form>
    </div>
  )

  const renderInquiryEditForm = () => (
    <div className="board-post__actions">
      <form className="board-post__edit-form" onSubmit={handleEditSubmit}>
        <p className="board-post__edit-guide">수정하려면 작성 시 입력한 비밀번호를 확인합니다.</p>

        <label className="board-post__edit-field">
          <span className="board-post__edit-label">제목</span>
          <input
            type="text"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            placeholder="문의 제목을 입력해 주세요"
            maxLength={120}
          />
        </label>

        <label className="board-post__edit-field">
          <span className="board-post__edit-label">내용</span>
          <textarea
            value={editContent}
            onChange={(event) => setEditContent(event.target.value)}
            placeholder="문의 내용을 입력해 주세요"
            rows={5}
            maxLength={5000}
          />
        </label>

        <label className="board-post__edit-field">
          <span className="board-post__edit-label">비밀번호</span>
          <input
            type="password"
            value={editPassword}
            onChange={(event) => setEditPassword(event.target.value)}
            placeholder="비밀번호 입력"
            autoComplete="current-password"
          />
        </label>

        {editError && <p className="board-post__unlock-error">{editError}</p>}

        <div className="board-post__edit-actions">
          <button
            type="button"
            className="board-post__edit-cancel-btn"
            onClick={handleEditCancel}
            disabled={isEditing}
          >
            취소
          </button>
          <button
            type="submit"
            className="board-post__edit-submit-btn"
            disabled={isEditing}
          >
            {isEditing ? '수정 중...' : '수정하기'}
          </button>
        </div>
      </form>
    </div>
  )

  const renderManageSection = () => {
    if (!canShowManageSection) {
      return null
    }

    if (showEditForm) {
      return canManageNotice ? renderNoticeEditForm() : renderInquiryEditForm()
    }

    if (!showDeleteConfirm) {
      return (
        <div className="board-post__actions">
          {(canManageNotice || canEditInquiry) && (
            <button
              type="button"
              className="board-post__edit-btn"
              onClick={handleEditClick}
            >
              <Pencil size={14} aria-hidden="true" />
              수정
            </button>
          )}
          <button
            type="button"
            className="board-post__delete-btn"
            onClick={handleDeleteClick}
          >
            <Trash2 size={14} aria-hidden="true" />
            삭제
          </button>
        </div>
      )
    }

    return (
      <div className="board-post__actions">
        <form className="board-post__delete-form" onSubmit={handleDeleteSubmit}>
          {!isAdmin && (
            <>
              <p className="board-post__delete-guide">
                삭제하려면 작성 시 입력한 비밀번호를 확인합니다.
              </p>

              <label className="board-post__unlock-field">
                <span className="board-post__unlock-label">비밀번호</span>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  placeholder="비밀번호 입력"
                  autoComplete="current-password"
                />
              </label>
            </>
          )}

          {isAdmin && isNotice && (
            <p className="board-post__delete-guide">관리자 권한으로 이 공지사항을 삭제합니다.</p>
          )}

          {isAdmin && isInquiry && (
            <p className="board-post__delete-guide">관리자 권한으로 이 문의를 삭제합니다.</p>
          )}

          {deleteError && (
            <p className="board-post__unlock-error">{deleteError}</p>
          )}

          <div className="board-post__delete-actions">
            <button
              type="button"
              className="board-post__delete-cancel-btn"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
            >
              취소
            </button>
            <button
              type="submit"
              className="board-post__delete-submit-btn"
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제하기'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <article className={`board-post${isExpanded ? ' is-expanded' : ''}`}>
      <button
        type="button"
        className="board-post__summary"
        aria-expanded={isExpanded}
        aria-controls={detailId}
        onClick={toggleExpanded}
      >
        <div className="board-post__summary-main">
          <div className="board-post__title-row">
            {post.isImportant && (
              <span className="board-post__badge">중요</span>
            )}
            {showStatus && displayStatus === 'answered' && (
              <span className="board-post__badge board-post__badge--answered">답변완료</span>
            )}
            {showStatus && displayStatus === 'pending' && (
              <span className="board-post__badge board-post__badge--pending">답변대기</span>
            )}
            {isInquiry && !isAdmin && (
              <span className="board-post__badge board-post__badge--locked">
                <Lock size={10} aria-hidden="true" />
                비밀글
              </span>
            )}
            <h3 className="board-post__title">{post.title}</h3>
          </div>

          <div className="board-post__meta">
            <span className="board-post__author">{getAuthorName(post)}</span>
            <span className="board-post__date">{formatBoardDate(post.createdAt)}</span>
            <span className="board-post__views">
              <Eye size={14} aria-hidden="true" />
              {viewCount}
            </span>
          </div>
        </div>

        <ChevronDown size={18} className="board-post__chevron" aria-hidden="true" />
      </button>

      {isExpanded && (
        <div className="board-post__detail" id={detailId}>
          {isInquiry && !isAdmin && !hasUnlockedContent ? (
            <form className="board-post__unlock-form" onSubmit={handleUnlockSubmit}>
              <p className="board-post__unlock-guide">
                작성 시 입력한 비밀번호를 입력하면 내용을 확인할 수 있습니다.
              </p>

              <label className="board-post__unlock-field">
                <span className="board-post__unlock-label">비밀번호</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비밀번호 입력"
                  autoComplete="current-password"
                />
              </label>

              {unlockError && (
                <p className="board-post__unlock-error">{unlockError}</p>
              )}

              <button
                type="submit"
                className="board-post__unlock-btn"
                disabled={isUnlocking}
              >
                {isUnlocking ? '확인 중...' : '확인'}
              </button>
            </form>
          ) : (
            <>
              {editSuccess && (
                <p className="board-post__edit-success">{editSuccess}</p>
              )}

              <p className="board-post__content">{displayContent}</p>

              {displayReply && !(isInquiry && isAdmin) && (
                <div className="board-post__reply">
                  <strong className="board-post__reply-label">관리자 답변</strong>
                  <p className="board-post__reply-content">{displayReply}</p>
                  {displayRepliedAt && (
                    <span className="board-post__reply-date">
                      {formatBoardDate(displayRepliedAt)}
                    </span>
                  )}
                </div>
              )}

              {isInquiry && isAdmin && (
                <form className="board-post__reply-form" onSubmit={handleReplySubmit}>
                  <div className="board-post__reply-form-header">
                    <MessageSquareReply size={16} aria-hidden="true" />
                    <strong>{localReply ? '답변 수정' : '답변 작성'}</strong>
                  </div>

                  <label className="board-post__reply-field">
                    <span className="board-post__reply-field-label">관리자 답변</span>
                    <textarea
                      value={replyDraft}
                      onChange={(event) => setReplyDraft(event.target.value)}
                      placeholder="문의에 대한 답변을 입력해 주세요"
                      rows={5}
                      maxLength={5000}
                    />
                  </label>

                  {replyError && (
                    <p className="board-post__reply-error">{replyError}</p>
                  )}

                  {replySuccess && (
                    <p className="board-post__reply-success">{replySuccess}</p>
                  )}

                  <button
                    type="submit"
                    className="board-post__reply-submit-btn"
                    disabled={isReplySubmitting}
                  >
                    {isReplySubmitting ? '등록 중...' : localReply ? '답변 수정' : '답변 등록'}
                  </button>
                </form>
              )}

              {renderManageSection()}
            </>
          )}
        </div>
      )}
    </article>
  )
}

export default BoardPostItem
