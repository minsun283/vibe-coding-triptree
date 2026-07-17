export function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const result = [1]
  const showLeftEllipsis = currentPage > 3
  const showRightEllipsis = currentPage < totalPages - 2

  if (!showLeftEllipsis) {
    for (let page = 2; page <= Math.min(3, totalPages - 1); page += 1) {
      result.push(page)
    }

    if (totalPages > 4) {
      result.push('ellipsis')
    }
  } else if (!showRightEllipsis) {
    result.push('ellipsis')

    for (let page = Math.max(totalPages - 2, 2); page <= totalPages - 1; page += 1) {
      result.push(page)
    }
  } else {
    result.push('ellipsis')

    for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
      result.push(page)
    }

    result.push('ellipsis')
  }

  result.push(totalPages)

  return result
}
