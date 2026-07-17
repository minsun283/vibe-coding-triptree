export const RECOMMENDED_SEASONS = ['봄', '여름', '가을', '겨울']
export const GROUP_TYPES = ['기업', '학교', '공공기관', '동호회', '기타']
export const PRODUCT_TYPES = ['스포츠강습', '워크샵', '여행', '기타']
export const PRODUCT_CATEGORIES = ['추천상품', 'NEW', 'BEST', '여름엔 여기!', '골프여행']
export const PRODUCT_LOCATIONS = [
  '서울',
  '경기도',
  '인천',
  '강원도',
  '전라북도',
  '전라남도',
  '충청북도',
  '충청남도',
  '경상북도',
  '경상남도',
  '부산',
  '제주도',
  '울릉도',
]
export const DATE_TYPES = {
  ALWAYS: '상시',
  PERIOD: '기간',
}

const SKU_MAX_LENGTH = 8
const SKU_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateUniqueSku() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(SKU_MAX_LENGTH)
    crypto.getRandomValues(bytes)

    return Array.from(bytes, (byte) => SKU_CHARS[byte % SKU_CHARS.length]).join('')
  }

  return Array.from(
    { length: SKU_MAX_LENGTH },
    () => SKU_CHARS[Math.floor(Math.random() * SKU_CHARS.length)]
  ).join('')
}

export function createInitialProductForm() {
  return {
    sku: generateUniqueSku(),
    name: '',
    thumbnail: '',
    price: '',
    dateType: DATE_TYPES.ALWAYS,
    startDate: '',
    endDate: '',
    location: '',
    recommendedSeason: [],
    groupType: [],
    productType: [],
    productCategory: [],
    image: '',
    description: '',
  }
}

function formatDateForInput(dateValue) {
  if (!dateValue) {
    return ''
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

export function mapProductToForm(product) {
  return {
    sku: product.sku || '',
    name: product.name || '',
    thumbnail: product.thumbnail || '',
    price: product.price ?? '',
    dateType: product.dateType || DATE_TYPES.ALWAYS,
    startDate: formatDateForInput(product.startDate),
    endDate: formatDateForInput(product.endDate),
    location: product.location || '',
    recommendedSeason: Array.isArray(product.recommendedSeason) ? product.recommendedSeason : [],
    groupType: Array.isArray(product.groupType) ? product.groupType : [],
    productType: Array.isArray(product.productType) ? product.productType : [],
    productCategory: Array.isArray(product.productCategory) ? product.productCategory : [],
    image: product.image || '',
    description: product.description || '',
  }
}
