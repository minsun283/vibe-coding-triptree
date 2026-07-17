const { SolapiMessageService } = require('solapi');

const QUOTE_ISSUED_SMS_TEXT =
  'TripTree에서 요청하신 견적서가 발행되었습니다.\nTripTree 홈페이지에 접속하여 견적 내용을 확인해 주세요.';

class SolapiSmsError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'SolapiSmsError';
    this.statusCode = statusCode;
  }
}

let messageServiceInstance = null;

const getSolapiConfig = () => {
  const apiKey = process.env.SOLAPI_API_KEY?.trim();
  const apiSecret = process.env.SOLAPI_API_SECRET?.trim();
  const from = process.env.SOLAPI_SENDER_NUMBER?.trim();

  if (!apiKey || !apiSecret || !from) {
    return null;
  }

  return { apiKey, apiSecret, from };
};

const isSolapiConfigured = () => Boolean(getSolapiConfig());

const getMessageService = () => {
  const config = getSolapiConfig();

  if (!config) {
    return null;
  }

  if (!messageServiceInstance) {
    messageServiceInstance = new SolapiMessageService(config.apiKey, config.apiSecret);
  }

  return messageServiceInstance;
};

const normalizePhoneNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('82')) {
    return `0${digits.slice(2)}`;
  }

  return digits;
};

const isValidKoreanMobileNumber = (phone) => /^01[016789]\d{7,8}$/.test(phone);

const sendQuoteIssuedSms = async ({ phone, text = QUOTE_ISSUED_SMS_TEXT }) => {
  const config = getSolapiConfig();

  if (!config) {
    return {
      sent: false,
      skipped: true,
      reason: 'SOLAPI 설정(SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER)이 없습니다.',
    };
  }

  const to = normalizePhoneNumber(phone);

  if (!isValidKoreanMobileNumber(to)) {
    throw new SolapiSmsError('유효하지 않은 고객 연락처입니다.');
  }

  const messageService = getMessageService();

  try {
    await messageService.send({
      to,
      from: config.from,
      text,
    });
  } catch (error) {
    const message = error?.message || 'SOLAPI 문자 발송에 실패했습니다.';
    throw new SolapiSmsError(message);
  }

  return {
    sent: true,
    to,
  };
};

module.exports = {
  QUOTE_ISSUED_SMS_TEXT,
  SolapiSmsError,
  isSolapiConfigured,
  normalizePhoneNumber,
  sendQuoteIssuedSms,
};
