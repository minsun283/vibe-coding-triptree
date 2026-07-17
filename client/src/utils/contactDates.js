export function formatContactDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatPreferredDateRange(startDate, endDate) {
  const start = formatContactDate(startDate)

  if (!start) {
    return '-'
  }

  const end = formatContactDate(endDate)

  if (!end || start === end) {
    return start
  }

  return `${start} ~ ${end}`
}
