'use client'
import { useState, useMemo } from 'react'
import { useAppStore } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'
import Modal from '@/components/ui/Modal'

type SourceType = 'deposit' | 'income' | 'return'

interface Props {
  onClose: () => void
}

export default function AddCapitalModal({ onClose }: Props) {
  const { t, locale } = useTranslation()
  const addCapital = useAppStore(s => s.addCapital)
  const addToast   = useAppStore(s => s.addToast)
  const allProjects = useAppStore(s => s.projects)
  const activeProjects = useMemo(() => allProjects.filter(p => !p.deleted), [allProjects])

  const ar = locale === 'ar'

  const [sourceType,       setSourceType]       = useState<SourceType>('deposit')
  const [selectedProject,  setSelectedProject]  = useState<number | ''>('')
  const [form, setForm] = useState({
    amount: '',
    note:   '',
    date:   new Date().toISOString().split('T')[0],
  })

  const handleSave = () => {
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { addToast(t('amountInvalid'), 'ter'); return }
    if (sourceType === 'income' && !selectedProject) {
      addToast(ar ? 'اختر المشروع أولاً' : 'Please select a project', 'ter'); return
    }

    const project = activeProjects.find(p => p.id === selectedProject)
    const defaultNote = sourceType === 'income'
      ? (ar ? `دفعة من مشروع: ${project?.name}` : `Project payment: ${project?.name}`)
      : sourceType === 'return'
      ? (ar ? 'مرتجع' : 'Return')
      : (ar ? 'إضافة رأس مال' : 'Capital addition')

    addCapital(
      amount,
      form.note.trim() || defaultNote,
      form.date,
      sourceType,
      sourceType === 'income' && selectedProject ? (selectedProject as number) : undefined,
    )
    addToast(t('capitalUpdated'), 'tok')
    onClose()
  }

  return (
    <Modal
      title={`💰 ${t('addCapital')}`}
      onClose={onClose}
      onSave={handleSave}
      saveLabel={`💰 ${t('addCapital')}`}
      saveCls="bok2"
    >
      {/* Source type */}
      <div className="fg">
        <label className="fl">{t('capSourceType')} *</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['deposit', 'income', 'return'] as SourceType[]).map(st => (
            <button
              key={st}
              type="button"
              className={`btn btn-sm ${sourceType === st ? 'bok2' : 'bou'}`}
              onClick={() => { setSourceType(st); setSelectedProject('') }}
              style={{ flex: 1 }}
            >
              {st === 'deposit' ? (ar ? '💵 إيراد عادي' : '💵 Regular') :
               st === 'income'  ? (ar ? '🏗 دفعة مشروع' : '🏗 Project') :
                                  (ar ? '🔄 مرتجعات'   : '🔄 Return')}
            </button>
          ))}
        </div>
      </div>

      {/* Project dropdown */}
      {sourceType === 'income' && (
        <div className="fg">
          <label className="fl">{t('capSelectProject')} *</label>
          <select className="fc" value={selectedProject}
            onChange={e => setSelectedProject(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{ar ? '— اختر المشروع —' : '— Select project —'}</option>
            {activeProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.client})</option>
            ))}
          </select>
        </div>
      )}

      <div className="fg">
        <label className="fl">{t('amount')} *</label>
        <input className="fc" type="number" min="1" placeholder="0"
          value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} autoFocus />
      </div>
      <div className="fg">
        <label className="fl">{t('date')}</label>
        <input className="fc" type="date" value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
      </div>
      <div className="fg">
        <label className="fl">{t('notes')}</label>
        <input
          className="fc"
          placeholder={
            sourceType === 'return'
              ? (ar ? 'مثال: مرتجع مواد خشب' : 'e.g. Wood return')
              : sourceType === 'income'
              ? (ar ? 'ملاحظة إضافية (اختياري)' : 'Extra note (optional)')
              : (ar ? 'مثال: دفعة عميل' : 'e.g. Client payment')
          }
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
        />
      </div>
    </Modal>
  )
}
