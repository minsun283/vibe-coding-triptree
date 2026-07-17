import { CONTACT_PATH } from '@/constants/contactData'

// https://unsplash.com/photos/2NgBQ6TAbRw
const HERO_BG_PHOTO = 'photo-1776419027356-7badf2c6b9cb'

function buildHeroBgUrl(width, quality = 90) {
  return `https://images.unsplash.com/${HERO_BG_PHOTO}?auto=format&fit=crop&w=${width}&q=${quality}`
}

export const HERO_BG_IMAGE = buildHeroBgUrl(2400)
export const HERO_BG_IMAGE_SRCSET = [
  `${buildHeroBgUrl(1600, 85)} 1600w`,
  `${buildHeroBgUrl(2400, 90)} 2400w`,
  `${buildHeroBgUrl(3200, 90)} 3200w`,
].join(', ')

export const BOARD_REVIEWS_PATH = '/board?tab=reviews'

export const NAV_ITEMS = [
  { label: '전체상품', to: '/products' },
  { label: '단체상품', to: CONTACT_PATH },
  { label: '게시판', to: '/board' },
]

export const HOME_DESTINATION_TABS = [
  { id: 'best', label: 'BEST', category: '추천상품' },
  { id: 'summer', label: '여름엔 여기!', category: '여름엔 여기!' },
  { id: 'golf', label: '골프여행', category: '골프여행' },
]

export const HOME_LOCATION_SPOTS = [
  {
    id: 'jeju',
    name: '제주도',
    subtitle: '제주로 떠나봐요',
    location: '제주도',
    image: '/images/jeju.png',
  },
  {
    id: 'ulleungdo',
    name: '울릉도',
    subtitle: '울릉도로 떠나봐요',
    location: '울릉도',
    image: '/images/ulleungdo.png',
  },
  {
    id: 'gangwon',
    name: '강원도',
    subtitle: '강원도로 떠나봐요',
    location: '강원도',
    image:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'busan',
    name: '부산',
    subtitle: '부산으로 떠나봐요',
    location: '부산',
    image: '/images/busan.png',
  },
]

export const HOME_VIDEOS = [
  {
    id: 'LwB50KYrEto',
    url: 'https://youtu.be/LwB50KYrEto?si=mz--EGtOIC3pp6p0',
    embedUrl: 'https://www.youtube.com/embed/LwB50KYrEto',
    title: '동해 묵호항 여행 제대로 터졌다… 해랑전망대·논골담길·어달삼거리 핫플 총정리｜여행비 환급 꿀팁',
    description: '동해 묵호항 여행 코스와 핫플을 영상으로 미리 확인해 보세요.',
    channel: '동네형',
  },
  {
    id: 'jnkl64691hE',
    url: 'https://youtu.be/jnkl64691hE?si=jGJ7dyH8pRPh7mA7',
    embedUrl: 'https://www.youtube.com/embed/jnkl64691hE',
    title: '울릉도 자유여행 가기 전 꼭 보세요｜3년 차 현지인의 비용·렌트카·숙소·독도 꿀팁 총정리',
    description: '울릉도 자유여행 준비에 필요한 꿀팁을 영상으로 확인해 보세요.',
    channel: '울릉뚱땅',
  },
  {
    id: '6KdGU-9V0NE',
    url: 'https://youtu.be/6KdGU-9V0NE?si=X-mZVKaVVGwQ0V5s',
    embedUrl: 'https://www.youtube.com/embed/6KdGU-9V0NE',
    title: '군산 여행 실패없는 찐코스 14곳 완벽 정리 (맛집·카페·숙소)',
    description: '군산 여행 맛집·카페·숙소 코스를 영상으로 미리 확인해 보세요.',
    channel: '맛쫑tour',
  },
]
