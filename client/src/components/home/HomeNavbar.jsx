import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Menu, ShoppingCart, User, X } from 'lucide-react'
import { useClickOutside } from '@/hooks/useClickOutside'
import useCartCount from '@/hooks/useCartCount'
import useHasContacts from '@/hooks/useHasContacts'
import { MY_CONTACTS_PATH } from '@/constants/contactData'
import { NAV_ITEMS } from '@/constants/homeData'

function HomeNavbar({ user, isAuthChecked, isAdmin, onLogout, variant = 'dark', hideLoginAction = false }) {
  const [isMyPageMenuOpen, setIsMyPageMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const myPageMenuRef = useRef(null)
  const cartItemCount = useCartCount(user, isAuthChecked)
  const hasContacts = useHasContacts(user, isAuthChecked)

  const closeMyPageMenu = useCallback(() => setIsMyPageMenuOpen(false), [])
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), [])

  useClickOutside(myPageMenuRef, closeMyPageMenu, isMyPageMenuOpen)

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeMobileMenu()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [closeMobileMenu, isMobileMenuOpen])

  const handleLogout = () => {
    onLogout()
    closeMyPageMenu()
    closeMobileMenu()
  }

  const handleMobileNavClick = () => {
    closeMobileMenu()
    closeMyPageMenu()
  }

  return (
    <header
      className={`home-navbar home-navbar--${variant}${isMobileMenuOpen ? ' home-navbar--menu-open' : ''}`}
    >
      <Link to="/" className="home-logo" onClick={handleMobileNavClick}>
        <span className="home-logo__icon">
          <Globe size={18} />
        </span>
        TripTree
      </Link>

      <nav className="home-nav" aria-label="주요 메뉴">
        {NAV_ITEMS.map((item) => (
          <Link key={item.label} to={item.to} className="home-nav__link">
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="home-navbar__actions">
        {isAuthChecked && (
          <>
            {user ? (
              <span className="home-greeting">{user.name}님 환영합니다</span>
            ) : (
              !hideLoginAction && (
                <Link to="/login" className="home-login-button">
                  로그인
                </Link>
              )
            )}

            {isAdmin && (
              <Link to="/admin" className="home-admin-button">
                Admin
              </Link>
            )}
          </>
        )}

        <Link to="/cart" className="home-cart-button" aria-label="장바구니">
          <ShoppingCart size={20} />
          {user && cartItemCount > 0 && (
            <span className="home-cart-button__badge">{cartItemCount}</span>
          )}
        </Link>

        {user && (
          <div className="home-mypage-menu" ref={myPageMenuRef}>
            <button
              type="button"
              className="home-mypage-button"
              aria-label="마이페이지"
              aria-expanded={isMyPageMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsMyPageMenuOpen((prev) => !prev)}
            >
              <User size={20} />
            </button>

            {isMyPageMenuOpen && (
              <div className="home-dropdown" role="menu">
                <Link
                  to="/profile"
                  className="home-dropdown-item"
                  role="menuitem"
                  onClick={closeMyPageMenu}
                >
                  내정보보기
                </Link>
                <Link
                  to="/orders"
                  className="home-dropdown-item"
                  role="menuitem"
                  onClick={closeMyPageMenu}
                >
                  내 주문 보기
                </Link>
                {hasContacts && (
                  <Link
                    to={MY_CONTACTS_PATH}
                    className="home-dropdown-item"
                    role="menuitem"
                    onClick={closeMyPageMenu}
                  >
                    내 견적요청서 확인
                  </Link>
                )}
                <button
                  type="button"
                  className="home-dropdown-item"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className="home-nav-toggle"
          aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="home-mobile-nav"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <button
          type="button"
          className="home-mobile-nav-backdrop"
          aria-label="메뉴 닫기"
          onClick={closeMobileMenu}
        />
      )}

      <nav
        id="home-mobile-nav"
        className={`home-mobile-nav${isMobileMenuOpen ? ' is-open' : ''}`}
        aria-label="모바일 메뉴"
        aria-hidden={!isMobileMenuOpen}
      >
        {user && (
          <p className="home-mobile-nav__greeting">{user.name}님 환영합니다</p>
        )}

        <div className="home-mobile-nav__links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="home-mobile-nav__link"
              onClick={handleMobileNavClick}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="home-mobile-nav__actions">
          {isAuthChecked && !user && !hideLoginAction && (
            <Link to="/login" className="home-mobile-nav__button" onClick={handleMobileNavClick}>
              로그인
            </Link>
          )}

          {isAdmin && (
            <Link to="/admin" className="home-mobile-nav__button" onClick={handleMobileNavClick}>
              Admin
            </Link>
          )}

          {user && (
            <>
              <Link to="/profile" className="home-mobile-nav__link" onClick={handleMobileNavClick}>
                내정보보기
              </Link>
              <Link to="/orders" className="home-mobile-nav__link" onClick={handleMobileNavClick}>
                내 주문 보기
              </Link>
              {hasContacts && (
                <Link
                  to={MY_CONTACTS_PATH}
                  className="home-mobile-nav__link"
                  onClick={handleMobileNavClick}
                >
                  내 견적요청서 확인
                </Link>
              )}
              <button type="button" className="home-mobile-nav__link" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

export default HomeNavbar
