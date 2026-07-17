import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '@/components/products/ProductCard'
import ProductPagination from '@/components/common/ProductPagination'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { getProducts } from '@/services/products'
import '@/pages/HomePage.css'
import './ProductsPage.css'

const PRODUCTS_PER_PAGE = 6

function formatFilterDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function ProductsPage() {
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const locationFilter = searchParams.get('location') ?? ''
  const startDateFilter = searchParams.get('startDate') ?? ''
  const endDateFilter = searchParams.get('endDate') ?? ''
  const hasActiveFilters = Boolean(
    locationFilter || startDateFilter || endDateFilter,
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [locationFilter, startDateFilter, endDateFilter])

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await getProducts({
          page: currentPage,
          limit: PRODUCTS_PER_PAGE,
          location: locationFilter || undefined,
          startDate: startDateFilter || undefined,
          endDate: endDateFilter || undefined,
        })
        setProducts(data.products)
        setPagination(data.pagination)
      } catch (fetchError) {
        setError(fetchError.message)
        setProducts([])
        setPagination(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [currentPage, locationFilter, startDateFilter, endDateFilter])

  const totalItems = pagination?.totalItems ?? 0

  const filterSummary = useMemo(() => {
    const parts = []

    if (locationFilter) {
      parts.push(locationFilter)
    }

    if (startDateFilter && endDateFilter) {
      parts.push(
        `${formatFilterDate(startDateFilter)} ~ ${formatFilterDate(endDateFilter)}`,
      )
    } else if (startDateFilter) {
      parts.push(formatFilterDate(startDateFilter))
    } else if (endDateFilter) {
      parts.push(formatFilterDate(endDateFilter))
    }

    return parts.join(' · ')
  }, [locationFilter, startDateFilter, endDateFilter])

  return (
    <div className="products-page">
      <div className="products-page__navbar">
        <div className="products-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </div>

      <main className="products-page__content">
        {isLoading && <p className="products-page__status">상품 목록을 불러오는 중...</p>}
        {error && <p className="products-page__status products-page__status--error">{error}</p>}
        {!isLoading && !error && totalItems === 0 && (
          <section className="products-page__list">
            <header className="products-page__header">
              <h1 className="products-page__title">상품보기</h1>
              {hasActiveFilters && (
                <p className="products-page__filters">검색 조건: {filterSummary}</p>
              )}
            </header>
            <p className="products-page__status">
              {hasActiveFilters
                ? '선택한 조건에 맞는 상품이 없습니다.'
                : '등록된 상품이 없습니다.'}
            </p>
          </section>
        )}

        {!isLoading && !error && totalItems > 0 && (
          <section className="products-page__list">
            <header className="products-page__header">
              <h1 className="products-page__title">상품보기</h1>
              {hasActiveFilters ? (
                <p className="products-page__filters">검색 조건: {filterSummary}</p>
              ) : (
                <p className="products-page__count">총 {totalItems}개의 상품</p>
              )}
              {hasActiveFilters && (
                <p className="products-page__count">총 {totalItems}개의 상품</p>
              )}
            </header>

            <div className="products-page__grid">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {pagination && pagination.totalPages > 0 && (
              <ProductPagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                isLoading={isLoading}
                onPageChange={setCurrentPage}
                inputId="products-page-goto"
              />
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default ProductsPage
