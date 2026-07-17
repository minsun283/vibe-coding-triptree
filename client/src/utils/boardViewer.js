const VIEWER_ID_KEY = 'board_viewer_id'

function generateViewerId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : ((random % 4) + 8)
    return value.toString(16)
  })
}

export function getBoardViewerId() {
  try {
    const stored = localStorage.getItem(VIEWER_ID_KEY)

    if (stored) {
      return stored
    }

    const viewerId = generateViewerId()
    localStorage.setItem(VIEWER_ID_KEY, viewerId)
    return viewerId
  } catch {
    return generateViewerId()
  }
}
