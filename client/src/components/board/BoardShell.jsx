import HomeNavbar from '@/components/home/HomeNavbar'
import BoardSidebar from '@/components/board/BoardSidebar'
import { useAuthUser } from '@/hooks/useAuthUser'

function BoardShell({ activeTab, children }) {
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()

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
          <BoardSidebar activeTab={activeTab} />
          <section className="board-page__main">{children}</section>
        </div>
      </main>
    </div>
  )
}

export default BoardShell
