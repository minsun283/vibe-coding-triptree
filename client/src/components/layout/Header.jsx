import { Link, NavLink } from 'react-router-dom'

function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__logo">
          Shoping Mall
        </Link>

        <nav className="header__nav" aria-label="주요 메뉴">
          <NavLink to="/" end className="header__link">
            홈
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

export default Header
