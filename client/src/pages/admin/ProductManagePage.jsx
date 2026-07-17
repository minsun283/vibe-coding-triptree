import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Filter, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import ProductPagination from '@/components/common/ProductPagination'
import HomeNavbar from '@/components/home/HomeNavbar'
import { PRODUCT_TYPES } from '@/constants/productData'
import { useAuthUser } from '@/hooks/useAuthUser'
import { deleteProduct, getProducts } from '@/services/products'
import '@/pages/HomePage.css'
import './ProductManagePage.css'

const PRODUCTS_PER_PAGE = 6

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price)
}

function formatCategory(productType) {
  if (Array.isArray(productType)) {
    return productType.join(', ')
  }

  return productType || '-'
}

function ProductManagePage() {
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (isAuthChecked && !isAdmin) {
      navigate('/', { replace: true })
    }
  }, [isAuthChecked, isAdmin, navigate])

  useEffect(() => {
    if (!isAuthChecked || !isAdmin) {
      return
    }

    const fetchProducts = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await getProducts({ page: currentPage, limit: PRODUCTS_PER_PAGE })
        setProducts(data.products)
        setPagination(data.pagination)
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [isAuthChecked, isAdmin, currentPage])

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()

    return products.filter((product) => {
      const matchesKeyword = !keyword || product.name.toLowerCase().includes(keyword)
      const categories = Array.isArray(product.productType)
        ? product.productType
        : [product.productType]
      const matchesCategory =
        !selectedCategory || categories.includes(selectedCategory)

      return matchesKeyword && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  const handleDelete = async (product) => {
    const confirmed = window.confirm(`"${product.name}" 상품을 삭제하시겠습니까?`)

    if (!confirmed) {
      return
    }

    setDeletingId(product._id)
    setError('')

    try {
      await deleteProduct(product._id)

      if (products.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1)
        return
      }

      const data = await getProducts({ page: currentPage, limit: PRODUCTS_PER_PAGE })
      setProducts(data.products)
      setPagination(data.pagination)
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAuthChecked || !isAdmin) {
    return null
  }

  return (
    <div className="product-manage-page">
      <div className="product-manage-page__navbar">
        <div className="product-manage-page__navbar-inner">
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

      <main className="product-manage-page__content">
        <header className="product-manage-topbar">
          <Link to="/admin" className="product-manage-topbar__title">
            <ArrowLeft size={20} />
            상품 관리
          </Link>

          <Link to="/admin/products/new" className="product-manage-topbar__cta">
            <Plus size={18} />
            새 상품 등록
          </Link>
        </header>

        <section className="product-manage-panel">
          <div className="product-manage-toolbar">
            <label className="product-manage-search">
              <Search size={18} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="상품명으로 검색..."
              />
            </label>

            <button
              type="button"
              className={`product-manage-filter-btn${isFilterOpen ? ' is-active' : ''}`}
              onClick={() => setIsFilterOpen((prev) => !prev)}
            >
              <Filter size={16} />
              필터
            </button>
          </div>

          {isFilterOpen && (
            <div className="product-manage-filters">
              <button
                type="button"
                className={`product-manage-filter-chip${selectedCategory === '' ? ' is-selected' : ''}`}
                onClick={() => setSelectedCategory('')}
              >
                전체
              </button>
              {PRODUCT_TYPES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`product-manage-filter-chip${
                    selectedCategory === category ? ' is-selected' : ''
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {error && <p className="product-manage-message product-manage-message--error">{error}</p>}

          <div className="product-manage-table-wrap">
            <table className="product-manage-table">
              <thead>
                <tr>
                  <th scope="col">이미지</th>
                  <th scope="col">상품명</th>
                  <th scope="col">카테고리</th>
                  <th scope="col">가격</th>
                  <th scope="col">액션</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="product-manage-table__empty">
                      상품 목록을 불러오는 중...
                    </td>
                  </tr>
                )}

                {!isLoading && filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="product-manage-table__empty">
                      {products.length === 0
                        ? '등록된 상품이 없습니다.'
                        : '검색 결과가 없습니다.'}
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredProducts.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <img
                          src={product.thumbnail || product.image}
                          alt={product.name}
                          className="product-manage-table__image"
                        />
                      </td>
                      <td className="product-manage-table__name">{product.name}</td>
                      <td className="product-manage-table__category">
                        {formatCategory(product.productType)}
                      </td>
                      <td className="product-manage-table__price">
                        <strong>{formatPrice(product.price)}원</strong>
                      </td>
                      <td>
                        <div className="product-manage-table__actions">
                          <Link
                            to={`/admin/products/${product._id}/edit`}
                            className="product-manage-table__action"
                            aria-label={`${product.name} 수정`}
                            title="상품 수정"
                          >
                            <Pencil size={16} />
                          </Link>
                          <button
                            type="button"
                            className="product-manage-table__action product-manage-table__action--danger"
                            aria-label={`${product.name} 삭제`}
                            onClick={() => handleDelete(product)}
                            disabled={deletingId === product._id}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 0 && (
            <ProductPagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              isLoading={isLoading}
              onPageChange={setCurrentPage}
              inputId="product-page-goto"
            />
          )}
        </section>
      </main>
    </div>
  )
}

export default ProductManagePage
