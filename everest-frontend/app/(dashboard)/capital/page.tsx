'use client'
import { useState, useMemo } from 'react'
import { useAppStore, fmtC } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'
import AddCapitalModal from '@/components/ui/AddCapitalModal'

const TYPE_BADGE: Record<string,string> = { income:'dok', expense:'der', purchase:'dwa', transfer:'dnv', deposit:'dok', withdrawal:'der' }

export default function CapitalPage() {
  const { t, locale } = useTranslation()
  const { capital, capitalTx, setLocale } = useAppStore()

  const ar = locale === 'ar'

  const [showModal, setShowModal] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const typeLabel: Record<string,string> = {
    income: ar ? 'دفعة مشروع' : 'Project Payment',
    expense: t('expense'), purchase: t('purchase'),
    transfer: t('returnBadge'),
    deposit: ar ? 'إيراد عادي' : 'Regular Income',
    withdrawal: ar ? 'سحب' : 'Withdrawal',
  }

  const filtered = useMemo(() => capitalTx.filter(tx => {
    if (typeFilter && tx.type !== typeFilter) return false
    if (dateFrom && tx.date < dateFrom) return false
    if (dateTo   && tx.date > dateTo)   return false
    return true
  }), [capitalTx, typeFilter, dateFrom, dateTo])

  const filteredInflow  = filtered.filter(x => x.type === 'income' || x.type === 'deposit' || x.type === 'transfer').reduce((s, x) => s + x.amount, 0)
  const filteredOutflow = filtered.filter(x => x.type === 'expense' || x.type === 'purchase' || x.type === 'withdrawal').reduce((s, x) => s + x.amount, 0)

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
                {filtered.map(tx => {
                  const isInflow = tx.type === 'income' || tx.type === 'deposit' || tx.type === 'transfer'
                  return (
                    <tr key={tx.id}>
                      <td style={{ color: 'var(--m)', fontSize: 11 }}>{tx.date}</td>
                      <td><span className={`bdg ${TYPE_BADGE[tx.type] || 'dgy'}`}>{typeLabel[tx.type] || tx.type}</span></td>
                      <td>{tx.reason || '—'}</td>
                      <td style={{ color: 'var(--m)' }}>{tx.project || '—'}</td>
                      <td style={{ fontWeight: 700, color: isInflow ? 'var(--ok)' : 'var(--er)' }}>
                        {isInflow ? '+' : '-'}{fmtC(tx.amount, t('egp'))}
                      </td>
                    </tr>
                  )
                })}
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

      {showModal && <AddCapitalModal onClose={() => setShowModal(false)} />}
    </>
  )
}
