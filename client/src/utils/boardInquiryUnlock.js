const UNLOCKED_STORAGE_PREFIX = 'board_inquiry_unlocked_'
const MY_INQUIRIES_KEY = 'board_my_inquiries'

function readMyInquiries() {
  try {
    const raw = sessionStorage.getItem(MY_INQUIRIES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeMyInquiries(items) {
  try {
    sessionStorage.setItem(MY_INQUIRIES_KEY, JSON.stringify(items))
  } catch {
    // sessionStorage unavailable
  }
}

export function getUnlockedInquiry(postId) {
  try {
    const raw = sessionStorage.getItem(`${UNLOCKED_STORAGE_PREFIX}${postId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setUnlockedInquiry(postId, post) {
  try {
    sessionStorage.setItem(
      `${UNLOCKED_STORAGE_PREFIX}${postId}`,
      JSON.stringify({
        content: post.content,
        reply: post.reply,
        repliedAt: post.repliedAt,
        viewCount: post.viewCount,
      })
    )
  } catch {
    // sessionStorage unavailable
  }
}

export function clearUnlockedInquiry(postId) {
  try {
    sessionStorage.removeItem(`${UNLOCKED_STORAGE_PREFIX}${postId}`)
  } catch {
    // sessionStorage unavailable
  }
}

export function addMyInquiry(postId, password) {
  const items = readMyInquiries()
  items[postId] = { password }
  writeMyInquiries(items)
}

export function isMyInquiry(postId) {
  return Boolean(readMyInquiries()[postId])
}

export function getMyInquiryPassword(postId) {
  return readMyInquiries()[postId]?.password ?? ''
}

export function removeMyInquiry(postId) {
  const items = readMyInquiries()
  delete items[postId]
  writeMyInquiries(items)
}
