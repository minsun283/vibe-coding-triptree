import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeDateRangePicker from '@/components/home/HomeDateRangePicker'
import HomeNavbar from '@/components/home/HomeNavbar'
import {
  EXPECTED_HEADCOUNTS,
  GROUP_TYPES,
  MAX_MEMO_LENGTH,
  PROGRAM_TYPES,
} from '@/constants/contactData'
import { useAuthUser } from '@/hooks/useAuthUser'
import { createContact } from '@/services/contacts'
import '@/pages/HomePage.css'
import './ContactPage.css'

const initialForm = {
  customerName: '',
  phone: '',
  email: '',
  groupType: '',
  expectedHeadcount: '',
  preferredDate: '',
  preferredEndDate: '',
  programType: '',
  memo: '',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ContactPage() {
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)

  useEffect(() => {
    if (!user) {
      return
    }

    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || user.name,
      email: prev.email || user.email || '',
    }))
  }, [user])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleOptionSelect = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePreferredDateChange = ({ startDate, endDate }) => {
    setForm((prev) => ({
      ...prev,
      preferredDate: startDate,
      preferredEndDate: endDate,
    }))
  }

  const validateForm = () => {
    if (!form.customerName.trim()) {
      return '이름을 입력해 주세요.'
    }

    if (!form.phone.trim()) {
      return '연락처를 입력해 주세요.'
    }

    if (!form.email.trim()) {
      return '이메일을 입력해 주세요.'
    }

    if (!EMAIL_PATTERN.test(form.email.trim())) {
      return '유효한 이메일 형식을 입력해 주세요.'
    }

    if (!form.groupType) {
      return '단체유형을 선택해 주세요.'
    }

    if (!form.expectedHeadcount) {
      return '예상 인원을 선택해 주세요.'
    }

    if (!form.programType) {
      return '단체프로그램을 선택해 주세요.'
    }

    if (form.memo.length > MAX_MEMO_LENGTH) {
      return `메모는 ${MAX_MEMO_LENGTH}자 이하로 입력해 주세요.`
    }

    if (form.preferredDate && !form.preferredEndDate) {
      return '종료일을 선택해 주세요.'
    }

    return ''
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
      const payload = {
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        groupType: form.groupType,
        expectedHeadcount: form.expectedHeadcount,
        programType: form.programType,
      }

      if (form.preferredDate) {
        payload.preferredDate = form.preferredDate
        payload.preferredEndDate = form.preferredEndDate || form.preferredDate
      }

      if (form.memo.trim()) {
        payload.memo = form.memo.trim()
      }

      await createContact(payload)
      window.dispatchEvent(new Event('contacts-updated'))
      setShowSuccessPopup(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false)
    setForm({
      ...initialForm,
      customerName: user?.name ?? '',
      email: user?.email ?? '',
    })
    navigate('/')
  }

  return (
    <div className="contact-page">
      <header className="contact-page__navbar">
        <div className="contact-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </header>

      <main className="contact-page__content">
        <div className="contact-page__header">
          <h1 className="contact-page__title">단체여행 견적요청</h1>
          <p className="contact-page__subtitle">
            단체 여행·행사·워크샵 상담을 요청해 주세요. 담당자가 확인 후 연락드립니다.
          </p>
        </div>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <div className="contact-field">
            <label htmlFor="customerName">
              이름
              <span className="contact-field__required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="customerName"
              name="customerName"
              type="text"
              placeholder="이름을 입력해 주세요"
              value={form.customerName}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </div>

          <div className="contact-field">
            <span className="contact-field__label">단체유형</span>
            <div className="contact-option-group" role="group" aria-label="단체유형">
              {GROUP_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`contact-option-btn${form.groupType === type ? ' is-selected' : ''}`}
                  aria-pressed={form.groupType === type}
                  onClick={() => handleOptionSelect('groupType', type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="contact-field">
            <span className="contact-field__label">단체프로그램</span>
            <div className="contact-option-group" role="group" aria-label="단체프로그램">
              {PROGRAM_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`contact-option-btn${form.programType === type ? ' is-selected' : ''}`}
                  aria-pressed={form.programType === type}
                  onClick={() => handleOptionSelect('programType', type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="contact-field">
            <span className="contact-field__label">예상 인원</span>
            <div className="contact-option-group" role="group" aria-label="예상 인원">
              {EXPECTED_HEADCOUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`contact-option-btn${form.expectedHeadcount === count ? ' is-selected' : ''}`}
                  aria-pressed={form.expectedHeadcount === count}
                  onClick={() => handleOptionSelect('expectedHeadcount', count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="contact-field">
            <span className="contact-field__label" id="preferred-date-label">
              희망 날짜
              <span className="contact-field__optional">(선택)</span>
            </span>
            <HomeDateRangePicker
              className="contact-date-range"
              startDate={form.preferredDate}
              endDate={form.preferredEndDate}
              onChange={handlePreferredDateChange}
              emptyLabel="시작일 · 종료일 선택"
              pendingEndLabel="종료일 선택"
              dialogAriaLabel="희망 기간 선택"
              hintSelectingStart="시작일을 선택해 주세요."
              hintSelectingEnd="종료일을 선택해 주세요."
            />
            <p className="contact-field__hint">달력에서 시작일과 종료일을 순서대로 선택해 주세요.</p>
          </div>

          <div className="contact-field">
            <label htmlFor="phone">
              연락처
              <span className="contact-field__required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              required
            />
          </div>

          <div className="contact-field contact-field--email">
            <label htmlFor="email">
              이메일
              <span className="contact-field__required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="contact-field">
            <label htmlFor="memo">
              메모
              <span className="contact-field__optional">(선택)</span>
            </label>
            <textarea
              id="memo"
              name="memo"
              rows={4}
              placeholder="요청 사항이나 문의 내용을 자유롭게 입력해 주세요"
              value={form.memo}
              onChange={handleChange}
              maxLength={MAX_MEMO_LENGTH}
            />
            <p className="contact-field__hint">
              {form.memo.length}/{MAX_MEMO_LENGTH}자
            </p>
          </div>

          {error && <p className="contact-form__error">{error}</p>}

          <div className="contact-form__actions">
            <button type="submit" className="contact-form__submit" disabled={isSubmitting}>
              {isSubmitting ? '접수 중...' : '견적서 요청하기'}
            </button>
          </div>
        </form>
      </main>

      {showSuccessPopup && (
        <div className="contact-popup-overlay" onClick={handleCloseSuccessPopup}>
          <div
            className="contact-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-popup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="contact-popup-title" className="contact-popup__title">
              상담 요청이 접수되었습니다
            </h2>
            <p className="contact-popup__text">
              담당자가 내용을 확인한 뒤 입력하신 연락처로 안내드리겠습니다.
            </p>
            <button type="button" className="contact-popup__btn" onClick={handleCloseSuccessPopup}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContactPage
