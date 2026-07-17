import PortOne, { isPaymentError } from '@portone/browser-sdk/v2'

const PORTONE_STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID || ''
const PORTONE_CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY || ''

export function validatePortoneConfig() {
  if (!PORTONE_STORE_ID || !PORTONE_CHANNEL_KEY) {
    return '포트원 V2 연동 정보(storeId, channelKey)가 client/.env에 설정되지 않았습니다.'
  }

  if (!PORTONE_STORE_ID.startsWith('store-')) {
    return 'storeId가 올바르지 않습니다. 포트원 콘솔에서 store- 로 시작하는 Store ID를 설정해 주세요.'
  }

  return ''
}

export function createPaymentId() {
  return `payment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function buildQuotePaymentRequest({ form, quote, totalAmount, redirectUrl }) {
  const request = {
    storeId: PORTONE_STORE_ID,
    channelKey: PORTONE_CHANNEL_KEY,
    paymentId: createPaymentId(),
    orderName: quote.title,
    totalAmount,
    currency: 'KRW',
    customer: {
      fullName: form.name.trim(),
      phoneNumber: form.phone.trim(),
      email: form.email.trim(),
    },
    redirectUrl,
  }

  switch (form.paymentMethod) {
    case 'kakao_pay':
      return {
        ...request,
        payMethod: 'EASY_PAY',
        easyPay: { easyPayProvider: 'KAKAOPAY' },
      }
    case 'naver_pay':
      return {
        ...request,
        payMethod: 'EASY_PAY',
        easyPay: { easyPayProvider: 'NAVERPAY' },
      }
    case 'card':
    default:
      return { ...request, payMethod: 'CARD' }
  }
}

export async function requestPortonePayment(paymentRequest) {
  const response = await PortOne.requestPayment(paymentRequest)

  if (!response) {
    throw new Error('결제가 취소되었습니다.')
  }

  if (response.code) {
    throw new Error(response.message || '결제에 실패했습니다.')
  }

  return response
}

export function isPortonePaymentError(error) {
  return isPaymentError?.(error) ?? false
}

export function isPortoneReady() {
  return Boolean(PORTONE_STORE_ID && PORTONE_CHANNEL_KEY)
}
