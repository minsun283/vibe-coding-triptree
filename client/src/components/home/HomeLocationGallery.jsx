import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { HOME_LOCATION_SPOTS } from '@/constants/homeData'

function buildSpotLink(spot) {
  return `/products?location=${encodeURIComponent(spot.location)}`
}

function HomeLocationGallery() {
  const [activeId, setActiveId] = useState(HOME_LOCATION_SPOTS[0].id)

  return (
    <section className="home-locations" aria-label="지역별로 모아보기">
      <div className="home-container">
        <h2 className="home-locations__heading">지역별로 모아보기</h2>
        <div className="home-locations__gallery">
          {HOME_LOCATION_SPOTS.map((spot) => {
            const isActive = activeId === spot.id

            return (
              <Link
                key={spot.id}
                to={buildSpotLink(spot)}
                className={`home-locations__card${isActive ? ' is-active' : ''}`}
                aria-label={`${spot.name} 상품 보기`}
                onMouseEnter={() => setActiveId(spot.id)}
                onFocus={() => setActiveId(spot.id)}
                onClick={() => setActiveId(spot.id)}
              >
                <img
                  src={spot.image}
                  alt={spot.name}
                  className="home-locations__image"
                  loading="lazy"
                  decoding="async"
                />
                <div className="home-locations__overlay" />

                <div className="home-locations__collapsed-title" aria-hidden={isActive}>
                  {spot.name}
                </div>

                <div className="home-locations__expanded-content" aria-hidden={!isActive}>
                  <div className="home-locations__expanded-text">
                    {spot.subtitle && (
                      <p className="home-locations__subtitle">{spot.subtitle}</p>
                    )}
                    <h3 className="home-locations__title">{spot.name}</h3>
                  </div>
                  <span className="home-locations__arrow" aria-hidden="true">
                    <ArrowUpRight strokeWidth={2} />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default HomeLocationGallery
