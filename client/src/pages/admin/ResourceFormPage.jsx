import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileUp, Paperclip, X } from 'lucide-react'
import BoardShell from '@/components/board/BoardShell'
import { getCloudinaryDocumentWidgetOptions } from '@/config/cloudinary'
import {
  MAX_CONTENT_LENGTH,
  MAX_RESOURCE_FILES,
  MAX_TITLE_LENGTH,
  RESOURCE_DEPARTMENTS,
  RESOURCE_STATUSES,
  createInitialResourceForm,
  formatDateTime,
  formatFileSize,
  mapCloudinaryInfoToResourceFile,
} from '@/constants/resourceData'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useCloudinaryWidget } from '@/hooks/useCloudinaryWidget'
import { createResource, getResourceById, updateResource } from '@/services/resources'
import { getAssigneeOptions, getUsers } from '@/services/users'
import '@/pages/HomePage.css'
import '@/pages/BoardPage.css'
import './ResourceFormPage.css'

function ResourceFormPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isEditMode = Boolean(id)
  const isBoardContext = location.pathname.startsWith('/board/resources')
  const { user, isAuthChecked, isAdmin } = useAuthUser()
  const [form, setForm] = useState(createInitialResourceForm)
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthChecked) {
      return
    }

    if (!user) {
      navigate('/login', {
        replace: true,
        state: { from: location.pathname },
      })
      return
    }

    if (isEditMode && !isAdmin) {
      navigate(isBoardContext ? '/board?tab=resources' : '/', { replace: true })
    }
  }, [isAuthChecked, isAdmin, isBoardContext, isEditMode, location.pathname, navigate, user])

  useEffect(() => {
    if (!isAuthChecked || !user) {
      return
    }

    const fetchAssignees = isAdmin ? getUsers() : getAssigneeOptions()

    fetchAssignees
      .then((data) => {
        const members = Array.isArray(data) ? data : []
        setUsers(members)

        if (!isEditMode) {
          setForm((prev) => ({
            ...prev,
            assignee: prev.assignee || user._id,
          }))
        }
      })
      .catch(() => setUsers([]))
  }, [isAuthChecked, isAdmin, isEditMode, user])

  useEffect(() => {
    if (!isEditMode || !isAuthChecked || !isAdmin) {
      return
    }

    const fetchResource = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await getResourceById(id)
        const resource = data.resource

        setForm({
          title: resource.title ?? '',
          content: resource.content ?? '',
          status: resource.status ?? '기획중',
          department: resource.department ?? '',
          assignee: resource.assignee?._id ?? resource.assignee ?? '',
          files: resource.files ?? [],
        })
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchResource()
  }, [id, isAuthChecked, isAdmin, isEditMode])

  const handleUploadSuccess = useCallback((info) => {
    const nextFile = mapCloudinaryInfoToResourceFile(info)

    setForm((prev) => {
      if (prev.files.length >= MAX_RESOURCE_FILES) {
        return prev
      }

      return {
        ...prev,
        files: [...prev.files, nextFile],
      }
    })
  }, [])

  const {
    openWidget,
    isReady: isUploadReady,
    loadError: uploadError,
    isConfigured: isUploadConfigured,
    configMessage: uploadConfigMessage,
  } = useCloudinaryWidget({
    onSuccess: handleUploadSuccess,
    getWidgetOptions: getCloudinaryDocumentWidgetOptions,
    returnFullInfo: true,
  })

  const assigneeOptions = useMemo(
    () =>
      users.map((member) => ({
        value: member._id,
        label: `${member.name} (${member.email})`,
      })),
    [users]
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleRemoveFile = (index) => {
    setForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, fileIndex) => fileIndex !== index),
    }))
  }

  const validateForm = () => {
    if (!form.title.trim()) {
      return '제목을 입력해 주세요.'
    }

    if (form.title.trim().length > MAX_TITLE_LENGTH) {
      return `제목은 ${MAX_TITLE_LENGTH}자 이하로 입력해 주세요.`
    }

    if (!form.content.trim()) {
      return '내용을 입력해 주세요.'
    }

    if (form.content.trim().length > MAX_CONTENT_LENGTH) {
      return `내용은 ${MAX_CONTENT_LENGTH}자 이하로 입력해 주세요.`
    }

    if (!form.status) {
      return '진행상황을 선택해 주세요.'
    }

    if (!form.department) {
      return '담당부서를 선택해 주세요.'
    }

    if (!form.assignee) {
      return '담당자를 선택해 주세요.'
    }

    if (form.files.length === 0) {
      return '첨부 파일을 1개 이상 등록해 주세요.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError('')

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      status: form.status,
      department: form.department,
      assignee: form.assignee,
      files: form.files,
    }

    try {
      if (isEditMode) {
        await updateResource(id, payload)
        navigate(isBoardContext ? `/board/resources/${id}` : `/admin/resources/${id}`)
      } else {
        const data = await createResource(payload)
        const resourceId = data.resource?._id

        if (isBoardContext && resourceId) {
          navigate(`/board/resources/${resourceId}`)
        } else if (isBoardContext) {
          navigate('/board?tab=resources')
        } else {
          navigate('/admin/resources')
        }
      }
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelPath = isBoardContext
    ? '/board?tab=resources'
    : isEditMode
      ? `/admin/resources/${id}`
      : '/admin/resources'

  if (!isAuthChecked || !user || (isEditMode && !isAdmin)) {
    return null
  }

  const formContent = isLoading ? (
    <p className="resource-form-message">자료 정보를 불러오는 중...</p>
  ) : (
    <form className="resource-form" onSubmit={handleSubmit}>
      {error && (
        <p className="resource-form-message resource-form-message--error" role="alert">
          {error}
        </p>
      )}

      <div className="resource-form__field">
        <label htmlFor="title">제목</label>
        <input
          id="title"
          name="title"
          type="text"
          value={form.title}
          onChange={handleChange}
          maxLength={MAX_TITLE_LENGTH}
          placeholder="자료 제목을 입력해 주세요"
          required
        />
      </div>

      <div className="resource-form__field">
        <label htmlFor="content">내용</label>
        <textarea
          id="content"
          name="content"
          value={form.content}
          onChange={handleChange}
          maxLength={MAX_CONTENT_LENGTH}
          rows={8}
          placeholder="업무 내용, 참고 사항 등을 입력해 주세요"
          required
        />
      </div>

      <div className="resource-form__grid resource-form__grid--3">
        <div className="resource-form__field">
          <label htmlFor="department">담당부서</label>
          <select
            id="department"
            name="department"
            value={form.department}
            onChange={handleChange}
            required
          >
            <option value="">담당부서 선택</option>
            {RESOURCE_DEPARTMENTS.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>

        <div className="resource-form__field">
          <label htmlFor="status">진행상황</label>
          <select
            id="status"
            name="status"
            value={form.status}
            onChange={handleChange}
            required
          >
            {RESOURCE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="resource-form__field">
          <label htmlFor="assignee">담당자</label>
          <select
            id="assignee"
            name="assignee"
            value={form.assignee}
            onChange={handleChange}
            required
          >
            <option value="">담당자 선택</option>
            {assigneeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="resource-form__field">
        <div className="resource-form__files-header">
          <label>파일 업로드</label>
          <span className="resource-form__files-count">
            {form.files.length}/{MAX_RESOURCE_FILES}
          </span>
        </div>

        <div className="resource-form__upload">
          <button
            type="button"
            className="resource-form__upload-btn"
            onClick={openWidget}
            disabled={!isUploadReady || form.files.length >= MAX_RESOURCE_FILES}
          >
            <FileUp size={18} aria-hidden="true" />
            파일 선택
          </button>
          <p className="resource-form__upload-help">
            문서, 이미지 등 업무 파일을 업로드할 수 있습니다. (최대 {MAX_RESOURCE_FILES}개)
          </p>
        </div>

        {!isUploadConfigured && (
          <p className="resource-form-message resource-form-message--error">
            {uploadConfigMessage}
          </p>
        )}

        {uploadError && (
          <p className="resource-form-message resource-form-message--error">{uploadError}</p>
        )}

        {form.files.length > 0 && (
          <ul className="resource-form__file-list">
            {form.files.map((file, index) => (
              <li
                key={file._id ?? `${file.url}-${index}`}
                className="resource-form__file-item"
              >
                <div className="resource-form__file-info">
                  <Paperclip size={16} aria-hidden="true" />
                  <div>
                    <p className="resource-form__file-name">{file.originalName}</p>
                    <p className="resource-form__file-meta">
                      {formatFileSize(file.size)}
                      {file.mimeType ? ` · ${file.mimeType}` : ''}
                      {file.createdAt
                        ? ` · 등록 ${formatDateTime(file.createdAt)}`
                        : ' · 저장 시 등록'}
                    </p>
                  </div>
                </div>
                <div className="resource-form__file-actions">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="resource-form__file-link"
                  >
                    보기
                  </a>
                  <button
                    type="button"
                    className="resource-form__file-remove"
                    onClick={() => handleRemoveFile(index)}
                    aria-label={`${file.originalName} 삭제`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="resource-form__actions">
        <Link to={cancelPath} className="resource-form__cancel">
          취소
        </Link>
        <button type="submit" className="resource-form__submit" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : isEditMode ? '수정하기' : '등록하기'}
        </button>
      </div>
    </form>
  )

  if (isBoardContext) {
    return (
      <BoardShell activeTab="resources">
        <header className="board-page__header board-page__header--centered">
          <h1 className="board-page__title">{isEditMode ? '자료 수정' : '자료 등록'}</h1>
        </header>
        <div className="board-page__resource-form">{formContent}</div>
      </BoardShell>
    )
  }

  return (
    <div className="resource-form-page">
      <main className="resource-form-page__content">
        <div className="resource-form-topbar">
          <Link to={cancelPath} className="resource-form-topbar__title">
            <ArrowLeft size={22} aria-hidden="true" />
            {isEditMode ? '자료 수정' : '자료 등록'}
          </Link>
        </div>
        {formContent}
      </main>
    </div>
  )
}

export default ResourceFormPage
