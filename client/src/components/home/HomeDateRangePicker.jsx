import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function parseDateValue(value) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function toDateValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDisplayDate(value) {
  const date = parseDateValue(value)

  if (!date) {
    return ''
  }

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function isSameDay(left, right) {
  if (!left || !right) {
    return false
  }

  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  )
}

function isBetweenDay(date, start, end) {
  if (!start || !end) {
    return false
  }

  const time = date.getTime()
  return time > start.getTime() && time < end.getTime()
}

function buildCalendarDays(viewDate) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const leadingEmpty = firstDay.getDay()
  const days = []

  for (let index = 0; index < leadingEmpty; index += 1) {
    days.push(null)
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day))
  }

  while (days.length % 7 !== 0) {
    days.push(null)
  }

  return days
}

function HomeDateRangePicker({
  startDate,
  endDate,
  onChange,
  className = '',
  emptyLabel = '출발일 · 기간 선택',
  pendingEndLabel = '종료일 선택',
  dialogAriaLabel = '여행 기간 선택',
  hintSelectingStart = '출발일을 선택해 주세요.',
  hintSelectingEnd = '종료일을 선택해 주세요.',
}) {
  const containerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => parseDateValue(startDate) ?? new Date())

  const start = parseDateValue(startDate)
  const end = parseDateValue(endDate)
  const today = useMemo(() => {
    const value = new Date()
    value.setHours(0, 0, 0, 0)
    return value
  }, [])

  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate])

  const displayText = useMemo(() => {
    if (start && end) {
      return `${formatDisplayDate(startDate)} ~ ${formatDisplayDate(endDate)}`
    }

    if (start) {
      return `${formatDisplayDate(startDate)} · ${pendingEndLabel}`
    }

    return emptyLabel
  }, [start, end, startDate, endDate, emptyLabel, pendingEndLabel])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (start) {
      setViewDate(start)
    }
  }, [startDate])

  const handleDaySelect = (date) => {
    if (date.getTime() < today.getTime()) {
      return
    }

    const nextValue = toDateValue(date)

    if (!startDate || (startDate && endDate)) {
      onChange({ startDate: nextValue, endDate: '' })
      return
    }

    if (nextValue < startDate) {
      onChange({ startDate: nextValue, endDate: '' })
      return
    }

    onChange({ startDate, endDate: nextValue })
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const monthLabel = viewDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className={`home-date-range${className ? ` ${className}` : ''}`} ref={containerRef}>
      <button
        type="button"
        className="home-date-range__trigger home-booking-value"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Calendar size={18} aria-hidden="true" />
        <span className="home-date-range__label">{displayText}</span>
      </button>

      {isOpen && (
        <div className="home-date-range__popover" role="dialog" aria-label={dialogAriaLabel}>
          <div className="home-date-range__header">
            <button
              type="button"
              className="home-date-range__nav-btn"
              aria-label="이전 달"
              onClick={handlePrevMonth}
            >
              <ChevronLeft size={18} />
            </button>
            <strong className="home-date-range__month">{monthLabel}</strong>
            <button
              type="button"
              className="home-date-range__nav-btn"
              aria-label="다음 달"
              onClick={handleNextMonth}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <p className="home-date-range__hint">
            {!startDate || endDate ? hintSelectingStart : hintSelectingEnd}
          </p>

          <div className="home-date-range__weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="home-date-range__grid">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <span key={`empty-${index}`} className="home-date-range__day is-empty" />
              }

              const isDisabled = date.getTime() < today.getTime()
              const isStart = isSameDay(date, start)
              const isEnd = isSameDay(date, end)
              const isInRange = isBetweenDay(date, start, end)
              const dayClassName = [
                'home-date-range__day',
                isDisabled ? 'is-disabled' : '',
                isStart ? 'is-start' : '',
                isEnd ? 'is-end' : '',
                isInRange ? 'is-in-range' : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <button
                  key={toDateValue(date)}
                  type="button"
                  className={dayClassName}
                  disabled={isDisabled}
                  aria-label={date.toLocaleDateString('ko-KR')}
                  aria-pressed={isStart || isEnd}
                  onClick={() => handleDaySelect(date)}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default HomeDateRangePicker
