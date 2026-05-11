'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/ui/Toast'
import { useAppStore } from '@/store'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const locale         = useAppStore(s => s.locale)
  const currentUser    = useAppStore(s => s.currentUser)
  const loading        = useAppStore(s => s.loading)
  const sessionChecked = useAppStore(s => s.sessionChecked)
  const restoreSession = useAppStore(s => s.restoreSession)
  const addToast       = useAppStore(s => s.addToast)
  const router         = useRouter()

  useEffect(() => { document.body.className = locale }, [locale])

  // Run once on mount — restore JWT session from localStorage
  useEffect(() => { restoreSession() }, [restoreSession])

  // Only redirect after restoreSession has finished — prevents flash-to-login on full reload
  useEffect(() => {
    if (sessionChecked && !loading && !currentUser) {
      router.replace('/login')
    }
  }, [sessionChecked, currentUser, loading, router])

  // Global handler for unhandled promise rejections from fire-and-forget mutations
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || 'حدث خطأ غير متوقع'
      addToast(msg, 'ter')
    }
    window.addEventListener('unhandledrejection', handler)
    return () => window.removeEventListener('unhandledrejection', handler)
  }, [addToast])

  // Show spinner while session is being restored
  if (!sessionChecked || loading) {
    return (
      <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
        <div style={{ color:'var(--mt)', fontSize:13, fontFamily:'Cairo,sans-serif' }}>جارٍ التحميل…</div>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div className="app">
      <Sidebar />
      <div className="mn">{children}</div>
      <ToastContainer />
    </div>
  )
}
