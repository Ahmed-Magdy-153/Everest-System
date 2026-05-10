import type { Locale } from '@/types'

export function formatCurrency(amount: number, locale: Locale, currency = 'SAR') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(new Date(date))
}
