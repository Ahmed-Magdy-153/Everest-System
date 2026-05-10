'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store'

export default function LoginPage() {
  const login       = useAppStore(s => s.login)
  const currentUser = useAppStore(s => s.currentUser)
  const locale      = useAppStore(s => s.locale)
  const router      = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const ar = locale === 'ar'

  useEffect(() => { document.body.className = locale }, [locale])
  useEffect(() => { if (currentUser) router.replace('/') }, [currentUser, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError(ar ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields')
      return
    }
    setLoading(true)
    try {
      const ok = await login(email.trim(), password.trim())
      if (ok) {
        router.replace('/')
      } else {
        setError(ar ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password')
      }
    } catch {
      setError(ar ? 'تعذّر الاتصال بالخادم' : 'Could not reach the server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:24 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--n)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28 }}>🏛</div>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--n)' }}>
            {ar ? 'نظام إدارة الديكور' : 'Decoration Mgmt System'}
          </div>
          <div style={{ fontSize:13, color:'var(--mt)', marginTop:4 }}>
            {ar ? 'تسجيل الدخول للمتابعة' : 'Sign in to continue'}
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding:32 }}>
          <form onSubmit={handleSubmit} noValidate>
            <div className="fg" style={{ marginBottom:18 }}>
              <label className="fl">{ar ? 'البريد الإلكتروني' : 'Email'}</label>
              <input className="fc" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@everest.com" autoComplete="email" dir="ltr" />
            </div>
            <div className="fg" style={{ marginBottom:24 }}>
              <label className="fl">{ar ? 'كلمة المرور' : 'Password'}</label>
              <input className="fc" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" dir="ltr" />
            </div>

            {error && (
              <div className="al-er" style={{ marginBottom:18, padding:'10px 14px', borderRadius:8, fontSize:13 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn bpr" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
              {loading ? (ar ? 'جارٍ الدخول...' : 'Signing in...') : (ar ? 'تسجيل الدخول' : 'Sign In')}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop:20, padding:'12px 16px', background:'var(--bg)', borderRadius:8, fontSize:12, color:'var(--mt)' }}>
            <div style={{ fontWeight:600, marginBottom:6 }}>{ar ? 'بيانات تجريبية:' : 'Demo credentials:'}</div>
            <div>admin@everest.com — admin123</div>
            <div>manager@everest.com — manager123</div>
          </div>
        </div>
      </div>
    </div>
  )
}
