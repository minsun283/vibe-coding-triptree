const PORTONE_API_BASE_URL = process.env.PORTONE_API_BASE_URL || 'https://api.portone.io';

class PortonePaymentVerificationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'PortonePaymentVerificationError';
    this.statusCode = statusCode;
  }
}

async function fetchPortonePayment(paymentId) {
  const apiSecret = process.env.PORTONE_API_SECRET;

  if (!apiSecret) {
    throw new PortonePaymentVerificationError(
      '서버에 포트원 API Secret(PORTONE_API_SECRET)이 설정되지 않았습니다.',
      500
    );
  }

  const response = await fetch(
    `${PORTONE_API_BASE_URL}/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `PortOne ${apiSecret}`,
      },
    }
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new PortonePaymentVerificationError(
      payload?.message || '결제 정보를 조회하지 못했습니다.',
      response.status === 404 ? 400 : 502
    );
  }

  return payload;
}

function getAllowedPaymentStatuses(paymentMethod) {
  if (paymentMethod === 'bank_transfer') {
    return ['PAID', 'VIRTUAL_ACCOUNT_ISSUED'];
  }

  return ['PAID'];
}

async function verifyPortonePayment({
  paymentId,
  expectedAmount,
  paymentMethod,
  transactionId,
}) {
  const normalizedPaymentId = paymentId?.trim();

  if (!normalizedPaymentId) {
    throw new PortonePaymentVerificationError('결제 ID(paymentId)가 필요합니다.');
  }

  const payment = await fetchPortonePayment(normalizedPaymentId);
  const allowedStatuses = getAllowedPaymentStatuses(paymentMethod);

  if (!allowedStatuses.includes(payment.status)) {
    throw new PortonePaymentVerificationError('결제가 완료되지 않았습니다.');
  }

  const paidAmount = payment.amount?.total;

  if (typeof paidAmount !== 'number' || paidAmount !== expectedAmount) {
    throw new PortonePaymentVerificationError('결제 금액이 주문 금액과 일치하지 않습니다.');
  }

  const normalizedTransactionId = transactionId?.trim();

  if (
    normalizedTransactionId &&
    payment.transactionId &&
    payment.transactionId !== normalizedTransactionId
  ) {
    throw new PortonePaymentVerificationError('결제 거래 정보가 일치하지 않습니다.');
  }

  return {
    paymentId: payment.id || normalizedPaymentId,
    transactionId: payment.transactionId || normalizedTransactionId || '',
    paidAmount,
    status: payment.status,
    paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(),
  };
}

module.exports = {
  verifyPortonePayment,
  PortonePaymentVerificationError,
};
