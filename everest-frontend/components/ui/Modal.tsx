'use client'
import { useTranslation } from '@/hooks/useTranslation'

interface Props {
  title: string
  onClose: () => void
  onSave?: () => void
  saveLabel?: string
  saveCls?: string
  large?: boolean
  children: React.ReactNode
}

export default function Modal({ title, onClose, onSave, saveLabel, saveCls = 'bpr', large, children }: Props) {
  const { t } = useTranslation()
  return (
    <div className="mbk" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`md${large ? ' md-lg' : ''}`}>
        <div className="mh">
          <div className="mt">{title}</div>
          <button className="xb" onClick={onClose}>✕</button>
        </div>
        <div className="mb">{children}</div>
        <div className="mf">
          <button className="btn bou" onClick={onClose}>{t('cancel')}</button>
          {onSave && (
            <button className={`btn ${saveCls}`} onClick={onSave}>
              {saveLabel || t('save')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
