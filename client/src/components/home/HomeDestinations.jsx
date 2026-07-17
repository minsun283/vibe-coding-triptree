import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import DestinationCard from './DestinationCard'
import { HOME_DESTINATION_TABS } from '@/constants/homeData'
import { getProducts } from '@/services/products'

const DESKTOP_VISIBLE_COUNT = 3
const MOBILE_VISIBLE_COUNT = 1
const MOBILE_MEDIA_QUERY = '(max-width: 900px)'

function getVisibleCount() {
  if (typeof window === 'undefined') {
    return DESKTOP_VISIBLE_COUNT
  }

  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
    ? MOBILE_VISIBLE_COUNT
    : DESKTOP_VISIBLE_COUNT
}

function HomeDestinations() {
  const [activeTabId, setActiveTabId] = useState(HOME_DESTINATION_TABS[0].id)
  const [products, setProducts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(getVisibleCount)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const activeTab =
    HOME_DESTINATION_TABS.find((tab) => tab.id === activeTabId) ?? HOME_DESTINATION_TABS[0]

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)

    const handleViewportChange = () => {
      setVisibleCount(mediaQuery.matches ? MOBILE_VISIBLE_COUNT : DESKTOP_VISIBLE_COUNT)
      setCurrentIndex(0)
    }

    mediaQuery.addEventListener('change', handleViewportChange)

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange)
    }
  }, [])

  useEffect(() => {
    const fetchTabProducts = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await getProducts({
          page: 1,
          limit: 12,
          category: activeTab.category,
        })

        setProducts(data.products ?? [])
        setCurrentIndex(0)
      } catch (fetchError) {
        setError(fetchError.message)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTabProducts()
  }, [activeTab.category])

  const visibleProducts = products.slice(currentIndex, currentIndex + visibleCount)
  const canSlidePrev = currentIndex > 0
  const canSlideNext = currentIndex + visibleCount < products.length
  const showNavigation = products.length > visibleCount

  const handlePrev = () => {
    if (!canSlidePrev) {
      return
    }

    setCurrentIndex((prev) => Math.max(prev - visibleCount, 0))
  }

  const handleNext = () => {
    if (!canSlideNext) {
      return
    }

    setCurrentIndex((prev) =>
      Math.min(prev + visibleCount, Math.max(products.length - visibleCount, 0)),
    )
  }

  const handleTabChange = (tabId) => {
    if (tabId === activeTabId) {
      return
    }

    setActiveTabId(tabId)
  }

  return (
    <section className="home-destinations" id="destination">
      <div className="home-container">
        <div className="home-destinations__header">
          <div>
            <p className="home-destinations__eyebrow">Our Destination</p>
            <h2 className="home-destinations__title">
              Your Journey to the Perfect
              <br />
              Destination Begins Here
            </h2>
          </div>
        </div>

        <div className="home-destinations__tabs" role="tablist" aria-label="추천 상품 탭">
          {HOME_DESTINATION_TABS.map((tab) => {
            const isActive = tab.id === activeTabId

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`home-destinations__tab${isActive ? ' home-destinations__tab--active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {isLoading && (
          <p className="home-destinations__status">상품을 불러오는 중...</p>
        )}

        {!isLoading && error && (
          <p className="home-destinations__status home-destinations__status--error">{error}</p>
        )}

        {!isLoading && !error && products.length === 0 && (
          <p className="home-destinations__status">
            {activeTabId === 'best'
              ? '등록된 추천 상품이 없습니다.'
              : `${activeTab.label} 카테고리에 등록된 상품이 없습니다.`}
          </p>
        )}

        {!isLoading && !error && visibleProducts.length > 0 && (
          <div className="home-destinations__carousel">
            {showNavigation && (
              <button
                type="button"
                className="home-destinations__nav-btn home-destinations__nav-btn--side"
                aria-label="이전"
                disabled={!canSlidePrev}
                onClick={handlePrev}
              >
                <ArrowLeft size={18} />
              </button>
            )}

            <div className="home-destinations__viewport">
              <div className="home-destinations__grid">
                {visibleProducts.map((product) => (
                  <DestinationCard key={product._id} product={product} />
                ))}
              </div>
            </div>

            {showNavigation && (
              <button
                type="button"
                className="home-destinations__nav-btn home-destinations__nav-btn--side"
                aria-label="다음"
                disabled={!canSlideNext}
                onClick={handleNext}
              >
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && showNavigation && (
          <div className="home-destinations__nav home-destinations__nav--bottom">
            <button
              type="button"
              className="home-destinations__nav-btn"
              aria-label="이전"
              disabled={!canSlidePrev}
              onClick={handlePrev}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              className="home-destinations__nav-btn"
              aria-label="다음"
              disabled={!canSlideNext}
              onClick={handleNext}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default HomeDestinations
