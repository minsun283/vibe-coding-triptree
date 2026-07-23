import { useNavigate } from 'react-router-dom'
import { BOARD_TABS, getBoardTabPath } from '@/constants/boardData'

function BoardSidebar({ activeTab }) {
  const navigate = useNavigate()

  const handleTabChange = (tabId) => {
    navigate(getBoardTabPath(tabId))
  }

  return (
    <aside className="board-page__sidebar">
      <h2 className="board-page__sidebar-title">게시판</h2>

      <nav className="board-page__nav" aria-label="게시판 메뉴">
        {BOARD_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`board-page__nav-item${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default BoardSidebar
