import { memo } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price)
}

function ProductCard({ product }) {
  const categories = Array.isArray(product.productCategory) ? product.productCategory : []
  const showRecommendedBadge = categories.includes('추천상품')

  return (
    <Link to={`/products/${product._id}`} className="products-card">
      <div className="products-card__media">
        <img
          src={product.thumbnail || product.image}
          alt={product.name}
          className="products-card__image"
          loading="lazy"
          decoding="async"
        />
        {showRecommendedBadge && (
          <div className="products-card__badges">
            <span className="products-card__badge">추천상품</span>
          </div>
        )}
      </div>

      <div className="products-card__body">
        <h2 className="products-card__name">{product.name}</h2>
        <p className="products-card__location">
          <MapPin size={14} />
          {product.location}
        </p>
        <p className="products-card__price">
          <strong>{formatPrice(product.price)}원</strong>
        </p>
      </div>
    </Link>
  )
}

export default memo(ProductCard)
