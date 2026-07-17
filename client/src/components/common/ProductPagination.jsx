import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPageNumbers } from '@/utils/pagination'
import './ProductPagination.css'

function ProductPagination({
  currentPage,
  totalPages,
  isLoading = false,
  onPageChange,
  inputId = 'page-goto',
}) {
  const [goToValue, setGoToValue] = useState('')

  if (totalPages <= 0) {
    return null
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages)

  const handleGoToPage = (event) => {
    event.preventDefault()

    const page = Number.parseInt(goToValue, 10)

    if (Number.isNaN(page) || page < 1 || page > totalPages) {
      return
    }

    onPageChange(page)
    setGoToValue('')
  }

  return (
    <div className="product-pagination">
      <button
        type="button"
        className="product-pagination__nav"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || isLoading}
        aria-label="이전 페이지"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="product-pagination__pages">
        {pageNumbers.map((page, index) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="product-pagination__ellipsis">
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              className={`product-pagination__page${page === currentPage ? ' is-active' : ''}`}
              onClick={() => onPageChange(page)}
              disabled={isLoading}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        className="product-pagination__nav"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || isLoading}
        aria-label="다음 페이지"
      >
        <ChevronRight size={18} />
      </button>

      <form className="product-pagination__goto" onSubmit={handleGoToPage}>
        <label htmlFor={inputId}>Go to:</label>
        <input
          id={inputId}
          type="number"
          min="1"
          max={totalPages}
          value={goToValue}
          onChange={(event) => setGoToValue(event.target.value)}
          placeholder="e.g. 10"
        />
      </form>
    </div>
  )
}

export default ProductPagination
