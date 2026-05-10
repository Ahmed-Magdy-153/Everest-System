'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/ui/Toast'
import { useAppStore } from '@/store'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const locale        = useAppStore(s => s.locale)
  const currentUser   = useAppStore(s => s.currentUser)
  const loading       = useAppStore(s => s.loading)
  const initialized   = useAppStore(s => s.initialized)
  const restoreSession= useAppStore(s => s.restoreSession)
  const addToast      = useAppStore(s => s.addToast)
  const router        = useRouter()

  // Set body locale class
  useEffect(() => {
    document.body.className = locale
  }, [locale])

  // On first mount, try to restore session from stored token
  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  // Redirect to login if definitely not authenticated (after restore attempt)
  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login')
    }
  }, [currentUser, loading, router])

  // Global handler: show a toast for any unhandled Promise rejection
  // This catches errors from fire-and-forget store mutations (addProject, etc.)
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || 'حدث خطأ غير متوقع'
      addToast(msg, 'ter')
    }
    window.addEventListener('unhandledrejection', handler)
    return () => window.removeEventListener('unhandledrejection', handler)
  }, [addToast])

  // Show loading spinner while restoring session
  if (loading || (!currentUser && !initialized)) {
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
