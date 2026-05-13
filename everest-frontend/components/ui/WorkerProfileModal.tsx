'use client'
import { useState, useEffect } from 'react'
import { useAppStore, fmtC } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'
import type { Worker, WorkerPayment } from '@/types/store'
import { api } from '@/services/api'

interface Props {
  worker: Worker
  onClose: () => void
}

export default function WorkerProfileModal({ worker, onClose }: Props) {
  const { t, locale }   = useTranslation()
  const projects        = useAppStore(s => s.projects.filter(p => !p.deleted))
  const payWorker       = useAppStore(s => s.payWorker)
  const addToast        = useAppStore(s => s.addToast)

  const ar  = locale === 'ar'
  const dir = ar ? 'rtl' : 'ltr'

  const [payments, setPayments]   = useState<WorkerPayment[]>([])
  const [loadingPay, setLoadingPay] = useState(true)
  const [showPayForm, setShowPayForm] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [form, setForm] = useState({
    amount:    '',
    date:      new Date().toISOString().split('T')[0],
    projectId: '' as number | '',
    notes:     '',
  })

  const roleLabel: Record<string, string> = {
    carpenter: ar?'نجار':'Carpenter', painter: ar?'دهان':'Painter',
    electrician: ar?'كهربائي':'Electrician', plumber: ar?'سباك':'Plumber',
    welder: ar?'لحام':'Welder', upholsterer: ar?'منجد':'Upholsterer',
    installer: ar?'مركّب':'Installer', supervisor: ar?'مشرف':'Supervisor',
    driver: ar?'سائق':'Driver', other: ar?'أخرى':'Other',
  }

  useEffect(() => {
    api.get<WorkerPayment[]>(`/workers/${worker.id}/payments?type=${worker.type}`)
      .then(data => setPayments(data))
      .catch(() => setPayments([]))
      .finally(() => setLoadingPay(false))
  }, [worker.id, worker.type])

  const totalAll    = payments.reduce((s, p) => s + p.amount, 0)
  const now         = new Date()
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1)
  const totalMonth  = payments
    .filter(p => new Date(p.date) >= monthStart)
    .reduce((s, p) => s + p.amount, 0)

  const handlePay = async () => {
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { addToast(t('amountInvalid'), 'ter'); return }
    setSaving(true)
    try {
      await payWorker(
        worker.id,
        worker.type,
        amount,
        form.date,
        form.projectId ? Number(form.projectId) : null,
        form.notes,
      )
      // Refresh list
      const updated = await api.get<WorkerPayment[]>(`/workers/${worker.id}/payments?type=${worker.type}`)
      setPayments(updated)
      addToast(t('paymentAdded2'), 'tok')
      setShowPayForm(false)
      setForm({ amount: '', date: new Date().toISOString().split('T')[0], projectId: '', notes: '' })
    } catch (e: any) {
      addToast(e?.message ?? ar ? 'حدث خطأ' : 'Error', 'ter')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" dir={dir} style={{ maxWidth: 540, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="modal-hd">
          <span>{worker.type === 'worker' ? t('workerProfile') : t('workshopProfile')}</span>
          <button className="btn bghost btn-xs" onClick={onClose}>✕</button>
        </div>

        {/* Profile info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0 16px', borderBottom: '1px solid var(--br)' }}>
          <div className="ava" style={{ background: worker.color, width: 48, height: 48, fontSize: 20, flexShrink: 0 }}>
            {worker.avatar}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{worker.name}</div>
            <div style={{ color: 'var(--m)', fontSize: 12, marginTop: 2 }}>
              {worker.type === 'worker'
                ? (roleLabel[worker.role ?? ''] ?? worker.role ?? '—')
                : (worker.contact || ar ? 'ورشة' : 'Workshop')}
              {worker.phone ? ` · ${worker.phone}` : ''}
              {worker.type === 'worker' && worker.dailyRate ? ` · ${fmtC(worker.dailyRate, t('egp'))} ${ar ? '/ يوم' : '/ day'}` : ''}
            </div>
          </div>
          <span className={`bdg ${worker.status === 'active' ? 'dok' : 'dgy'}`}>
            {worker.status === 'active' ? t('active') : t('inactive')}
          </span>
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--br)' }}>
          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ color: 'var(--m)', fontSize: 11, marginBottom: 4 }}>{t('thisMonth')}</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--er)' }}>{fmtC(totalMonth, t('egp'))}</div>
          </div>
          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ color: 'var(--m)', fontSize: 11, marginBottom: 4 }}>{t('totalPaid')}</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--er)' }}>{fmtC(totalAll, t('egp'))}</div>
          </div>
        </div>

        {/* Pay form */}
        {showPayForm ? (
          <div style={{ padding: '16px 0', borderBottom: '1px solid var(--br)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{ar ? 'صرف مبلغ جديد' : 'Record Payment'}</div>
            <div className="g2c">
              <div className="fg">
                <label className="fl">{t('amount')} *</label>
                <input className="fc" type="number" min="1" placeholder="0" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} autoFocus />
              </div>
              <div className="fg">
                <label className="fl">{t('date')}</label>
                <input className="fc" type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="fg">
              <label className="fl">{t('project')} ({ar ? 'اختياري' : 'optional'})</label>
              <select className="fc" value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value ? Number(e.target.value) : '' }))}>
                <option value="">{ar ? '— بدون مشروع —' : '— No project —'}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fl">{t('notes')} ({ar ? 'مثال: أجر أسبوع، مقدم، عمل إضافي' : 'e.g. weekly wage, advance, overtime'})</label>
              <input className="fc" placeholder={ar ? 'اكتب تفاصيل الدفعة...' : 'Payment details...'} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn bghost btn-sm" onClick={() => setShowPayForm(false)} disabled={saving}>{t('cancel')}</button>
              <button className="btn berou btn-sm" onClick={handlePay} disabled={saving || !form.amount}>
                {saving ? '…' : `💸 ${t('payWorker')}`}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 0 4px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn berou btn-sm" onClick={() => setShowPayForm(true)}>
              💸 {t('payWorker')}
            </button>
          </div>
        )}

        {/* Payment history */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--m)', marginBottom: 8, paddingTop: 4 }}>
            {t('paymentHistory')} ({payments.length})
          </div>
          {loadingPay ? (
            <div style={{ color: 'var(--m)', fontSize: 12, textAlign: 'center', padding: 16 }}>
              {ar ? 'جارٍ التحميل…' : 'Loading…'}
            </div>
          ) : payments.length === 0 ? (
            <div style={{ color: 'var(--m)', fontSize: 12, textAlign: 'center', padding: 24 }}>
              {t('noPayments')}
            </div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>{t('date')}</th>
                    <th>{t('amount')}</th>
                    <th>{t('project')}</th>
                    <th>{t('notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--m)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {typeof p.date === 'string' ? p.date.split('T')[0] : new Date(p.date).toISOString().split('T')[0]}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--er)' }}>{fmtC(p.amount, t('egp'))}</td>
                      <td style={{ color: 'var(--m)', fontSize: 12 }}>{p.project || '—'}</td>
                      <td style={{ color: 'var(--m)', fontSize: 12 }}>{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
