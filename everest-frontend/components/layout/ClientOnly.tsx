'use client'
import { useEffect, useState } from 'react'

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return (
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'var(--bg)', fontFamily:'Cairo,sans-serif', direction:'rtl' }}>
      <div style={{ color:'var(--m)', fontSize:13 }}>جارٍ التحميل…</div>
    </div>
  )
  return <>{children}</>
}
