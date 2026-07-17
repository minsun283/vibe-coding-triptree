import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Lock, Mail, MapPin, User } from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { getCurrentUser, updateCurrentUser } from '@/services/api'
import '@/pages/HomePage.css'
import './ProfilePage.css'

const NAME_PATTERN = /^[a-zA-Z가-힣\s]+$/
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/

const initialForm = {
  name: '',
  email: '',
  address: '',
  currentPassword: '',
  password: '',
  confirmPassword: '',
}

function formatJoinDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function ProfilePage() {
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout, refreshUser } = useAuthUser()
  const [form, setForm] = useState(initialForm)
  const [joinedAt, setJoinedAt] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (isAuthChecked && !user) {
      navigate('/login', { replace: true, state: { from: '/profile' } })
    }
  }, [isAuthChecked, user, navigate])

  useEffect(() => {
    if (!isAuthChecked || !user) {
      return
    }

    const fetchProfile = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await getCurrentUser()
        const profile = data.user

        setForm({
          name: profile.name ?? '',
          email: profile.email ?? '',
          address: profile.address ?? '',
          currentPassword: '',
          password: '',
          confirmPassword: '',
        })
        setJoinedAt(profile.createdAt ?? '')
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [isAuthChecked, user])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setSuccessMessage('')
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

    const isChangingPassword =
      form.currentPassword || form.password || form.confirmPassword

    if (isChangingPassword) {
      if (!form.currentPassword) {
        return '현재 비밀번호를 입력해 주세요.'
      }

      if (!form.password) {
        return '새 비밀번호를 입력해 주세요.'
      }

      if (form.password.length < 8) {
        return '비밀번호는 8자 이상이어야 합니다.'
      }

      if (!PASSWORD_PATTERN.test(form.password)) {
        return '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.'
      }

      if (form.password !== form.confirmPassword) {
        return '새 비밀번호가 일치하지 않습니다.'
      }
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
      }

      if (form.password) {
        payload.currentPassword = form.currentPassword
        payload.password = form.password
      }

      const data = await updateCurrentUser(payload)
      await refreshUser()

      setForm((prev) => ({
        ...prev,
        currentPassword: '',
        password: '',
        confirmPassword: '',
      }))
      setSuccessMessage(data.message || '내 정보가 수정되었습니다.')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthChecked || !user) {
    return null
  }

  return (
    <div className="profile-page">
      <div className="profile-page__navbar">
        <div className="profile-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </div>

      <main className="profile-page__content">
        <header className="profile-page__topbar">
          <button
            type="button"
            className="profile-page__back"
            aria-label="뒤로 가기"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="profile-page__title">내정보보기</h1>
          <span className="profile-page__topbar-spacer" aria-hidden="true" />
        </header>

        {isLoading && <p className="profile-page__status">내 정보를 불러오는 중...</p>}

        {!isLoading && (
          <form className="profile-form" onSubmit={handleSubmit}>
            <section className="profile-form__section">
              <h2 className="profile-form__section-title">기본 정보</h2>

              <div className="profile-field">
                <label htmlFor="name">이름</label>
                <div className="profile-field__input-wrap">
                  <User size={18} className="profile-field__icon" aria-hidden="true" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor="email">이메일</label>
                <div className="profile-field__input-wrap">
                  <Mail size={18} className="profile-field__icon" aria-hidden="true" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor="address">주소</label>
                <div className="profile-field__input-wrap">
                  <MapPin size={18} className="profile-field__icon" aria-hidden="true" />
                  <input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="주소를 입력해 주세요 (선택)"
                    value={form.address}
                    onChange={handleChange}
                    autoComplete="street-address"
                  />
                </div>
              </div>

              <div className="profile-field profile-field--readonly">
                <label>가입일</label>
                <p className="profile-field__readonly">{formatJoinDate(joinedAt)}</p>
              </div>
            </section>

            <section className="profile-form__section">
              <h2 className="profile-form__section-title">비밀번호 변경</h2>
              <p className="profile-form__section-desc">변경하지 않으려면 비워 두세요.</p>

              <div className="profile-field">
                <label htmlFor="currentPassword">현재 비밀번호</label>
                <div className="profile-field__input-wrap">
                  <Lock size={18} className="profile-field__icon" aria-hidden="true" />
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={form.currentPassword}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="profile-field__toggle"
                    aria-label={showCurrentPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor="password">새 비밀번호</label>
                <div className="profile-field__input-wrap">
                  <Lock size={18} className="profile-field__icon" aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="profile-field__toggle"
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="profile-field">
                <label htmlFor="confirmPassword">새 비밀번호 확인</label>
                <div className="profile-field__input-wrap">
                  <Lock size={18} className="profile-field__icon" aria-hidden="true" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="profile-field__toggle"
                    aria-label={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </section>

            {error && <p className="profile-form__error">{error}</p>}
            {successMessage && <p className="profile-form__success">{successMessage}</p>}

            <button type="submit" className="profile-form__submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '변경사항 저장'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}

export default ProfilePage
