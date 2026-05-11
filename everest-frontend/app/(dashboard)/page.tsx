'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore, fmtC, fmt, getProjProgress, getProjProfit, getProjExp, isLow, STATUS_BADGE } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'
import Modal from '@/components/ui/Modal'

export default function DashboardPage() {
  const { t, locale } = useTranslation()
  const { capital, capitalTx, inventory, addCapital, addToast, currentUser } = useAppStore()
  const activeProjects = useAppStore(useShallow(s => s.projects.filter(p => !p.deleted)))

  const [showCapModal, setShowCapModal] = useState(false)
  const [capForm, setCapForm] = useState({ amount: '', source: '', date: new Date().toISOString().split('T')[0] })

  const ar = locale === 'ar'

  const totalIncome  = capitalTx.filter(x => x.type === 'income').reduce((s, x) => s + x.amount, 0)
  const totalExpOut  = capitalTx.filter(x => x.type === 'expense').reduce((s, x) => s + x.amount, 0)
  const netProfit    = activeProjects.reduce((s, p) => s + getProjProfit(p), 0)
  const activeProjCount = activeProjects.filter(p => p.status === 'inProgress' || p.status === 'newStatus').length
  const completedCount  = activeProjects.filter(p => p.status === 'completed').length
  const invValue     = inventory.reduce((s, m) => s + m.qty * m.cost, 0)
  const lowStockItems = inventory.filter(isLow)

  // Workshop total from expenses (category = workshop)
  const workshopTotal = useAppStore(s => s.expenses.filter(e => e.category === 'workshop').reduce((sum, e) => sum + e.amount, 0))

  const handleAddCapital = () => {
    const amount = parseFloat(capForm.amount)
    if (!amount || amount <= 0) { addToast(t('amountInvalid'), 'ter'); return }
    addCapital(amount, capForm.source || (ar ? 'إضافة رأس مال' : 'Capital addition'), capForm.date)
    addToast(t('capitalUpdated'), 'tok')
    setShowCapModal(false)
    setCapForm({ amount: '', source: '', date: new Date().toISOString().split('T')[0] })
  }

  const statusLabel: Record<string, string> = {
    inProgress: t('inProgress'), completed: t('completed'), delayed: t('delayed'),
    newStatus: t('newStatus'), cancelled: ar ? 'ملغي' : 'Cancelled',
  }

  return (
    <>
      <div className="topb">
        <div className="tbt">{t('dashboard')}</div>
        <div className="tba">
          <button className="btn bou btn-sm" onClick={() => useAppStore.getState().setLocale(ar ? 'en' : 'ar')}>
            {ar ? 'English' : 'العربية'}
          </button>
          <button className="btn bok2 btn-sm" onClick={() => setShowCapModal(true)}>💰 {t('addCapital')}</button>
        </div>
      </div>

      <div className="cnt pg">
        {/* Welcome */}
        <div className="fl2 jb ic fw g3 mb6">
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>
              👋 {t('welcome')}, {currentUser?.name ?? ''}
            </div>
            <div style={{ color: 'var(--m)', fontSize: 12 }}>{t('welcomeSub')}</div>
          </div>
        </div>

        {/* Low-stock alert banner */}
        {lowStockItems.length > 0 && (
          <div className="al al-er mb4" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/inventory'}>
            <span>⚠</span>
            <span>
              <strong>{lowStockItems.length}</strong>{' '}
              {ar
                ? `${lowStockItems.length === 1 ? 'صنف' : 'أصناف'} في المخزون أقل من الحد الأدنى: ${lowStockItems.map(m => m.name).join('، ')}`
                : `item${lowStockItems.length > 1 ? 's' : ''} below minimum stock: ${lowStockItems.map(m => m.name).join(', ')}`}
              {' — '}<u>{ar ? 'انقر للإدارة' : 'click to manage'}</u>
            </span>
          </div>
        )}

        {/* Row 1 stats */}
        <div className="sg">
          <div className="sc gd">
            <div className="sl">{t('totalCapital')}</div>
            <div className="sv">{fmtC(capital, t('egp'))}</div>
            <div className="ss">{ar ? 'الرصيد الحالي' : 'Current balance'}</div>
          </div>
          <div className="sc gn">
            <div className="sl">{t('totalIncome')}</div>
            <div className="sv">{fmtC(totalIncome, t('egp'))}</div>
            <div className="ss">{ar ? 'إجمالي الإيرادات' : 'All time revenue'}</div>
          </div>
          <div className="sc nv">
            <div className="sl">{t('totalInventory')}</div>
            <div className="sv">{fmtC(invValue, t('egp'))}</div>
            <div className="ss">{inventory.length} {ar ? 'أصناف' : 'items'}</div>
          </div>
          <div className={`sc ${netProfit >= 0 ? 'gn' : 'rd'}`}>
            <div className="sl">{t('netProfit')}</div>
            <div className="sv">{fmtC(Math.abs(netProfit), t('egp'))}</div>
            <div className="ss" style={{ color: netProfit >= 0 ? 'var(--ok)' : 'var(--er)' }}>
              {netProfit >= 0 ? '▲' : '▼'} {ar ? 'عبر كل المشاريع' : 'across all projects'}
            </div>
          </div>
        </div>

        {/* Row 2 stats */}
        <div className="sg">
          <div className="sc gd">
            <div className="sl">{t('activeProjects')}</div>
            <div className="sv">{activeProjCount}</div>
            <div className="ss">{ar ? 'قيد التنفيذ' : 'In progress'}</div>
          </div>
          <div className="sc gn">
            <div className="sl">{ar ? 'مشاريع مكتملة' : 'Completed'}</div>
            <div className="sv">{completedCount}</div>
            <div className="ss">{ar ? 'مكتملة' : 'Projects done'}</div>
          </div>
          <div className="sc rd">
            <div className="sl">{t('totalExpenses')}</div>
            <div className="sv">{fmtC(totalExpOut, t('egp'))}</div>
            <div className="ss">{ar ? 'إجمالي المصروفات' : 'All expenses'}</div>
          </div>
          <div className="sc wa">
            <div className="sl">{ar ? 'إجمالي الورش' : 'Workshops Total'}</div>
            <div className="sv">{fmtC(workshopTotal, t('egp'))}</div>
            <div className="ss">{ar ? 'مدفوع للورش' : 'Paid to workshops'}</div>
          </div>
        </div>

        {/* Active projects + Recent activity */}
        <div className="g2c mb4">
          <div className="card">
            <div className="ch">
              <div className="ct">🏗 {ar ? 'المشاريع النشطة' : 'Active Projects'}</div>
              <Link href="/projects" className="btn bou btn-sm">{ar ? 'عرض الكل' : 'View All'}</Link>
            </div>
            {activeProjects.filter(p => p.status === 'inProgress' || p.status === 'newStatus').length === 0 && (
              <div style={{ color: 'var(--m)', fontSize: 12, padding: '12px 0' }}>{ar ? 'لا توجد مشاريع نشطة' : 'No active projects'}</div>
            )}
            {activeProjects.filter(p => p.status === 'inProgress' || p.status === 'newStatus').map(p => {
              const prg = getProjProgress(p)
              const margin = p.price > 0 ? Math.round(getProjProfit(p) / p.price * 100) : 0
              return (
                <div key={p.id} style={{ marginBottom: 12 }}>
                  <div className="fl2 jb ic mb3">
                    <div className="fl2 ic g2">
                      <strong style={{ fontSize: 12 }}>{p.name}</strong>
                      {p.quickMode && <span className="bdg dwa" style={{ fontSize: 9 }}>⚡</span>}
                      {margin < 15 && margin >= 0 && <span className="bdg der" style={{ fontSize: 9 }}>⚠ {ar ? 'هامش منخفض' : 'Low margin'}</span>}
                      {margin < 0 && <span className="bdg der" style={{ fontSize: 9 }}>🔴 {ar ? 'خسارة' : 'Loss'}</span>}
                    </div>
                    <span className={`bdg ${STATUS_BADGE[p.status] || 'dgy'}`}>{statusLabel[p.status] || p.status}</span>
                  </div>
                  <div className="fl2 jb" style={{ fontSize: 10, color: 'var(--m)', marginBottom: 2 }}>
                    <span>{fmtC(p.received, t('egp'))} / {fmtC(p.price, t('egp'))}</span>
                    <span>{prg}%</span>
                  </div>
                  <div className="pr"><div className="pf" style={{ width: `${prg}%` }} /></div>
                </div>
              )
            })}
          </div>

          <div className="card">
            <div className="ch"><div className="ct">📋 {ar ? 'النشاط الأخير' : 'Recent Activity'}</div></div>
            {capitalTx.length === 0 && (
              <div style={{ color: 'var(--m)', fontSize: 12, padding: '12px 0' }}>{ar ? 'لا توجد معاملات بعد' : 'No transactions yet'}</div>
            )}
            {capitalTx.slice(0, 6).map(tx => (
              <div key={tx.id} className="fl2 jb ic" style={{ padding: '6px 0', borderBottom: '1px solid var(--b)' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{tx.reason || (ar ? 'معاملة' : 'Transaction')}</div>
                  <div style={{ fontSize: 10, color: 'var(--m)' }}>{tx.date}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: tx.type === 'income' ? 'var(--ok)' : 'var(--er)' }}>
                  {tx.type === 'income' ? '+' : '-'}{fmtC(tx.amount, t('egp'))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory preview + quick banner */}
        <div className="g2c">
          <div className="card">
            <div className="ch">
              <div className="ct">📦 {t('inventory')} — {ar ? 'نظرة سريعة' : 'Quick View'}</div>
              <Link href="/inventory" className="btn bpr btn-sm">{ar ? 'إدارة المخزون' : 'Manage'}</Link>
            </div>
            {inventory.slice(0, 5).map(m => (
              <div key={m.id} className="fl2 jb ic" style={{ padding: '5px 0', borderBottom: '1px solid var(--b)' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--m)' }}>{m.qty} {t(m.unit as any)}</div>
                </div>
                <div className="fl2 ic g2">
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g)' }}>{fmtC(m.qty * m.cost, t('egp'))}</div>
                  {isLow(m) && <span className="bdg der" style={{ fontSize: 9 }}>⚠</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="qbanner">
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
              ⚡ {ar ? 'إدخال سريع' : 'Quick Entry'}
            </div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              {ar ? 'أضف مشروعاً في ثوانٍ' : 'Add a project in seconds'}
            </div>
            <div className="fl2 g2 fw">
              <Link href="/projects" className="btn bghost btn-sm">🏗 {ar ? 'كل المشاريع' : 'All Projects'} →</Link>
              <Link href="/expenses" className="btn bghost btn-sm">💸 {ar ? 'مصروف جديد' : 'New Expense'} →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Add Capital Modal */}
      {showCapModal && (
        <Modal title={`💰 ${t('addCapital')}`} onClose={() => setShowCapModal(false)} onSave={handleAddCapital} saveLabel={`💰 ${t('addCapital')}`} saveCls="bok2">
          <div className="al al-ok mb3"><span>💰</span><span>{ar ? 'سيُضاف المبلغ تلقائياً لرأس المال' : 'Auto-added to capital and transaction log'}</span></div>
          <div className="fg">
            <label className="fl">{t('amount')} *</label>
            <input className="fc" type="number" min="1" placeholder="0" value={capForm.amount} onChange={e => setCapForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="fg">
            <label className="fl">{t('date')}</label>
            <input className="fc" type="date" value={capForm.date} onChange={e => setCapForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="fg">
            <label className="fl">{t('source')}</label>
            <input className="fc" placeholder={ar ? 'مثال: دفعة عميل' : 'e.g. Client payment'} value={capForm.source} onChange={e => setCapForm(f => ({ ...f, source: e.target.value }))} />
          </div>
        </Modal>
      )}
    </>
  )
}
