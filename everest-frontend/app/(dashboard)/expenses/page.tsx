'use client'
import { useState, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore, fmtC } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'
import Modal from '@/components/ui/Modal'
import type { Expense } from '@/types/store'

export default function ExpensesPage() {
  const { t, locale } = useTranslation()
  const { expenses, addExpense, updateExpense, deleteExpense, addToast, setLocale } = useAppStore()
  const activeProjects = useAppStore(useShallow(s => s.projects.filter(p => !p.deleted)))

  const ar = locale === 'ar'

  const [showModal, setShowModal]   = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [catFilter, setCatFilter]   = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const [form, setForm] = useState({
    title: '', category: 'workers', amount: '', date: new Date().toISOString().split('T')[0],
    project: '', paidTo: '', notes: '',
  })
  const [editForm, setEditForm] = useState(form)

  const catMap: Record<string,string> = {
    workers: t('expWorkers'), workshop: t('expWorkshop'), materials: t('expMaterials'),
    transportation: ar ? 'نقل' : 'Transport', monthly: ar ? 'شهري' : 'Monthly',
    utilities: ar ? 'مرافق' : 'Utilities', other: t('expOther'),
  }

  const filtered = useMemo(() => expenses.filter(e => {
    if (catFilter && e.category !== catFilter) return false
    if (dateFrom && e.date < dateFrom) return false
    if (dateTo   && e.date > dateTo)   return false
    return true
  }), [expenses, catFilter, dateFrom, dateTo])

  const total = filtered.reduce((s, e) => s + e.amount, 0)

  const CATEGORIES = ['workers','workshop','materials','transportation','monthly','utilities','other']

  const handleSave = () => {
    const amount = parseFloat(form.amount)
    if (!form.title.trim() || !amount || amount <= 0) { addToast(t('fieldRequired'), 'ter'); return }
    addExpense({ title: form.title, category: form.category, amount, date: form.date, project: form.project, paidTo: form.paidTo, notes: form.notes })
    addToast(t('expenseAdded'), 'tok')
    setShowModal(false)
    setForm({ title: '', category: 'workers', amount: '', date: new Date().toISOString().split('T')[0], project: '', paidTo: '', notes: '' })
  }

  const openEdit = (e: Expense) => {
    setEditExpense(e)
    setEditForm({ title: e.title, category: e.category, amount: String(e.amount), date: e.date, project: e.project, paidTo: e.paidTo, notes: e.notes })
  }

  const handleEditSave = () => {
    if (!editExpense) return
    const amount = parseFloat(editForm.amount)
    if (!editForm.title.trim() || !amount) { addToast(t('fieldRequired'), 'ter'); return }
    updateExpense(editExpense.id, { title: editForm.title, category: editForm.category, amount, date: editForm.date, paidTo: editForm.paidTo, notes: editForm.notes })
    addToast(ar ? 'تم تحديث المصروف ✓' : 'Expense updated ✓', 'tok')
    setEditExpense(null)
  }

  const handleDelete = (e: Expense) => {
    if (!confirm(`${t('deleteWarn')}\n${e.title}`)) return
    deleteExpense(e.id)
    addToast(ar ? 'تم حذف المصروف ✓' : 'Expense deleted ✓', 'tok')
  }

  return (
    <>
      <div className="topb">
        <div className="tbt">{t('expenses')}</div>
        <div className="tba">
          <button className="btn bou btn-sm" onClick={() => setLocale(ar ? 'en' : 'ar')}>{ar ? 'English' : 'العربية'}</button>
          <button className="btn bpr btn-sm" onClick={() => setShowModal(true)}>+ {t('addExpense')}</button>
        </div>
      </div>

      <div className="cnt pg">
        <div className="sg sg3">
          <div className="sc rd"><div className="sl">{t('totalExpenses')}</div><div className="sv">{fmtC(total, t('egp'))}</div><div className="ss">{filtered.length} {ar ? 'سجل' : 'records'}</div></div>
          <div className="sc nv"><div className="sl">{ar ? 'بعد التصفية' : 'Filtered'}</div><div className="sv">{fmtC(total, t('egp'))}</div></div>
          <div className="sc gd"><div className="sl">{ar ? 'إجمالي الكل' : 'All Time'}</div><div className="sv">{fmtC(expenses.reduce((s, e) => s + e.amount, 0), t('egp'))}</div></div>
        </div>

        {/* Filters */}
        <div className="fbar mb3">
          <span className="fbl">{ar ? 'الفئة:' : 'Cat:'}</span>
          <select className="fctl" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">{t('catAll')}</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{catMap[c]}</option>)}
          </select>
          <span className="fbl">{ar ? 'من:' : 'From:'}</span>
          <input className="fctl" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="fbl">{ar ? 'إلى:' : 'To:'}</span>
          <input className="fctl" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {(catFilter || dateFrom || dateTo) && (
            <button className="btn bou btn-sm" onClick={() => { setCatFilter(''); setDateFrom(''); setDateTo('') }}>✕ {ar ? 'مسح' : 'Clear'}</button>
          )}
        </div>

        <div className="card">
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{ar ? 'العنوان' : 'Title'}</th>
                  <th>{t('category')}</th>
                  <th>{t('project')}</th>
                  <th>{ar ? 'المدفوع لـ' : 'Paid To'}</th>
                  <th>{t('amount')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--m)', padding: 24 }}>{ar ? 'لا توجد مصروفات مطابقة' : 'No matching expenses'}</td></tr>
                )}
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--m)', fontSize: 11 }}>{e.date}</td>
                    <td><strong>{e.title}</strong>{e.notes && <div style={{ fontSize: 10, color: 'var(--m)' }}>{e.notes}</div>}</td>
                    <td><span className="bdg dnv">{catMap[e.category] || e.category}</span></td>
                    <td style={{ color: 'var(--m)' }}>{e.project || '—'}</td>
                    <td style={{ color: 'var(--m)' }}>{e.paidTo || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--er)' }}>-{fmtC(e.amount, t('egp'))}</td>
                    <td>
                      <div className="fl2 g1">
                        <button className="btn bou btn-xs" onClick={() => openEdit(e)}>✏</button>
                        <button className="btn berou btn-xs" onClick={() => handleDelete(e)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length > 0 && (
                  <tr style={{ background: 'var(--bg)' }}>
                    <td colSpan={5} style={{ fontWeight: 700, color: 'var(--m)' }}>{ar ? 'الإجمالي' : 'Total'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--er)' }}>-{fmtC(total, t('egp'))}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <Modal title={`💸 ${t('addExpense')}`} onClose={() => setShowModal(false)} onSave={handleSave} saveLabel={`💸 ${t('addExpense')}`} saveCls="ber2">
          <div className="fg"><label className="fl">{ar ? 'وصف المصروف' : 'Description'} *</label><input className="fc" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="g2c">
            <div className="fg">
              <label className="fl">{t('category')}</label>
              <select className="fc" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{catMap[c]}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">{t('amount')} *</label><input className="fc" type="number" min="1" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('date')}</label><input className="fc" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="fg">
              <label className="fl">{t('project')}</label>
              <select className="fc" value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))}>
                <option value="">— {ar ? 'بدون مشروع' : 'No Project'} —</option>
                {activeProjects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="fg"><label className="fl">{ar ? 'المدفوع لـ' : 'Paid To'}</label><input className="fc" value={form.paidTo} onChange={e => setForm(f => ({ ...f, paidTo: e.target.value }))} /></div>
          <div className="fg"><label className="fl">{t('notes')}</label><input className="fc" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editExpense && (
        <Modal title={`✏ ${ar ? 'تعديل المصروف' : 'Edit Expense'}`} onClose={() => setEditExpense(null)} onSave={handleEditSave} saveLabel={ar ? 'حفظ' : 'Save'} saveCls="bpr">
          <div className="fg"><label className="fl">{ar ? 'وصف المصروف' : 'Description'} *</label><input className="fc" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="g2c">
            <div className="fg">
              <label className="fl">{t('category')}</label>
              <select className="fc" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{catMap[c]}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">{t('amount')} *</label><input className="fc" type="number" min="1" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} /></div>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('date')}</label><input className="fc" type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{ar ? 'المدفوع لـ' : 'Paid To'}</label><input className="fc" value={editForm.paidTo} onChange={e => setEditForm(f => ({ ...f, paidTo: e.target.value }))} /></div>
          </div>
          <div className="fg"><label className="fl">{t('notes')}</label><input className="fc" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </Modal>
      )}
    </>
  )
}
