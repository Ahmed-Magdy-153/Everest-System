'use client'
import { useAppStore } from '@/store'

export default function ToastContainer() {
  const toasts = useAppStore(s => s.toasts)
  return (
    <div className="twc">
      {toasts.map(t => (
        <div key={t.id} className={`tos ${t.type}`}>{t.msg}</div>
      ))}
    </div>
  )
}
