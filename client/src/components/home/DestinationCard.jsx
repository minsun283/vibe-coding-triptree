import { memo } from 'react'
import { Link } from 'react-router-dom'

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price)
}

function DestinationCard({ product }) {
  const image = product.thumbnail || product.image

  return (
    <Link to={`/products/${product._id}`} className="home-destination-card">
      <img
        src={image}
        alt={product.name}
        className="home-destination-card__image"
        loading="lazy"
        decoding="async"
      />
      <div className="home-destination-card__overlay" />
      <div className="home-destination-card__info">
        <h3>{product.name}</h3>
        <p>
          {formatPrice(product.price)}
          <span>원</span>
        </p>
      </div>
    </Link>
  )
}

export default memo(DestinationCard)
