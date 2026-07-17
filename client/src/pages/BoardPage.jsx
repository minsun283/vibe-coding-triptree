import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageSquare, PenLine } from 'lucide-react'
import BoardCustomerReviews from '@/components/board/BoardCustomerReviews'
import BoardPostItem from '@/components/board/BoardPostItem'
import ProductPagination from '@/components/common/ProductPagination'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { createInquiry, createNotice, getBoardPosts } from '@/services/board'
import { addMyInquiry } from '@/utils/boardInquiryUnlock'
import '@/pages/HomePage.css'
import './BoardPage.css'

const POSTS_PER_PAGE = 10
const BOARD_TABS = [
  { id: 'notice', label: '공지사항' },
  { id: 'inquiry', label: '문의하기' },
  { id: 'reviews', label: '고객후기' },
]

function getActiveTab(tabParam) {
  if (tabParam === 'inquiry') {
    return 'inquiry'
  }

  if (tabParam === 'reviews') {
    return 'reviews'
  }

  return 'notice'
}

function BoardPage() {
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = getActiveTab(searchParams.get('tab'))

  const [posts, setPosts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [inquiryTitle, setInquiryTitle] = useState('')
  const [inquiryAuthorName, setInquiryAuthorName] = useState('')
  const [inquiryPassword, setInquiryPassword] = useState('')
  const [inquiryContent, setInquiryContent] = useState('')
  const [isInquirySubmitting, setIsInquirySubmitting] = useState(false)
  const [inquirySubmitError, setInquirySubmitError] = useState('')
  const [inquirySubmitSuccess, setInquirySubmitSuccess] = useState('')

  const [isNoticeFormOpen, setIsNoticeFormOpen] = useState(false)
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [isNoticeSubmitting, setIsNoticeSubmitting] = useState(false)
  const [noticeSubmitError, setNoticeSubmitError] = useState('')
  const [noticeSubmitSuccess, setNoticeSubmitSuccess] = useState('')

  const activeTabLabel = BOARD_TABS.find((tab) => tab.id === activeTab)?.label ?? '공지사항'

  const fetchPosts = useCallback(async () => {
    if (activeTab === 'reviews') {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const data = await getBoardPosts({
        category: activeTab,
        page: currentPage,
        limit: POSTS_PER_PAGE,
      })

      setPosts(data.posts ?? [])
      setPagination(data.pagination ?? null)
    } catch (fetchError) {
      setError(fetchError.message)
      setPosts([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, currentPage])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  const handleTabChange = (tabId) => {
    if (tabId === 'notice') {
      setSearchParams({})
    } else {
      setSearchParams({ tab: tabId })
    }

    setInquirySubmitError('')
    setInquirySubmitSuccess('')
    setIsNoticeFormOpen(false)
    setNoticeSubmitError('')
    setNoticeSubmitSuccess('')
  }

  const handleInquirySubmit = async (event) => {
    event.preventDefault()
    setInquirySubmitError('')
    setInquirySubmitSuccess('')

    if (!inquiryTitle.trim()) {
      setInquirySubmitError('제목을 입력해 주세요.')
      return
    }

    if (!inquiryAuthorName.trim()) {
      setInquirySubmitError('작성자 이름을 입력해 주세요.')
      return
    }

    if (!inquiryPassword.trim()) {
      setInquirySubmitError('비밀번호를 입력해 주세요.')
      return
    }

    if (inquiryPassword.trim().length < 4) {
      setInquirySubmitError('비밀번호는 4자 이상 입력해 주세요.')
      return
    }

    if (!inquiryContent.trim()) {
      setInquirySubmitError('내용을 입력해 주세요.')
      return
    }

    setIsInquirySubmitting(true)

    try {
      const data = await createInquiry({
        title: inquiryTitle.trim(),
        authorName: inquiryAuthorName.trim(),
        password: inquiryPassword.trim(),
        content: inquiryContent.trim(),
      })

      if (data.post?._id) {
        addMyInquiry(data.post._id, inquiryPassword.trim())
      }

      setInquiryTitle('')
      setInquiryAuthorName('')
      setInquiryPassword('')
      setInquiryContent('')
      setInquirySubmitSuccess('문의가 등록되었습니다.')
      setCurrentPage(1)
      await fetchPosts()
    } catch (submitErr) {
      setInquirySubmitError(submitErr.message)
    } finally {
      setIsInquirySubmitting(false)
    }
  }

  const handleNoticeSubmit = async (event) => {
    event.preventDefault()
    setNoticeSubmitError('')
    setNoticeSubmitSuccess('')

    if (!noticeTitle.trim()) {
      setNoticeSubmitError('제목을 입력해 주세요.')
      return
    }

    if (!noticeContent.trim()) {
      setNoticeSubmitError('내용을 입력해 주세요.')
      return
    }

    setIsNoticeSubmitting(true)

    try {
      await createNotice({
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
      })

      setNoticeTitle('')
      setNoticeContent('')
      setNoticeSubmitSuccess('공지사항이 등록되었습니다.')
      setIsNoticeFormOpen(false)
      setCurrentPage(1)
      await fetchPosts()
    } catch (submitErr) {
      setNoticeSubmitError(submitErr.message)
    } finally {
      setIsNoticeSubmitting(false)
    }
  }

  const totalItems = pagination?.totalItems ?? 0

  return (
    <div className="board-page">
      <div className="board-page__navbar">
        <div className="board-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </div>

      <main className="board-page__content">
        <div className="board-page__layout">
          <aside className="board-page__sidebar">
            <h2 className="board-page__sidebar-title">게시판</h2>

            <nav className="board-page__nav" aria-label="게시판 메뉴">
              {BOARD_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`board-page__nav-item${
                    activeTab === tab.id ? ' is-active' : ''
                  }`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <section className="board-page__main">
            <header
              className={`board-page__header${
                activeTab === 'reviews' ? ' board-page__header--reviews' : ''
              }`}
            >
              <h1 className="board-page__title">{activeTabLabel}</h1>

              {activeTab === 'notice' && isAdmin && (
                <button
                  type="button"
                  className="board-page__write-btn"
                  onClick={() => {
                    setIsNoticeFormOpen((prev) => !prev)
                    setNoticeSubmitError('')
                    setNoticeSubmitSuccess('')
                  }}
                >
                  <PenLine size={16} aria-hidden="true" />
                  {isNoticeFormOpen ? '작성 취소' : '글쓰기'}
                </button>
              )}
            </header>

            {activeTab === 'reviews' ? (
              <BoardCustomerReviews user={user} />
            ) : (
              <>
            {activeTab === 'notice' && isAdmin && isNoticeFormOpen && (
              <div className="board-page__notice-form-wrap">
                <form className="board-page__notice-form" onSubmit={handleNoticeSubmit}>
                  <label className="board-page__field">
                    <span className="board-page__field-label">제목</span>
                    <input
                      type="text"
                      value={noticeTitle}
                      onChange={(event) => setNoticeTitle(event.target.value)}
                      placeholder="공지 제목을 입력해 주세요"
                      maxLength={120}
                    />
                  </label>

                  <label className="board-page__field">
                    <span className="board-page__field-label">내용</span>
                    <textarea
                      value={noticeContent}
                      onChange={(event) => setNoticeContent(event.target.value)}
                      placeholder="공지 내용을 입력해 주세요"
                      rows={8}
                      maxLength={5000}
                    />
                  </label>

                  {noticeSubmitError && (
                    <p className="board-page__form-message board-page__form-message--error">
                      {noticeSubmitError}
                    </p>
                  )}

                  {noticeSubmitSuccess && (
                    <p className="board-page__form-message board-page__form-message--success">
                      {noticeSubmitSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="board-page__submit-btn"
                    disabled={isNoticeSubmitting}
                  >
                    {isNoticeSubmitting ? '등록 중...' : '공지 등록'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'inquiry' && (
              <div className="board-page__inquiry-form-wrap">
                <form className="board-page__inquiry-form" onSubmit={handleInquirySubmit}>
                  <div className="board-page__inquiry-form-header">
                    <PenLine size={16} aria-hidden="true" />
                    <strong>문의 작성</strong>
                  </div>

                  <div className="board-page__field-row">
                    <label className="board-page__field">
                      <span className="board-page__field-label">작성자 이름</span>
                      <input
                        type="text"
                        value={inquiryAuthorName}
                        onChange={(event) => setInquiryAuthorName(event.target.value)}
                        placeholder="이름을 입력해 주세요"
                        maxLength={50}
                      />
                    </label>

                    <label className="board-page__field">
                      <span className="board-page__field-label">비밀번호</span>
                      <input
                        type="password"
                        value={inquiryPassword}
                        onChange={(event) => setInquiryPassword(event.target.value)}
                        placeholder="4자 이상 입력"
                        minLength={4}
                        autoComplete="new-password"
                      />
                    </label>
                  </div>

                  <label className="board-page__field">
                    <span className="board-page__field-label">제목</span>
                    <input
                      type="text"
                      value={inquiryTitle}
                      onChange={(event) => setInquiryTitle(event.target.value)}
                      placeholder="문의 제목을 입력해 주세요"
                      maxLength={120}
                    />
                  </label>

                  <label className="board-page__field">
                    <span className="board-page__field-label">내용</span>
                    <textarea
                      value={inquiryContent}
                      onChange={(event) => setInquiryContent(event.target.value)}
                      placeholder="문의 내용을 입력해 주세요"
                      rows={5}
                      maxLength={5000}
                    />
                  </label>

                  <p className="board-page__inquiry-note">
                    비밀번호는 문의 내용 확인 시 필요합니다. 분실 시 확인이 어려울 수 있습니다.
                  </p>

                  {inquirySubmitError && (
                    <p className="board-page__form-message board-page__form-message--error">
                      {inquirySubmitError}
                    </p>
                  )}

                  {inquirySubmitSuccess && (
                    <p className="board-page__form-message board-page__form-message--success">
                      {inquirySubmitSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="board-page__submit-btn"
                    disabled={isInquirySubmitting}
                  >
                    {isInquirySubmitting ? '등록 중...' : '문의 등록'}
                  </button>
                </form>
              </div>
            )}

            {isLoading && (
              <p className="board-page__status">게시글을 불러오는 중...</p>
            )}

            {!isLoading && error && (
              <p className="board-page__status board-page__status--error">{error}</p>
            )}

            {!isLoading && !error && posts.length === 0 && (
              <div className="board-page__empty">
                <MessageSquare size={32} aria-hidden="true" />
                <p>
                  {activeTab === 'notice'
                    ? '등록된 공지사항이 없습니다.'
                    : '등록된 문의가 없습니다.'}
                </p>
              </div>
            )}

            {!isLoading && !error && posts.length > 0 && (
              <>
                <ul className="board-page__list">
                  {posts.map((post) => (
                    <li key={post._id}>
                      <BoardPostItem
                        post={post}
                        showStatus={activeTab === 'inquiry'}
                        isAdmin={isAdmin}
                        onDeleted={fetchPosts}
                        onUpdated={fetchPosts}
                      />
                    </li>
                  ))}
                </ul>

                {pagination && pagination.totalPages > 1 && (
                  <ProductPagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={setCurrentPage}
                  />
                )}

                <p className="board-page__count">총 {totalItems}건</p>
              </>
            )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default BoardPage
