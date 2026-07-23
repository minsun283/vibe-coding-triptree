import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, MessageSquare, Paperclip, Pencil } from 'lucide-react'
import BoardShell from '@/components/board/BoardShell'
import {
  MAX_COMMENT_LENGTH,
  formatDateTime,
  formatFileSize,
  getDepartmentClassName,
} from '@/constants/resourceData'
import { useAuthUser } from '@/hooks/useAuthUser'
import { addResourceComment, downloadResourceFile, getResourceById } from '@/services/resources'
import '@/pages/HomePage.css'
import '@/pages/BoardPage.css'
import '@/pages/admin/ResourceDetailPage.css'

function getStatusClassName(status) {
  switch (status) {
    case '기획중':
      return 'resource-status--planning'
    case '진행중':
      return 'resource-status--progress'
    case '검토중':
      return 'resource-status--review'
    case '수정요청':
      return 'resource-status--revision'
    case '완료':
      return 'resource-status--done'
    default:
      return 'resource-status--planning'
  }
}

function BoardResourceDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { isAuthChecked, isAdmin } = useAuthUser()
  const [resource, setResource] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingFileId, setDownloadingFileId] = useState(null)
  const [downloadError, setDownloadError] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState('')

  useEffect(() => {
    if (isAuthChecked && !isAdmin) {
      navigate('/board?tab=resources', { replace: true })
    }
  }, [isAuthChecked, isAdmin, navigate])

  useEffect(() => {
    if (!isAuthChecked || !isAdmin || !id) {
      return
    }

    const fetchResource = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await getResourceById(id)
        setResource(data.resource ?? null)
      } catch (fetchError) {
        setResource(null)
        setError(fetchError.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchResource()
  }, [id, isAuthChecked, isAdmin])

  const handleDownload = async (file) => {
    if (!file?._id) {
      setDownloadError('다운로드할 수 없는 파일입니다.')
      return
    }

    setDownloadingFileId(file._id)
    setDownloadError('')

    try {
      await downloadResourceFile(id, file._id, file.originalName)
    } catch (downloadErr) {
      setDownloadError(downloadErr.message)
    } finally {
      setDownloadingFileId(null)
    }
  }

  const handleCommentSubmit = async (event) => {
    event.preventDefault()

    const trimmedContent = commentContent.trim()

    if (!trimmedContent) {
      setCommentError('댓글 내용을 입력해 주세요.')
      return
    }

    setIsSubmittingComment(true)
    setCommentError('')

    try {
      const data = await addResourceComment(id, trimmedContent)
      setResource(data.resource ?? null)
      setCommentContent('')
    } catch (submitError) {
      setCommentError(submitError.message)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const comments = resource?.comments ?? []

  if (!isAuthChecked || !isAdmin) {
    return null
  }

  return (
    <BoardShell activeTab="resources">
      <header className="board-page__header">
        <h1 className="board-page__title">자료실</h1>
      </header>

      <div className="board-page__resource-detail">
        <div className="board-page__resource-detail-topbar">
          <Link to="/board?tab=resources" className="board-page__resource-detail-back">
            <ArrowLeft size={18} aria-hidden="true" />
            목록으로
          </Link>

          {resource && (
            <Link
              to={`/admin/resources/${resource._id}/edit`}
              className="board-page__resource-detail-edit"
            >
              <Pencil size={16} aria-hidden="true" />
              수정
            </Link>
          )}
        </div>

        {isLoading && <p className="resource-detail-message">자료를 불러오는 중...</p>}

        {!isLoading && error && (
          <p className="resource-detail-message resource-detail-message--error" role="alert">
            {error}
          </p>
        )}

        {!isLoading && !error && resource && (
          <article className="resource-detail board-page__resource-detail-card">
            <header className="resource-detail__header">
              <div className="resource-detail__title-wrap">
                <h2 className="resource-detail__title">{resource.title}</h2>
                <span className={`resource-status ${getStatusClassName(resource.status)}`}>
                  {resource.status}
                </span>
              </div>
            </header>

            <dl className="resource-detail__meta">
              <div>
                <dt>담당부서</dt>
                <dd>
                  {resource.department ? (
                    <span
                      className={`resource-department ${getDepartmentClassName(resource.department)}`}
                    >
                      {resource.department}
                    </span>
                  ) : (
                    '-'
                  )}
                </dd>
              </div>
              <div>
                <dt>담당자</dt>
                <dd>{resource.assignee?.name ?? '-'}</dd>
              </div>
              <div>
                <dt>등록자</dt>
                <dd>{resource.createdBy?.name ?? '-'}</dd>
              </div>
              <div>
                <dt>등록일</dt>
                <dd>{formatDateTime(resource.createdAt)}</dd>
              </div>
              <div>
                <dt>수정일</dt>
                <dd>{formatDateTime(resource.updatedAt)}</dd>
              </div>
              <div>
                <dt>진행상황 변경</dt>
                <dd>{formatDateTime(resource.statusChangedAt)}</dd>
              </div>
            </dl>

            <section className="resource-detail__section">
              <h3 className="resource-detail__section-title">내용</h3>
              <div className="resource-detail__content">{resource.content}</div>
            </section>

            <section className="resource-detail__section">
              <h3 className="resource-detail__section-title">
                첨부 파일 ({resource.files?.length ?? 0})
              </h3>

              {downloadError && (
                <p className="resource-detail-message resource-detail-message--error" role="alert">
                  {downloadError}
                </p>
              )}

              {resource.files?.length > 0 ? (
                <ul className="resource-detail__file-list">
                  {resource.files.map((file) => (
                    <li key={file._id} className="resource-detail__file-item">
                      <div className="resource-detail__file-info">
                        <Paperclip size={18} aria-hidden="true" />
                        <div>
                          <p className="resource-detail__file-name">{file.originalName}</p>
                          <p className="resource-detail__file-meta">
                            {formatFileSize(file.size)}
                            {file.mimeType ? ` · ${file.mimeType}` : ''}
                            {` · 등록 ${formatDateTime(file.createdAt)}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="resource-detail__download-btn"
                        disabled={downloadingFileId === file._id}
                        onClick={() => handleDownload(file)}
                      >
                        <Download size={16} aria-hidden="true" />
                        {downloadingFileId === file._id ? '다운로드 중...' : '다운로드'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="resource-detail-message">첨부 파일이 없습니다.</p>
              )}
            </section>

            <section className="resource-detail__section">
              <h3 className="resource-detail__section-title">
                <MessageSquare size={18} aria-hidden="true" />
                댓글 ({comments.length})
              </h3>

              {comments.length > 0 ? (
                <ul className="resource-detail__comment-list">
                  {comments.map((comment) => (
                    <li key={comment._id} className="resource-detail__comment-item">
                      <div className="resource-detail__comment-header">
                        <span className="resource-detail__comment-author">
                          {comment.user?.name ?? '관리자'}
                        </span>
                        <time
                          className="resource-detail__comment-date"
                          dateTime={comment.createdAt}
                        >
                          {formatDateTime(comment.createdAt)}
                        </time>
                      </div>
                      <p className="resource-detail__comment-content">{comment.content}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="resource-detail-message resource-detail-message--compact">
                  아직 댓글이 없습니다.
                </p>
              )}

              <form className="resource-detail__comment-form" onSubmit={handleCommentSubmit}>
                <label htmlFor="board-resource-comment" className="resource-detail__comment-label">
                  댓글 작성
                </label>
                <textarea
                  id="board-resource-comment"
                  className="resource-detail__comment-input"
                  value={commentContent}
                  onChange={(event) => setCommentContent(event.target.value)}
                  maxLength={MAX_COMMENT_LENGTH}
                  rows={4}
                  placeholder="진행 상황, 요청 사항 등을 남겨 주세요"
                  disabled={isSubmittingComment}
                />
                <div className="resource-detail__comment-footer">
                  <span className="resource-detail__comment-count">
                    {commentContent.length}/{MAX_COMMENT_LENGTH}
                  </span>
                  {commentError && (
                    <p className="resource-detail__comment-error" role="alert">
                      {commentError}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="resource-detail__comment-submit"
                    disabled={isSubmittingComment || !commentContent.trim()}
                  >
                    {isSubmittingComment ? '등록 중...' : '댓글 등록'}
                  </button>
                </div>
              </form>
            </section>
          </article>
        )}
      </div>
    </BoardShell>
  )
}

export default BoardResourceDetailPage
