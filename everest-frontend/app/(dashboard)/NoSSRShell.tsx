'use client'
import dynamic from 'next/dynamic'

const DashboardShell = dynamic(() => import('./DashboardShell'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F4F5F8' }}>
      <div style={{ color: '#6B7799', fontSize: 13, fontFamily: 'Cairo,sans-serif' }}>جارٍ التحميل…</div>
    </div>
  ),
})

export default function NoSSRShell({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
