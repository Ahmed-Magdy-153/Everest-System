'use client'
import { useAppStore } from '@/store'
import { TR, type TKey } from '@/i18n/translations'

export function useTranslation() {
  const locale = useAppStore(s => s.locale)
  const t = (key: TKey | string): string => (TR[locale] as Record<string,string>)[key] ?? key
  return { t, locale }
}
