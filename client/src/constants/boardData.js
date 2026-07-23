export const BOARD_TABS = [
  { id: 'notice', label: '공지사항' },
  { id: 'inquiry', label: '문의하기' },
  { id: 'reviews', label: '고객후기' },
  { id: 'resources', label: '자료실' },
]

export function getBoardTabFromParam(tabParam) {
  if (tabParam === 'inquiry') {
    return 'inquiry'
  }

  if (tabParam === 'reviews') {
    return 'reviews'
  }

  if (tabParam === 'resources') {
    return 'resources'
  }

  return 'notice'
}

export function getBoardTabPath(tabId) {
  if (tabId === 'notice') {
    return '/board'
  }

  return `/board?tab=${tabId}`
}
