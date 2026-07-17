import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from 'lucide-react'
import { createUser } from '@/services/api'
import './SignUpPage.css'

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  address: '',
}

const initialAgreements = {
  all: false,
  terms: false,
  privacy: false,
  marketing: false,
}

const NAME_PATTERN = /^[a-zA-Z가-힣\s]+$/

function SignUpPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [agreements, setAgreements] = useState(initialAgreements)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [showWelcomePopup, setShowWelcomePopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAgreementChange = (event) => {
    const { name, checked } = event.target

    if (name === 'all') {
      setAgreements({
        all: checked,
        terms: checked,
        privacy: checked,
        marketing: checked,
      })
      return
    }

    setAgreements((prev) => {
      const next = { ...prev, [name]: checked }
      next.all = next.terms && next.privacy && next.marketing
      return next
    })
  }

  const validateForm = () => {
    if (!form.name.trim()) {
      return '이름을 입력해 주세요.'
    }

    if (!NAME_PATTERN.test(form.name.trim())) {
      return '이름은 한글과 영문만 입력할 수 있습니다.'
    }

    if (!form.email.trim()) {
      return '이메일을 입력해 주세요.'
    }

    if (!form.password) {
      return '비밀번호를 입력해 주세요.'
    }

    if (form.password.length < 8) {
      return '비밀번호는 8자 이상이어야 합니다.'
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(form.password)) {
      return '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.'
    }

    if (form.password !== form.confirmPassword) {
      return '비밀번호가 일치하지 않습니다.'
    }

    if (!agreements.terms || !agreements.privacy) {
      return '필수 약관에 동의해 주세요.'
    }

    return ''
  }

  const handleCloseWelcomePopup = () => {
    setShowWelcomePopup(false)
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
      await createUser({
        email: form.email.trim(),
        name: form.name.trim(),
        password: form.password,
        user_type: 'customer',
        address: form.address.trim() || undefined,
      })

      setForm(initialForm)
      setAgreements(initialAgreements)
      setShowWelcomePopup(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-card">
        <header className="signup-header">
          <h1 className="signup-title">회원가입</h1>
          <p className="signup-subtitle">새로운 계정을 만들어 쇼핑을 시작하세요</p>
        </header>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="signup-field">
            <label htmlFor="name">
              이름 <span className="signup-required">*</span>
            </label>
            <div className="signup-input-wrap">
              <User className="signup-icon" size={18} />
              <input
                id="name"
                name="name"
                type="text"
                placeholder="이름"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="signup-field">
            <label htmlFor="email">
              이메일 <span className="signup-required">*</span>
            </label>
            <div className="signup-input-wrap">
              <Mail className="signup-icon" size={18} />
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

          <div className="signup-field">
            <label htmlFor="password">
              비밀번호 <span className="signup-required">*</span>
            </label>
            <div className="signup-input-wrap">
              <Lock className="signup-icon" size={18} />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호를 입력하세요"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="signup-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="signup-helper">8자 이상, 영문, 숫자, 특수문자 포함</p>
          </div>

          <div className="signup-field">
            <label htmlFor="confirmPassword">
              비밀번호 확인 <span className="signup-required">*</span>
            </label>
            <div className="signup-input-wrap">
              <Lock className="signup-icon" size={18} />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="비밀번호를 다시 입력하세요"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="signup-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="signup-agreements">
            <label className="signup-agreement signup-agreement--all">
              <input
                type="checkbox"
                name="all"
                checked={agreements.all}
                onChange={handleAgreementChange}
              />
              <span className="app-checkbox__control" aria-hidden="true" />
              <span>전체 동의</span>
            </label>

            <div className="signup-agreement-list">
              <label className="signup-agreement">
                <input
                  type="checkbox"
                  name="terms"
                  checked={agreements.terms}
                  onChange={handleAgreementChange}
                />
                <span className="app-checkbox__control" aria-hidden="true" />
                <span>이용약관 동의 (필수)</span>
              </label>
              <button type="button" className="signup-link">
                보기
              </button>
            </div>

            <div className="signup-agreement-list">
              <label className="signup-agreement">
                <input
                  type="checkbox"
                  name="privacy"
                  checked={agreements.privacy}
                  onChange={handleAgreementChange}
                />
                <span className="app-checkbox__control" aria-hidden="true" />
                <span>개인정보처리방침 동의 (필수)</span>
              </label>
              <button type="button" className="signup-link">
                보기
              </button>
            </div>

            <label className="signup-agreement">
              <input
                type="checkbox"
                name="marketing"
                checked={agreements.marketing}
                onChange={handleAgreementChange}
              />
              <span className="app-checkbox__control" aria-hidden="true" />
              <span>마케팅 정보 수신 동의 (선택)</span>
            </label>
          </div>

          {error && <p className="signup-error">{error}</p>}

          <button type="submit" className="signup-submit" disabled={isSubmitting}>
            {isSubmitting ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="signup-footer">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>

      {showWelcomePopup && (
        <div className="signup-popup-overlay" onClick={handleCloseWelcomePopup}>
          <div
            className="signup-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-popup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="welcome-popup-title" className="signup-popup-title">
              환영합니다.
            </h2>
            <p className="signup-popup-message">회원가입이 완료되었습니다.</p>
            <button
              type="button"
              className="signup-popup-button"
              onClick={handleCloseWelcomePopup}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SignUpPage
