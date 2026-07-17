import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import HomeDateRangePicker from '@/components/home/HomeDateRangePicker'
import { PRODUCT_LOCATIONS } from '@/constants/productData'

function HomeHero() {
  const navigate = useNavigate()
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchError, setSearchError] = useState('')

  const handleDateRangeChange = ({ startDate: nextStartDate, endDate: nextEndDate }) => {
    setStartDate(nextStartDate)
    setEndDate(nextEndDate)
    setSearchError('')
  }

  const handleSearch = (event) => {
    event.preventDefault()
    setSearchError('')

    const hasLocation = Boolean(location)
    const hasCompleteRange = Boolean(startDate && endDate)
    const hasPartialRange = Boolean(startDate || endDate) && !hasCompleteRange

    if (!hasLocation && !hasCompleteRange) {
      setSearchError(
        hasPartialRange
          ? '기간을 모두 선택해 주세요.'
          : '장소 또는 기간을 선택해 주세요.',
      )
      return
    }

    if (hasCompleteRange && endDate < startDate) {
      setSearchError('종료일은 시작일 이후여야 합니다.')
      return
    }

    const params = new URLSearchParams()

    if (hasLocation) {
      params.set('location', location)
    }

    if (hasCompleteRange) {
      params.set('startDate', startDate)
      params.set('endDate', endDate)
    }

    navigate(`/products?${params.toString()}`)
  }

  return (
    <div className="home-hero__content">
      <div className="home-hero__center">
        <h1 className="home-hero__brand">당신의 다음 여행을 찾아보세요.</h1>

        <form className="home-hero__booking" onSubmit={handleSearch}>
          <div className="home-booking-field home-booking-field--location">
            <div className="home-booking-value">
              <MapPin size={18} aria-hidden="true" />
              <select
                className="home-booking-select"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                aria-label="장소 선택"
              >
                <option value="">장소 선택</option>
                {PRODUCT_LOCATIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="home-booking-divider" aria-hidden="true" />

          <div className="home-booking-field home-booking-field--range">
            <HomeDateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateRangeChange}
            />
          </div>

          <button type="submit" className="home-booking-submit">
            검색
          </button>

          {searchError && (
            <p className="home-booking-error">{searchError}</p>
          )}
        </form>
      </div>
    </div>
  )
}

export default HomeHero
