import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import HomeDateRangePicker from '@/components/home/HomeDateRangePicker'
import HomeNavbar from '@/components/home/HomeNavbar'
import {
  EXPECTED_HEADCOUNTS,
  GROUP_TYPES,
  MAX_MEMO_LENGTH,
  MY_CONTACTS_PATH,
  PROGRAM_TYPES,
} from '@/constants/contactData'
import { useAuthUser } from '@/hooks/useAuthUser'
import { getContactById, updateContact } from '@/services/contacts'
import { formatContactDate } from '@/utils/contactDates'
import '@/pages/HomePage.css'
import './ContactPage.css'
import './MyContactsPage.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function MyContactEditPage() {
  const { contactId } = useParams()
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthChecked && !user) {
      navigate('/login', { replace: true, state: { from: `${MY_CONTACTS_PATH}/${contactId}/edit` } })
    }
  }, [isAuthChecked, user, navigate, contactId])

  useEffect(() => {
    if (!isAuthChecked || !user || !contactId) {
      return
    }

    let cancelled = false

    const loadContact = async () => {
      setIsLoading(true)
      setLoadError('')

      try {
        const data = await getContactById(contactId)

        if (cancelled) {
          return
        }

        const contact = data.contact

        setForm({
          customerName: contact.customerName ?? '',
          phone: contact.phone ?? '',
          email: contact.email ?? '',
          groupType: contact.groupType ?? '',
          expectedHeadcount: contact.expectedHeadcount ?? '',
          preferredDate: formatContactDate(contact.preferredDate),
          preferredEndDate: formatContactDate(contact.preferredEndDate),
          programType: contact.programType ?? '',
          memo: contact.memo ?? '',
        })
      } catch (fetchError) {
        if (!cancelled) {
          setLoadError(fetchError.message)
          setForm(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadContact()

    return () => {
      cancelled = true
    }
  }, [isAuthChecked, user, contactId])

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
        preferredDate: form.preferredDate || null,
        preferredEndDate: form.preferredEndDate || null,
        memo: form.memo.trim(),
      }

      await updateContact(contactId, payload)
      window.dispatchEvent(new Event('contacts-updated'))
      navigate(MY_CONTACTS_PATH, { replace: true })
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
        <div className="my-contacts-page__topbar contact-page__edit-topbar">
          <Link
            to={MY_CONTACTS_PATH}
            className="my-contacts-page__back"
            aria-label="내 견적요청서로 돌아가기"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="my-contacts-page__title">견적 요청 수정</h1>
          <span className="my-contacts-page__topbar-spacer" aria-hidden="true" />
        </div>

        {isLoading && <p className="contact-form__error">견적 요청 정보를 불러오는 중...</p>}

        {!isLoading && loadError && (
          <div className="contact-form__actions">
            <p className="contact-form__error">{loadError}</p>
            <Link to={MY_CONTACTS_PATH} className="contact-form__submit contact-form__submit--link">
              목록으로 돌아가기
            </Link>
          </div>
        )}

        {!isLoading && !loadError && form && (
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
                {isSubmitting ? '저장 중...' : '수정 완료'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

export default MyContactEditPage
