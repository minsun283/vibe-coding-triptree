import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ProductImageField from '@/components/products/ProductImageField'
import HomeNavbar from '@/components/home/HomeNavbar'
import {
  createInitialProductForm,
  DATE_TYPES,
  PRODUCT_CATEGORIES,
  PRODUCT_LOCATIONS,
  PRODUCT_TYPES,
  RECOMMENDED_SEASONS,
} from '@/constants/productData'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useCloudinaryWidget } from '@/hooks/useCloudinaryWidget'
import { createProduct } from '@/services/products'
import '@/pages/HomePage.css'
import './ProductCreatePage.css'

function ProductCreatePage() {
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [form, setForm] = useState(createInitialProductForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [createdProduct, setCreatedProduct] = useState(null)

  useEffect(() => {
    if (isAuthChecked && !isAdmin) {
      navigate('/', { replace: true })
    }
  }, [isAuthChecked, isAdmin, navigate])

  const handleImageUpload = useCallback((imageUrl) => {
    setForm((prev) => ({ ...prev, image: imageUrl }))
  }, [])

  const handleThumbnailUpload = useCallback((imageUrl) => {
    setForm((prev) => ({ ...prev, thumbnail: imageUrl }))
  }, [])

  const { openWidget, isReady, loadError, isConfigured, configMessage } =
    useCloudinaryWidget({
      onSuccess: handleImageUpload,
    })

  const {
    openWidget: openThumbnailWidget,
    isReady: isThumbnailReady,
    loadError: thumbnailLoadError,
    isConfigured: isThumbnailConfigured,
    configMessage: thumbnailConfigMessage,
  } = useCloudinaryWidget({
    onSuccess: handleThumbnailUpload,
  })

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, image: '' }))
  }

  const handleRemoveThumbnail = () => {
    setForm((prev) => ({ ...prev, thumbnail: '' }))
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleDateTypeChange = (dateType) => {
    setForm((prev) => ({
      ...prev,
      dateType,
      startDate: dateType === DATE_TYPES.PERIOD ? prev.startDate : '',
      endDate: dateType === DATE_TYPES.PERIOD ? prev.endDate : '',
    }))
  }

  const handleSeasonToggle = (season) => {
    setForm((prev) => {
      const isSelected = prev.recommendedSeason.includes(season)
      const recommendedSeason = isSelected
        ? prev.recommendedSeason.filter((item) => item !== season)
        : [...prev.recommendedSeason, season]

      return { ...prev, recommendedSeason }
    })
  }

  const handleProductTypeToggle = (productType) => {
    setForm((prev) => {
      const isSelected = prev.productType.includes(productType)
      const nextProductType = isSelected
        ? prev.productType.filter((item) => item !== productType)
        : [...prev.productType, productType]

      return { ...prev, productType: nextProductType }
    })
  }

  const handleProductCategoryToggle = (category) => {
    setForm((prev) => {
      const isSelected = prev.productCategory.includes(category)
      const nextProductCategory = isSelected
        ? prev.productCategory.filter((item) => item !== category)
        : [...prev.productCategory, category]

      return { ...prev, productCategory: nextProductCategory }
    })
  }

  const validateForm = () => {
    if (!form.sku.trim()) return 'SKU가 생성되지 않았습니다. 페이지를 새로고침해 주세요.'
    if (!form.name.trim()) return '상품 이름을 입력해 주세요.'
    if (!form.thumbnail.trim()) return '썸네일 이미지를 업로드해 주세요.'
    if (!form.price) return '상품 가격을 입력해 주세요.'
    if (Number(form.price) < 0) return '상품 가격은 0 이상이어야 합니다.'
    if (!form.dateType) return '날짜 유형을 선택해 주세요.'

    if (form.dateType === DATE_TYPES.PERIOD) {
      if (!form.startDate || !form.endDate) {
        return '기간 입력 시 시작일과 종료일을 모두 선택해 주세요.'
      }

      if (form.endDate < form.startDate) {
        return '종료일은 시작일 이후여야 합니다.'
      }
    }

    if (!form.location.trim()) return '장소를 선택해 주세요.'
    if (!form.recommendedSeason.length) return '추천 계절을 하나 이상 선택해 주세요.'
    if (!form.productType.length) return '상품 유형을 하나 이상 선택해 주세요.'
    if (!form.image.trim()) return '상품 이미지를 업로드해 주세요.'
    if (!form.description.trim()) return '상품 설명을 입력해 주세요.'
    return ''
  }

  const buildProductPayload = () => {
    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      thumbnail: form.thumbnail.trim(),
      price: Number(form.price),
      dateType: form.dateType,
      location: form.location.trim(),
      recommendedSeason: form.recommendedSeason,
      productType: form.productType,
      productCategory: form.productCategory,
      image: form.image.trim(),
      description: form.description.trim(),
    }

    if (form.dateType === DATE_TYPES.PERIOD) {
      payload.startDate = form.startDate
      payload.endDate = form.endDate
    }

    return payload
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
      const data = await createProduct(buildProductPayload())

      setCreatedProduct(data.product)
      setShowSuccessPopup(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false)
    navigate('/admin', { replace: true })
  }

  if (!isAuthChecked || !isAdmin) {
    return null
  }

  return (
    <div className="product-create-page">
      <div className="product-create-page__navbar">
        <div className="product-create-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
            hideLoginAction
          />
        </div>
      </div>

      <main className="product-create-page__content">
        <Link to="/admin" className="product-create-back">
          <ArrowLeft size={18} />
          관리자 대시보드로 돌아가기
        </Link>

        <div className="product-create-card">
          <header className="product-create-header">
            <h1 className="product-create-header__title">새 상품 등록</h1>
            <p className="product-create-header__subtitle">
              판매할 상품 정보를 입력해 주세요.
            </p>
          </header>

          <form className="product-create-form" onSubmit={handleSubmit}>
            <div className="product-create-form__grid">
              <div className="product-create-field">
                <label htmlFor="sku">SKU</label>
                <input
                  id="sku"
                  name="sku"
                  type="text"
                  value={form.sku}
                  readOnly
                  className="product-create-field__readonly"
                />
                <p className="product-create-field__hint">등록 시 자동 생성된 고유 SKU입니다.</p>
              </div>

              <div className="product-create-field">
                <label htmlFor="name">상품 이름</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="상품 이름을 입력하세요"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>

              <ProductImageField
                label="썸네일 이미지"
                imageUrl={form.thumbnail}
                onRemove={handleRemoveThumbnail}
                openWidget={openThumbnailWidget}
                isReady={isThumbnailReady}
                isConfigured={isThumbnailConfigured}
                configMessage={thumbnailConfigMessage}
                loadError={thumbnailLoadError}
              />

              <div className="product-create-field">
                <label htmlFor="price">상품 가격</label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="55"
                  value={form.price}
                  onChange={handleChange}
                />
              </div>

              <div className="product-create-field product-create-field--full">
                <span className="product-create-field__label">날짜</span>
                <div className="product-create-date-type" role="radiogroup" aria-label="날짜 유형">
                  <label className="product-create-date-type__option">
                    <input
                      type="radio"
                      name="dateType"
                      value={DATE_TYPES.ALWAYS}
                      checked={form.dateType === DATE_TYPES.ALWAYS}
                      onChange={() => handleDateTypeChange(DATE_TYPES.ALWAYS)}
                    />
                    <span className="product-create-date-type__control" aria-hidden="true" />
                    <span className="product-create-date-type__label">상시</span>
                  </label>
                  <label className="product-create-date-type__option">
                    <input
                      type="radio"
                      name="dateType"
                      value={DATE_TYPES.PERIOD}
                      checked={form.dateType === DATE_TYPES.PERIOD}
                      onChange={() => handleDateTypeChange(DATE_TYPES.PERIOD)}
                    />
                    <span className="product-create-date-type__control" aria-hidden="true" />
                    <span className="product-create-date-type__label">기간 입력</span>
                  </label>
                </div>

                {form.dateType === DATE_TYPES.ALWAYS ? (
                  <p className="product-create-field__hint">상시 판매 상품으로 등록됩니다.</p>
                ) : (
                  <div className="product-create-date-range">
                    <div className="product-create-field">
                      <label htmlFor="startDate">시작일</label>
                      <input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={form.startDate}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="product-create-field">
                      <label htmlFor="endDate">종료일</label>
                      <input
                        id="endDate"
                        name="endDate"
                        type="date"
                        min={form.startDate || undefined}
                        value={form.endDate}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="product-create-field">
                <label htmlFor="location">장소</label>
                <select
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                >
                  <option value="">장소를 선택하세요</option>
                  {PRODUCT_LOCATIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="product-create-field product-create-field--full">
                <span className="product-create-field__label">추천 계절</span>
                <div className="product-create-option-group" role="group" aria-label="추천 계절">
                  {RECOMMENDED_SEASONS.map((season) => {
                    const isSelected = form.recommendedSeason.includes(season)

                    return (
                      <button
                        key={season}
                        type="button"
                        className={`product-create-option-btn${isSelected ? ' is-selected' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => handleSeasonToggle(season)}
                      >
                        {season}
                      </button>
                    )
                  })}
                </div>
                <p className="product-create-field__hint">복수 선택이 가능합니다.</p>
              </div>

              <div className="product-create-field product-create-field--full">
                <span className="product-create-field__label">상품 유형</span>
                <div className="product-create-option-group" role="group" aria-label="상품 유형">
                  {PRODUCT_TYPES.map((type) => {
                    const isSelected = form.productType.includes(type)

                    return (
                      <button
                        key={type}
                        type="button"
                        className={`product-create-option-btn${isSelected ? ' is-selected' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => handleProductTypeToggle(type)}
                      >
                        {type}
                      </button>
                    )
                  })}
                </div>
                <p className="product-create-field__hint">복수 선택이 가능합니다.</p>
              </div>

              <div className="product-create-field product-create-field--full">
                <span className="product-create-field__label">상품분류</span>
                <div
                  className="product-create-checkbox-group"
                  role="group"
                  aria-label="상품분류"
                >
                  {PRODUCT_CATEGORIES.map((category) => {
                    const isChecked = form.productCategory.includes(category)
                    const inputId = `product-category-${category}`

                    return (
                      <label
                        key={category}
                        htmlFor={inputId}
                        className={`product-create-checkbox${isChecked ? ' is-checked' : ''}`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleProductCategoryToggle(category)}
                        />
                        <span className="product-create-checkbox__control" aria-hidden="true" />
                        <span className="product-create-checkbox__label">{category}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="product-create-field__hint">복수 선택이 가능합니다.</p>
              </div>

              <ProductImageField
                label="상품 이미지"
                imageUrl={form.image}
                onRemove={handleRemoveImage}
                openWidget={openWidget}
                isReady={isReady}
                isConfigured={isConfigured}
                configMessage={configMessage}
                loadError={loadError}
              />

              <div className="product-create-field product-create-field--full">
                <label htmlFor="description">상품 설명</label>
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  placeholder="상품에 대한 설명을 입력하세요"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && <p className="product-create-error">{error}</p>}

            <div className="product-create-actions">
              <Link to="/admin" className="product-create-btn product-create-btn--secondary">
                취소
              </Link>
              <button
                type="submit"
                className="product-create-btn product-create-btn--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? '등록 중...' : '상품 등록'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {showSuccessPopup && (
        <div className="product-create-popup-overlay" onClick={handleCloseSuccessPopup}>
          <div
            className="product-create-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-create-popup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="product-create-popup-title" className="product-create-popup__title">
              등록 완료
            </h2>
            <p className="product-create-popup__message">
              {createdProduct?.name
                ? `${createdProduct.name} 상품이 성공적으로 등록되었습니다.`
                : '상품이 성공적으로 등록되었습니다.'}
            </p>
            <button
              type="button"
              className="product-create-popup__button"
              onClick={handleCloseSuccessPopup}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductCreatePage
