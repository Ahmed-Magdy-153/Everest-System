import { DEFAULT_LOCALE } from '@/constants/config'
import type { Locale } from '@/types'

// Replace with real locale context when i18n is wired up
export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  return { locale: DEFAULT_LOCALE, setLocale: () => {} }
}
