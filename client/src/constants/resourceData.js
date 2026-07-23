export const RESOURCE_STATUSES = ['기획중', '진행중', '검토중', '수정요청', '완료']
export const RESOURCE_DEPARTMENTS = ['대행사', '브랜드', '외국인', '디자인']

export const MAX_RESOURCE_FILES = 10
export const MAX_TITLE_LENGTH = 120
export const MAX_CONTENT_LENGTH = 10000
export const MAX_COMMENT_LENGTH = 2000

export const RESOURCE_STATUS_LABELS = {
  기획중: '기획중',
  진행중: '진행중',
  검토중: '검토중',
  수정요청: '수정요청',
  완료: '완료',
}

export function createInitialResourceForm() {
  return {
    title: '',
    content: '',
    status: '기획중',
    department: '',
    assignee: '',
    files: [],
  }
}

export function getDepartmentClassName(department) {
  switch (department) {
    case '대행사':
      return 'resource-department--agency'
    case '브랜드':
      return 'resource-department--brand'
    case '외국인':
      return 'resource-department--foreign'
    case '디자인':
      return 'resource-department--design'
    default:
      return 'resource-department--default'
  }
}

export function mapCloudinaryInfoToResourceFile(info) {
  return {
    originalName: info.original_filename || info.public_id || 'file',
    url: info.secure_url,
    mimeType: info.format || info.resource_type || '',
    size: typeof info.bytes === 'number' ? info.bytes : undefined,
  }
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) {
    return '-'
  }

  if (bytes < 1024) {
    return `${bytes}B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}
