import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import { getCurrentUser, loginUser } from '@/services/api'
import { saveAuthSession } from '@/services/auth'
import { useAuthUser } from '@/hooks/useAuthUser'
import '@/pages/HomePage.css'
import './LoginPage.css'

const initialForm = {
  email: '',
  password: '',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </svg>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [form, setForm] = useState(initialForm)
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthChecked && user) {
      navigate('/', { replace: true })
    }
  }, [isAuthChecked, user, navigate])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    if (!form.email.trim()) {
      return '이메일을 입력해 주세요.'
    }

    if (!EMAIL_PATTERN.test(form.email.trim())) {
      return '올바른 이메일 형식을 입력해 주세요.'
    }

    if (!form.password) {
      return '비밀번호를 입력해 주세요.'
    }

    return ''
  }

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false)
    navigate('/', { replace: true })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const data = await loginUser({
        email: form.email.trim(),
        password: form.password,
      })

      if (!data.token || !data.user) {
        throw new Error('로그인 응답이 올바르지 않습니다.')
      }

      saveAuthSession(
        { token: data.token, user: data.user },
        rememberMe
      )

      setForm(initialForm)
      setLoggedInUser(data.user)
      setShowSuccessPopup(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isAuthChecked && user) {
    return null
  }

  return (
    <div className="login-page">
      <div className="login-page__navbar">
        <div className="home-container">
          <HomeNavbar
            variant="light"
            hideLoginAction
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
          />
        </div>
      </div>

      <div className="login-page__content">
      <div className="login-card">
        <header className="login-header">
          <h1 className="login-title">로그인</h1>
          <p className="login-subtitle">계정에 로그인하여 쇼핑을 시작하세요</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">이메일</label>
            <div className="login-input-wrap">
              <Mail className="login-icon" size={18} />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">비밀번호</label>
            <div className="login-input-wrap">
              <Lock className="login-icon" size={18} />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호를 입력하세요"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span className="app-checkbox__control" aria-hidden="true" />
              <span>로그인 상태 유지</span>
            </label>
            <button type="button" className="login-forgot">
              비밀번호 찾기
            </button>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="login-divider">
          <span>또는</span>
        </div>

        <div className="login-social">
          <button type="button" className="login-social-btn login-social-btn--google">
            <GoogleIcon />
            Google로 로그인
          </button>
          <button type="button" className="login-social-btn login-social-btn--facebook">
            <FacebookIcon />
            Facebook으로 로그인
          </button>
          <button type="button" className="login-social-btn login-social-btn--apple">
            <AppleIcon />
            Apple로 로그인
          </button>
        </div>

        <p className="login-footer">
          아직 계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>
      </div>
      </div>

      {showSuccessPopup && (
        <div className="login-popup-overlay" onClick={handleCloseSuccessPopup}>
          <div
            className="login-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-popup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="login-popup-title" className="login-popup-title">
              환영합니다.
            </h2>
            <p className="login-popup-message">
              {loggedInUser?.name ? `${loggedInUser.name}님, ` : ''}로그인에 성공했습니다.
            </p>
            <button
              type="button"
              className="login-popup-button"
              onClick={handleCloseSuccessPopup}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginPage
