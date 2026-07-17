export const BANK_ACCOUNT = {
  bank: import.meta.env.VITE_BANK_ACCOUNT_BANK?.trim() || '',
  accountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER?.trim() || '',
  accountHolder: import.meta.env.VITE_BANK_ACCOUNT_HOLDER?.trim() || '',
}

export function isBankAccountConfigured() {
  return Boolean(BANK_ACCOUNT.bank && BANK_ACCOUNT.accountNumber && BANK_ACCOUNT.accountHolder)
}

export function formatBankAccountLine(account) {
  if (!account) {
    return ''
  }

  return `${account.bank} ${account.accountNumber} (예금주: ${account.accountHolder})`
}
