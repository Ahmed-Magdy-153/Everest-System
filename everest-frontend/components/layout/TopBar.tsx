'use client'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useAppStore } from '@/store'

const PAGE_TITLES: Record<string, string> = {
  '/':          'dashboard',
  '/projects':  'projects',
  '/capital':   'capital',
  '/inventory': 'inventory',
  '/expenses':  'expenses',
  '/workers':   'workers',
  '/reports':   'reports',
}

interface Props {
  onAddCapital?: () => void
  onAddProject?: () => void
  onQuickProject?: () => void
}

export default function TopBar({ onAddCapital, onAddProject, onQuickProject }: Props) {
  const pathname = usePathname()
  const { t, locale } = useTranslation()
  const setLocale = useAppStore(s => s.setLocale)

  const pageKey = PAGE_TITLES[pathname] ?? 'dashboard'

  const langBtn = (
    <button className="btn bou btn-sm" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>
      {locale === 'ar' ? 'English' : 'العربية'}
    </button>
  )

  const renderActions = () => {
    switch (pageKey) {
      case 'dashboard':
        return <>
          {langBtn}
          <button className="btn bok2 btn-sm" onClick={onAddCapital}>💰 {t('addCapital')}</button>
          <button className="btn bwa btn-sm" onClick={onQuickProject}>⚡ {t('quickProject')}</button>
          <button className="btn bpr btn-sm" onClick={onAddProject}>+ {locale === 'ar' ? 'إضافة' : 'Add'}</button>
        </>
      case 'projects':
        return <>
          {langBtn}
          <button className="btn bwa btn-sm" onClick={onQuickProject}>⚡ {t('quickProject')}</button>
          <button className="btn bpr btn-sm" onClick={onAddProject}>+ {t('addProject')}</button>
        </>
      case 'capital':
        return <>{langBtn}<button className="btn bok2 btn-sm" onClick={onAddCapital}>💰 {t('addCapital')}</button></>
      case 'inventory':
        return <>{langBtn}</>
      case 'expenses':
        return <>{langBtn}</>
      case 'workers':
        return <>{langBtn}</>
      case 'reports':
        return <>{langBtn}</>
      default:
        return <>{langBtn}</>
    }
  }

  return (
    <div className="topb">
      <div className="tbt">{t(pageKey as any)}</div>
      <div className="tba">{renderActions()}</div>
    </div>
  )
}
