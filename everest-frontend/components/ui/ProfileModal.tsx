'use client'
import { useState } from 'react'
import { useAppStore } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'

interface Props {
  onClose: () => void
}

type Tab = 'name' | 'password'

export default function ProfileModal({ onClose }: Props) {
  const { t, locale } = useTranslation()
  const currentUser    = useAppStore(s => s.currentUser)
  const updateProfile  = useAppStore(s => s.updateProfile)
  const changePassword = useAppStore(s => s.changePassword)
  const addToast       = useAppStore(s => s.addToast)

  const [tab, setTab]                     = useState<Tab>('name')
  const [name, setName]                   = useState(currentUser?.name ?? '')
  const [currentPwd, setCurrentPwd]       = useState('')
  const [newPwd, setNewPwd]               = useState('')
  const [confirmPwd, setConfirmPwd]       = useState('')
  const [loading, setLoading]             = useState(false)

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  const handleNameSave = async () => {
    if (!name.trim() || name.trim() === currentUser?.name) { onClose(); return }
    setLoading(true)
    try {
      await updateProfile(name.trim())
      addToast(t('profileUpdated'), 'tok')
      onClose()
    } catch (e: any) {
      addToast(e?.message ?? t('wrongPassword'), 'ter')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSave = async () => {
    if (newPwd !== confirmPwd) { addToast(t('passwordMismatch'), 'ter'); return }
    if (newPwd.length < 6)     { addToast(t('passwordMin'), 'ter'); return }
    setLoading(true)
    try {
      await changePassword(currentPwd, newPwd)
      addToast(t('passwordChanged'), 'tok')
      onClose()
    } catch (e: any) {
      addToast(e?.message ?? t('wrongPassword'), 'ter')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" dir={dir} style={{ maxWidth: 420 }}>
        <div className="modal-hd">
          <span>{t('editProfile')}</span>
          <button className="btn bou btn-xs" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            className={`btn btn-sm ${tab === 'name' ? 'bgprimary' : 'bou'}`}
            onClick={() => setTab('name')}
          >
            {t('changeName')}
          </button>
          <button
            className={`btn btn-sm ${tab === 'password' ? 'bgprimary' : 'bou'}`}
            onClick={() => setTab('password')}
          >
            {t('changePassword')}
          </button>
        </div>

        {tab === 'name' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="field-label">{t('fullName')}</label>
            <input
              className="inp"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('fullName')}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn bou" onClick={onClose} disabled={loading}>{t('cancel')}</button>
              <button className="btn bgprimary" onClick={handleNameSave} disabled={loading || !name.trim()}>
                {loading ? '…' : t('save')}
              </button>
            </div>
          </div>
        )}

        {tab === 'password' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="field-label">{t('currentPassword')}</label>
            <input
              className="inp"
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              placeholder={t('currentPassword')}
              autoFocus
            />
            <label className="field-label">{t('newPassword')}</label>
            <input
              className="inp"
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder={t('newPassword')}
            />
            <label className="field-label">{t('confirmPassword')}</label>
            <input
              className="inp"
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder={t('confirmPassword')}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn bou" onClick={onClose} disabled={loading}>{t('cancel')}</button>
              <button
                className="btn bgprimary"
                onClick={handlePasswordSave}
                disabled={loading || !currentPwd || !newPwd || !confirmPwd}
              >
                {loading ? '…' : t('save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
