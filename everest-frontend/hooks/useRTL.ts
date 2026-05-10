import { useLocale } from './useLocale'

export function useRTL() {
  const { locale } = useLocale()
  return { isRTL: locale === 'ar', dir: locale === 'ar' ? 'rtl' : 'ltr' }
}
