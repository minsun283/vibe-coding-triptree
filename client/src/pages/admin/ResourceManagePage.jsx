import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Search, X } from 'lucide-react'
import ProductPagination from '@/components/common/ProductPagination'
import { RESOURCE_DEPARTMENTS, RESOURCE_STATUSES, getDepartmentClassName } from '@/constants/resourceData'
import { useAuthUser } from '@/hooks/useAuthUser'
import { getResources, updateResource } from '@/services/resources'
import { getUsers } from '@/services/users'
import '@/pages/HomePage.css'
import './ResourceManagePage.css'

const RESOURCES_PER_PAGE = 10

const DEPARTMENT_TABS = [{ key: '', label: 'All' }, ...RESOURCE_DEPARTMENTS.map((department) => ({
  key: department,
  label: department,
}))]

function formatCount(value) {
  return new Intl.NumberFormat('ko-KR').format(value ?? 0)
}

function formatDateTime(value) {
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

function getDepartmentTabClassName(department) {
  if (!department) {
    return 'resource-dept-card--all'
  }

  return getDepartmentClassName(department).replace('resource-department--', 'resource-dept-card--')
}

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

function ResourceManagePage() {
  const navigate = useNavigate()
  const { isAuthChecked, isAdmin } = useAuthUser()
  const [resources, setResources] = useState([])
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [departmentCounts, setDepartmentCounts] = useState(null)
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingStatusId, setUpdatingStatusId] = useState(null)

  useEffect(() => {
    if (isAuthChecked && !isAdmin) {
      navigate('/', { replace: true })
    }
  }, [isAuthChecked, isAdmin, navigate])

  useEffect(() => {
    if (!isAuthChecked || !isAdmin) {
      return
    }

    getUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
  }, [isAuthChecked, isAdmin])

  const fetchResources = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getResources({
        page: currentPage,
        limit: RESOURCES_PER_PAGE,
        status: statusFilter,
        department: departmentFilter,
        assignee: assigneeFilter,
        search: searchQuery,
      })

      setResources(data.resources ?? [])
      setPagination(data.pagination ?? null)
      setDepartmentCounts(data.departmentCounts ?? null)
    } catch (fetchError) {
      setError(fetchError.message)
      setResources([])
      setPagination(null)
      setDepartmentCounts(null)
    } finally {
      setIsLoading(false)
    }
  }, [assigneeFilter, currentPage, departmentFilter, searchQuery, statusFilter])

  useEffect(() => {
    if (!isAuthChecked || !isAdmin) {
      return
    }

    fetchResources()
  }, [fetchResources, isAuthChecked, isAdmin])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setCurrentPage(1)
    setSearchQuery(searchInput.trim())
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
    setCurrentPage(1)
  }

  const handleClearAllFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setStatusFilter('')
    setAssigneeFilter('')
    setDepartmentFilter('')
    setCurrentPage(1)
  }

  const hasActiveFilters = Boolean(
    searchQuery || statusFilter || assigneeFilter || departmentFilter
  )

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value)
    setCurrentPage(1)
  }

  const handleDepartmentFilterChange = (department) => {
    setDepartmentFilter(department)
    setCurrentPage(1)
  }

  const handleAssigneeFilterChange = (event) => {
    setAssigneeFilter(event.target.value)
    setCurrentPage(1)
  }

  const handleStatusChange = async (resource, nextStatus) => {
    if (resource.status === nextStatus) {
      return
    }

    const previousStatus = resource.status
    setUpdatingStatusId(resource._id)
    setError('')

    setResources((prev) =>
      prev.map((item) =>
        item._id === resource._id ? { ...item, status: nextStatus } : item
      )
    )

    try {
      await updateResource(resource._id, { status: nextStatus })
      await fetchResources()
    } catch (updateError) {
      setResources((prev) =>
        prev.map((item) =>
          item._id === resource._id ? { ...item, status: previousStatus } : item
        )
      )
      setError(updateError.message)
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const assigneeOptions = useMemo(
    () =>
      users.map((member) => ({
        value: member._id,
        label: `${member.name} (${member.email})`,
      })),
    [users]
  )

  const activeAssigneeLabel = useMemo(() => {
    if (!assigneeFilter) {
      return ''
    }

    return assigneeOptions.find((option) => option.value === assigneeFilter)?.label ?? ''
  }, [assigneeFilter, assigneeOptions])

  const resultSummary = useMemo(() => {
    if (!pagination?.totalItems) {
      return null
    }

    const start = (pagination.page - 1) * pagination.limit + 1
    const end = Math.min(pagination.page * pagination.limit, pagination.totalItems)

    return `${pagination.totalItems}건 중 ${start}-${end} 표시`
  }, [pagination])

  if (!isAuthChecked || !isAdmin) {
    return null
  }

  return (
    <div className="resource-manage-page">
      <main className="resource-manage-page__content">
        <div className="resource-manage-topbar">
          <Link to="/admin" className="resource-manage-topbar__title">
            <ArrowLeft size={22} aria-hidden="true" />
            자료실
          </Link>
          <Link to="/admin/resources/new" className="resource-manage-topbar__cta">
            <Plus size={18} aria-hidden="true" />
            자료 등록
          </Link>
        </div>

        <section className="resource-manage-panel">
          <div className="resource-dept-cards" role="tablist" aria-label="담당부서 필터">
            {DEPARTMENT_TABS.map((tab) => {
              const isActive = departmentFilter === tab.key
              const countKey = tab.key || 'all'
              const count = departmentCounts?.[countKey] ?? 0

              return (
                <button
                  key={tab.key || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`resource-dept-card ${getDepartmentTabClassName(tab.key)}${isActive ? ' is-active' : ''}`}
                  onClick={() => handleDepartmentFilterChange(tab.key)}
                >
                  <span className="resource-dept-card__label">{tab.label}</span>
                  <span className="resource-dept-card__count">{formatCount(count)}</span>
                </button>
              )
            })}
          </div>

          <form className="resource-manage-toolbar" onSubmit={handleSearchSubmit}>
            <div className="resource-manage-toolbar__search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="게시물 제목 또는 내용 검색"
                aria-label="자료 검색"
              />
              <button type="submit" className="resource-manage-toolbar__search-btn">
                검색
              </button>
              {(searchInput || searchQuery) && (
                <button
                  type="button"
                  className="resource-manage-toolbar__search-clear"
                  onClick={handleClearSearch}
                  aria-label="검색 초기화"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <div className="resource-active-filters">
                {searchQuery && (
                  <span className="resource-filter-tag">
                    검색: {searchQuery}
                    <button
                      type="button"
                      className="resource-filter-tag__remove"
                      onClick={handleClearSearch}
                      aria-label="검색 필터 제거"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </span>
                )}

                {departmentFilter && (
                  <span className="resource-filter-tag">
                    담당부서: {departmentFilter}
                    <button
                      type="button"
                      className="resource-filter-tag__remove"
                      onClick={() => handleDepartmentFilterChange('')}
                      aria-label="담당부서 필터 제거"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </span>
                )}

                {statusFilter && (
                  <span className="resource-filter-tag">
                    진행상황: {statusFilter}
                    <button
                      type="button"
                      className="resource-filter-tag__remove"
                      onClick={() => {
                        setStatusFilter('')
                        setCurrentPage(1)
                      }}
                      aria-label="진행상황 필터 제거"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </span>
                )}

                {assigneeFilter && (
                  <span className="resource-filter-tag">
                    담당자: {activeAssigneeLabel || assigneeFilter}
                    <button
                      type="button"
                      className="resource-filter-tag__remove"
                      onClick={() => {
                        setAssigneeFilter('')
                        setCurrentPage(1)
                      }}
                      aria-label="담당자 필터 제거"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  className="resource-filter-clear"
                  onClick={handleClearAllFilters}
                >
                  전체 게시물 보기
                </button>
              </div>
            )}

            <div className="resource-manage-toolbar__filters">
              <label className="resource-manage-toolbar__filter">
                <span>진행상황</span>
                <select value={statusFilter} onChange={handleStatusFilterChange}>
                  <option value="">전체</option>
                  {RESOURCE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="resource-manage-toolbar__filter">
                <span>담당자</span>
                <select value={assigneeFilter} onChange={handleAssigneeFilterChange}>
                  <option value="">전체</option>
                  {assigneeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </form>

          {error && (
            <p className="resource-manage-message resource-manage-message--error" role="alert">
              {error}
            </p>
          )}

          {isLoading && (
            <p className="resource-manage-message">자료 목록을 불러오는 중...</p>
          )}

          {!isLoading && !error && resources.length === 0 && (
            <p className="resource-manage-message">
              {hasActiveFilters ? '조건에 맞는 게시물이 없습니다.' : '등록된 자료가 없습니다.'}
              {hasActiveFilters && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="resource-manage-message__link"
                    onClick={handleClearAllFilters}
                  >
                    전체 게시물 보기
                  </button>
                </>
              )}
            </p>
          )}

          {!isLoading && resources.length > 0 && (
            <div className="resource-table-wrap">
              <table className="resource-table">
                <thead>
                  <tr>
                    <th scope="col">담당부서</th>
                    <th scope="col">게시물제목</th>
                    <th scope="col">담당자</th>
                    <th scope="col">진행상황</th>
                    <th scope="col">게시물 등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr key={resource._id}>
                      <td className="resource-table__department">
                        {resource.department ? (
                          <span
                            className={`resource-department ${getDepartmentClassName(resource.department)}`}
                          >
                            {resource.department}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="resource-table__title">
                        <Link to={`/admin/resources/${resource._id}`}>
                          {resource.title}
                        </Link>
                      </td>
                      <td className="resource-table__assignee">
                        {resource.assignee?.name ?? '-'}
                      </td>
                      <td className="resource-table__status">
                        <label className="resource-table__status-label">
                          <span className="sr-only">진행상황</span>
                          <select
                            className={`resource-table__status-select ${getStatusClassName(resource.status)}`}
                            value={resource.status}
                            disabled={updatingStatusId === resource._id}
                            onChange={(event) =>
                              handleStatusChange(resource, event.target.value)
                            }
                          >
                            {RESOURCE_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>
                      </td>
                      <td className="resource-table__date">
                        {formatDateTime(resource.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {resultSummary && !isLoading && (
            <p className="resource-table-summary">{resultSummary}</p>
          )}

          {pagination && pagination.totalPages > 1 && (
            <ProductPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </section>
      </main>
    </div>
  )
}

export default ResourceManagePage
