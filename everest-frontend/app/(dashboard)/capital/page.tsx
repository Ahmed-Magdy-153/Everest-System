'use client'
import { useState, useMemo } from 'react'
import { useAppStore, fmtC } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'
import Modal from '@/components/ui/Modal'

const TYPE_BADGE: Record<string,string> = { income:'dok', expense:'der', purchase:'dwa', transfer:'dnv', deposit:'dok', withdrawal:'der' }

export default function CapitalPage() {
  const { t, locale } = useTranslation()
  const { capital, capitalTx, addCapital, addToast, setLocale } = useAppStore()

  const ar = locale === 'ar'

  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState({ amount: '', source: '', date: new Date().toISOString().split('T')[0], type: 'deposit' })
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const typeLabel: Record<string,string> = {
    income: t('income'), expense: t('expense'), purchase: t('purchase'),
    transfer: t('transfer'), deposit: ar?'إيداع':'Deposit', withdrawal: ar?'سحب':'Withdrawal',
  }

  const filtered = useMemo(() => capitalTx.filter(tx => {
    if (typeFilter && tx.type !== typeFilter) return false
    if (dateFrom && tx.date < dateFrom) return false
    if (dateTo   && tx.date > dateTo)   return false
    return true
  }), [capitalTx, typeFilter, dateFrom, dateTo])

  const filteredInflow  = filtered.filter(x => x.type === 'income' || x.type === 'deposit').reduce((s, x) => s + x.amount, 0)
  const filteredOutflow = filtered.filter(x => x.type !== 'income' && x.type !== 'deposit').reduce((s, x) => s + x.amount, 0)

  const handleSave = () => {
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { addToast(t('amountInvalid'), 'ter'); return }
    addCapital(amount, form.source || (ar ? 'إضافة رأس مال' : 'Capital addition'), form.date)
    addToast(t('capitalUpdated'), 'tok')
    setShowModal(false)
    setForm({ amount: '', source: '', date: new Date().toISOString().split('T')[0], type: 'deposit' })
  }

  const ALL_TYPES = ['income','expense','purchase','transfer','deposit','withdrawal']

  return (
    <>
      <div className="topb">
        <div className="tbt">{t('capital')}</div>
        <div className="tba">
          <button className="btn bou btn-sm" onClick={() => setLocale(ar ? 'en' : 'ar')}>{ar ? 'English' : 'العربية'}</button>
          <button className="btn bok2 btn-sm" onClick={() => setShowModal(true)}>💰 {t('addCapital')}</button>
        </div>
      </div>

      <div className="cnt pg">
        <div className="sg">
          <div className="sc gd"><div className="sl">{t('totalCapital')}</div><div className="sv">{fmtC(capital, t('egp'))}</div><div className="ss">{ar ? 'الرصيد الحالي' : 'Current balance'}</div></div>
          <div className="sc gn"><div className="sl">{ar ? 'إيرادات مُصفّاة' : 'Filtered Inflow'}</div><div className="sv">{fmtC(filteredInflow, t('egp'))}</div></div>
          <div className="sc rd"><div className="sl">{ar ? 'مصروفات مُصفّاة' : 'Filtered Outflow'}</div><div className="sv">{fmtC(filteredOutflow, t('egp'))}</div></div>
          <div className="sc nv"><div className="sl">{ar ? 'عمليات' : 'Transactions'}</div><div className="sv">{filtered.length}</div></div>
        </div>

        {/* Filters */}
        <div className="fbar mb3">
          <span className="fbl">{ar ? 'النوع:' : 'Type:'}</span>
          <select className="fctl" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">{ar ? 'الكل' : 'All'}</option>
            {ALL_TYPES.map(t2 => <option key={t2} value={t2}>{typeLabel[t2]}</option>)}
          </select>
          <span className="fbl">{ar ? 'من:' : 'From:'}</span>
          <input className="fctl" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="fbl">{ar ? 'إلى:' : 'To:'}</span>
          <input className="fctl" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {(typeFilter || dateFrom || dateTo) && (
            <button className="btn bou btn-sm" onClick={() => { setTypeFilter(''); setDateFrom(''); setDateTo('') }}>✕ {ar ? 'مسح' : 'Clear'}</button>
          )}
        </div>

        <div className="card">
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{ar ? 'النوع' : 'Type'}</th>
                  <th>{t('reason')}</th>
                  <th>{t('project')}</th>
                  <th>{t('amount')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--m)', padding: 24 }}>{ar ? 'لا توجد معاملات مطابقة' : 'No matching transactions'}</td></tr>
                )}
                {filtered.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--m)', fontSize: 11 }}>{tx.date}</td>
                    <td><span className={`bdg ${TYPE_BADGE[tx.type] || 'dgy'}`}>{typeLabel[tx.type] || tx.type}</span></td>
                    <td>{tx.reason || '—'}</td>
                    <td style={{ color: 'var(--m)' }}>{tx.project || '—'}</td>
                    <td style={{ fontWeight: 700, color: (tx.type === 'income' || tx.type === 'deposit') ? 'var(--ok)' : 'var(--er)' }}>
                      {(tx.type === 'income' || tx.type === 'deposit') ? '+' : '-'}{fmtC(tx.amount, t('egp'))}
                    </td>
                  </tr>
                ))}
                {filtered.length > 0 && (
                  <tr style={{ background: 'var(--bg)' }}>
                    <td colSpan={4} style={{ fontWeight: 700, color: 'var(--m)' }}>{ar ? 'صافي الفترة' : 'Net for period'}</td>
                    <td style={{ fontWeight: 700, color: filteredInflow - filteredOutflow >= 0 ? 'var(--ok)' : 'var(--er)' }}>
                      {fmtC(filteredInflow - filteredOutflow, t('egp'))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <Modal title={`💰 ${t('addCapital')}`} onClose={() => setShowModal(false)} onSave={handleSave} saveLabel={`💰 ${t('addCapital')}`} saveCls="bok2">
          <div className="al al-ok mb3"><span>💰</span><span>{ar ? 'سيُضاف المبلغ تلقائياً لرأس المال' : 'Auto-added to capital and transaction log'}</span></div>
          <div className="fg"><label className="fl">{t('amount')} *</label><input className="fc" type="number" min="1" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div className="fg"><label className="fl">{t('date')}</label><input className="fc" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div className="fg"><label className="fl">{t('source')}</label><input className="fc" placeholder={ar ? 'مثال: دفعة عميل' : 'e.g. Client payment'} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} /></div>
        </Modal>
      )}
    </>
  )
}
