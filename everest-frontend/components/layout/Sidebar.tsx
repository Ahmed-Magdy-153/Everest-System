'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useAppStore } from '@/store'

const PAGES = [
  { key: 'dashboard', ic: '📊', href: '/',          section: 'm' },
  { key: 'projects',  ic: '🏗',  href: '/projects',  section: 'm' },
  { key: 'capital',   ic: '💰', href: '/capital',   section: 'f' },
  { key: 'inventory', ic: '📦', href: '/inventory', section: 'f' },
  { key: 'expenses',  ic: '💸', href: '/expenses',  section: 'f' },
  { key: 'workers',   ic: '👷', href: '/workers',   section: 'o' },
  { key: 'reports',   ic: '📈', href: '/reports',   section: 'o' },
] as const

export default function Sidebar() {
  const pathname = usePathname()
  const { t, locale } = useTranslation()
  const setLocale = useAppStore(s => s.setLocale)
  const currentUser = useAppStore(s => s.currentUser)
  const logout = useAppStore(s => s.logout)
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const sections: Record<string, string> = {
    m: locale === 'ar' ? 'رئيسي' : 'Main',
    f: locale === 'ar' ? 'مالية' : 'Finance',
    o: locale === 'ar' ? 'عمليات' : 'Ops',
  }

  let lastSection = ''

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <div className="sb">
      <div className="sbl">
        <div className="li">🏛</div>
        <div className="lt">{t('logoTitle')}</div>
        <div className="ls">Mohamed Adel Co.</div>
      </div>

      <div className="sbn">
        {PAGES.map(page => {
          const showSection = page.section !== lastSection
          if (showSection) lastSection = page.section
          return (
            <div key={page.key}>
              {showSection && <div className="nss">{sections[page.section]}</div>}
              <Link
                href={page.href}
                className={`ni${isActive(page.href) ? ' active' : ''}`}
              >
                <span>{page.ic}</span>
                <span>{t(page.key as any)}</span>
              </Link>
            </div>
          )
        })}
      </div>

      <div className="sbu">
        <div className="uc">
          <div className="ava" style={{ background: currentUser?.color }}>{currentUser?.avatar ?? '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="un">{currentUser?.name}</div>
            <div className="ur">{t(currentUser?.role as any) ?? currentUser?.role}</div>
          </div>
          <button
            className="btn bghost btn-xs"
            title={locale === 'ar' ? 'EN' : 'ع'}
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          >
            {locale === 'ar' ? 'EN' : 'ع'}
          </button>
          <button
            className="btn bghost btn-xs"
            title="Logout"
            onClick={handleLogout}
            style={{ marginInlineStart: 4 }}
          >
            ⏻
          </button>
        </div>
      </div>
    </div>
  )
}
