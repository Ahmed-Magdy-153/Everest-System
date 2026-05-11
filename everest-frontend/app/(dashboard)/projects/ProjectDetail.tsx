'use client'
import { useState, useRef } from 'react'
import { useAppStore, fmtC, getProjProgress, getProjProfit, getProjExp, STATUS_BADGE } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'
import Modal from '@/components/ui/Modal'

type Tab = 0|1|2|3|4|5|6

interface Props { pid: number; onClose: () => void }

const PAYMENT_METHODS = ['cash','bank_transfer','check','online','other']

export default function ProjectDetail({ pid, onClose }: Props) {
  const { t, locale } = useTranslation()
  const { addPaymentToProject, addExpenseToProject, addMaterialFromInventory, toggleContractItem,
          updateProjectProgress, addContractItem, addWorkerAssignment, uploadContract,
          inventory, workers, addToast } = useAppStore()
  const project = useAppStore(s => s.projects.find(p => p.id === pid))
  const [tab, setTab] = useState<Tab>(0)

  const ar = locale === 'ar'

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', method: 'cash' })

  // Expense modal
  const [showExpModal, setShowExpModal] = useState(false)
  const [expForm, setExpForm] = useState({ label: '', cat: 'workers', amount: '', date: new Date().toISOString().split('T')[0] })

  // Contract item modal
  const [showCIModal, setShowCIModal] = useState(false)
  const [ciTitle, setCiTitle] = useState('')

  // Worker assignment modal
  const [showWAModal, setShowWAModal] = useState(false)
  const [waForm, setWaForm] = useState({ workerId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' })

  // Contract upload
  const [contractFile, setContractFile]       = useState<File | null>(null)
  const [uploadingContract, setUploadingContract] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleContractUpload = async () => {
    if (!contractFile) return
    setUploadingContract(true)
    try {
      await uploadContract(pid, contractFile)
      addToast(ar ? 'تم رفع العقد ✓' : 'Contract uploaded ✓', 'tok')
      setContractFile(null)
    } catch (err) {
      addToast((err as Error).message || (ar ? 'فشل رفع الملف' : 'Upload failed'), 'ter')
    } finally {
      setUploadingContract(false)
    }
  }

  if (!project) return null

  const prg    = getProjProgress(project)
  const prf    = getProjProfit(project)
  const exp    = getProjExp(project)
  const totPay = project.payments.reduce((s, p) => s + p.amount, 0)
  const pc     = project.price > 0 ? Math.min(100, Math.round(totPay / project.price * 100)) : 0
  const margin = project.price > 0 ? Math.round(prf / project.price * 100) : 0

  const statusLabel: Record<string,string> = {
    inProgress: t('inProgress'), completed: t('completed'), delayed: t('delayed'), newStatus: t('newStatus'),
  }
  const catMap: Record<string,string> = { workers: t('expWorkers'), materials: t('expMaterials'), workshop: t('expWorkshop'), other: t('expOther') }
  const methodLabel: Record<string,string> = { cash: ar?'كاش':'Cash', bank_transfer: ar?'تحويل':'Transfer', check: ar?'شيك':'Check', online: ar?'أونلاين':'Online', other: ar?'أخرى':'Other' }

  const handleAddPayment = () => {
    const amount = parseFloat(payForm.amount)
    if (!amount || amount <= 0) { addToast(t('amountInvalid'), 'ter'); return }
    addPaymentToProject(pid, amount, payForm.date, payForm.notes, payForm.method)
    addToast(t('paymentAdded'), 'tok')
    setShowPayModal(false)
    setPayForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '', method: 'cash' })
  }

  const handleAddExpense = () => {
    const amount = parseFloat(expForm.amount)
    if (!expForm.label.trim() || !amount || amount <= 0) { addToast(t('fieldRequired'), 'ter'); return }
    addExpenseToProject(pid, expForm.cat, expForm.label, amount, expForm.date)
    addToast(t('expenseAdded'), 'tok')
    setShowExpModal(false)
    setExpForm({ label: '', cat: 'workers', amount: '', date: new Date().toISOString().split('T')[0] })
  }

  const handleAddCI = () => {
    if (!ciTitle.trim()) return
    addContractItem(pid, ciTitle)
    setCiTitle('')
    setShowCIModal(false)
  }

  const handleWorkerAssign = () => {
    const wid    = parseInt(waForm.workerId)
    const amount = parseFloat(waForm.amount)
    if (!wid || !amount || amount <= 0) { addToast(t('fieldRequired'), 'ter'); return }
    addWorkerAssignment(pid, wid, amount, waForm.date, waForm.notes)
    addToast(ar ? 'تم تعيين العامل ✓' : 'Worker assigned ✓', 'tok')
    setShowWAModal(false)
    setWaForm({ workerId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' })
  }

  const TABS = [t('tab_overview'), t('tab_payments'), t('tab_materials'), t('tab_expenses'), t('tab_workers'), t('tab_progress'), t('tab_contract')]

  return (
    <>
      <div className="topb">
        <div className="tbt">{project.name}{project.quickMode ? ' ⚡' : ''}</div>
        <div className="tba">
          <button className="btn bou btn-sm" onClick={onClose}>← {ar ? 'رجوع' : 'Back'}</button>
          <span className={`bdg ${STATUS_BADGE[project.status] || 'dgy'}`}>{statusLabel[project.status] || project.status}</span>
        </div>
      </div>

      <div className="cnt pg">
        <div className="tabs" style={{ flexWrap: 'wrap' }}>
          {TABS.map((label, i) => (
            <button key={i} className={`tab${tab === i ? ' active' : ''}`} onClick={() => setTab(i as Tab)}>{label}</button>
          ))}
        </div>

        {/* ── Tab 0: Overview ─────────────────────────────────────────────── */}
        {tab === 0 && (
          <>
            {project.quickMode && <div className="al al-wa mb3"><span>⚡</span><span>{ar ? 'وضع إدخال سريع — أضف التفاصيل الكاملة لاحقاً' : 'Quick mode — add full details later'}</span></div>}
            {margin > 0 && margin < 15 && <div className="al al-wa mb3"><span>⚠</span><span>{ar ? `هامش الربح ${margin}% — منخفض` : `Profit margin ${margin}% — below 15%`}</span></div>}
            {prf < 0 && <div className="al al-er mb3"><span>🔴</span><span>{ar ? `المشروع في خسارة: ${fmtC(Math.abs(prf), t('egp'))}` : `Project at a loss: ${fmtC(Math.abs(prf), t('egp'))}`}</span></div>}

            <div className="g3c mb4">
              <div className="sc gd"><div className="sl">{t('projectPrice')}</div><div className="sv" style={{ fontSize: 14 }}>{fmtC(project.price, t('egp'))}</div></div>
              <div className="sc gn"><div className="sl">{t('received')}</div><div className="sv" style={{ fontSize: 14 }}>{fmtC(project.received, t('egp'))}</div></div>
              <div className={`sc ${prf >= 0 ? 'gn' : 'rd'}`}><div className="sl">{prf >= 0 ? t('profit') : t('loss')}</div><div className="sv" style={{ fontSize: 14 }}>{fmtC(Math.abs(prf), t('egp'))}</div><div className="ss">{margin}% {ar ? 'هامش' : 'margin'}</div></div>
            </div>

            <div className="g2c mb4">
              <div><div className="sl">{t('remaining')}</div><div style={{ fontSize: 16, fontWeight: 700, color: project.price - project.received > 0 ? 'var(--er)' : 'var(--ok)' }}>{fmtC(project.price - project.received, t('egp'))}</div></div>
              <div><div className="sl">{ar ? 'المصروفات' : 'Expenses'}</div><div style={{ fontSize: 16, fontWeight: 700, color: 'var(--er)' }}>{fmtC(exp, t('egp'))}</div></div>
            </div>

            {/* Progress bars */}
            <div className="mb3">
              <div className="fl2 jb" style={{ fontSize: 11, color: 'var(--m)', marginBottom: 2 }}><span>{ar ? 'التحصيل' : 'Collection'}</span><span>{pc}%</span></div>
              <div className="pr" style={{ height: 8 }}><div className="pf" style={{ width: `${pc}%` }} /></div>
            </div>
            <div className="mb4">
              <div className="fl2 jb" style={{ fontSize: 11, color: 'var(--m)', marginBottom: 2 }}><span>{ar ? 'الإنجاز' : 'Progress'}</span><span>{prg}%</span></div>
              <div className="pr" style={{ height: 8 }}><div className="pf pf-ok" style={{ width: `${prg}%` }} /></div>
            </div>

            {/* Client info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {project.client    && <div><div className="sl">👤 {t('client')}</div><div style={{ fontSize: 12 }}>{project.client}</div></div>}
              {project.phone     && <div><div className="sl">📞 {t('phone')}</div><div style={{ fontSize: 12 }}>{project.phone}</div></div>}
              {project.address   && <div><div className="sl">📍 {t('address')}</div><div style={{ fontSize: 12 }}>{project.address}</div></div>}
              {project.startDate && <div><div className="sl">📅 {ar ? 'تاريخ البداية' : 'Start Date'}</div><div style={{ fontSize: 12 }}>{project.startDate}</div></div>}
              {project.endDate   && <div><div className="sl">🏁 {ar ? 'تاريخ التسليم' : 'Delivery Date'}</div><div style={{ fontSize: 12, color: 'var(--wa)' }}>{project.endDate}</div></div>}
            </div>

            {project.notes && <div className="al al-ok mb4"><span>📝</span><span>{project.notes}</span></div>}

            <div className="dvd" />
            <div className="fl2 g2 fw">
              <button className="btn bok2 btn-sm" onClick={() => { setTab(1); setShowPayModal(true) }}>💳 {t('addPayment')}</button>
              <button className="btn ber2 btn-sm" onClick={() => { setTab(3); setShowExpModal(true) }}>💸 {t('addExpense')}</button>
            </div>
          </>
        )}

        {/* ── Tab 1: Payments ─────────────────────────────────────────────── */}
        {tab === 1 && (
          <>
            <div className="fl2 jb ic mb4">
              <div>
                <div className="sl">{ar ? 'إجمالي الدفعات' : 'Total Paid'}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ok)' }}>{fmtC(totPay, t('egp'))}</div>
                <div style={{ fontSize: 10, color: 'var(--m)' }}>{ar ? 'متبقي:' : 'Remaining:'} <strong style={{ color: 'var(--er)' }}>{fmtC(project.price - totPay, t('egp'))}</strong></div>
              </div>
              <button className="btn bok2 btn-sm" onClick={() => setShowPayModal(true)}>+ {t('addPayment')}</button>
            </div>
            <div className="pr mb4" style={{ height: 8 }}><div className="pf" style={{ width: `${pc}%` }} /></div>
            {project.payments.length === 0 && <div className="al al-nv"><span>💳</span><span>{ar ? 'لا توجد دفعات بعد' : 'No payments yet'}</span></div>}
            {project.payments.map((pay, i) => (
              <div key={pay.id} className="pay-row">
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--okb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>💳</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{fmtC(pay.amount, t('egp'))}</div>
                  <div style={{ fontSize: 10, color: 'var(--m)' }}>
                    {pay.date}
                    {pay.method && pay.method !== 'cash' && <span> · {methodLabel[pay.method] ?? pay.method}</span>}
                    {pay.notes ? ' · ' + pay.notes : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'end' }}>
                  <span className="bdg dok">{t('paid')}</span>
                  <div style={{ fontSize: 10, color: 'var(--m)', marginTop: 2 }}>{ar ? `دفعة ${i + 1}` : `Payment ${i + 1}`}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Tab 2: Materials ─────────────────────────────────────────────── */}
        {tab === 2 && (
          <>
            <div className="fl2 jb ic mb4">
              <div>
                <div className="sl">{ar ? 'إجمالي المواد' : 'Materials Total'}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ai)' }}>{fmtC(project.materials.reduce((s, m) => s + m.total, 0), t('egp'))}</div>
              </div>
            </div>
            {project.materials.length === 0 && <div className="al al-nv"><span>📦</span><span>{ar ? 'لا توجد مواد بعد' : 'No materials yet'}</span></div>}
            {project.materials.map(m => (
              <div key={m.id} className="pay-row">
                <span style={{ fontSize: 16 }}>{m.source === 'inventory' ? '📦' : '🛒'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{m.source === 'inventory' ? m.key : m.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--m)' }}>{m.qty} × {fmtC(m.cost, t('egp'))} · {m.date}</div>
                </div>
                <div style={{ textAlign: 'end' }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{fmtC(m.total, t('egp'))}</div>
                  <span className={`bdg ${m.source === 'inventory' ? 'dnv' : 'dpp'}`}>{m.source === 'inventory' ? t('fromInventory') : t('external')}</span>
                </div>
              </div>
            ))}
            {/* Add from inventory quick select */}
            {inventory.filter(m => m.qty > 0).length > 0 && (
              <div className="al al-nv mt3">
                <span>📦</span>
                <span>{ar ? 'لإضافة مادة من المخزون، اذهب إلى صفحة المخزون واضغط "صرف لمشروع"' : 'To add from inventory, go to Inventory page and use Decrease Stock → Project'}</span>
              </div>
            )}
          </>
        )}

        {/* ── Tab 3: Expenses ──────────────────────────────────────────────── */}
        {tab === 3 && (
          <>
            <div className="fl2 jb ic mb4">
              <div>
                <div className="sl">{ar ? 'إجمالي المصروفات' : 'Total Expenses'}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--er)' }}>{fmtC(exp, t('egp'))}</div>
              </div>
              <button className="btn ber2 btn-sm" onClick={() => setShowExpModal(true)}>+ {t('addExpense')}</button>
            </div>
            {project.expenses.quickTotal > 0 && project.expenses.breakdown.length === 0 && (
              <div className="al al-wa mb3"><span>💡</span><span>{ar ? `تم تسجيل ${fmtC(project.expenses.quickTotal, t('egp'))} كمبلغ سريع` : `${fmtC(project.expenses.quickTotal, t('egp'))} recorded as quick total`}</span></div>
            )}
            {project.expenses.breakdown.length === 0 && project.expenses.quickTotal === 0 && (
              <div className="al al-nv"><span>💸</span><span>{ar ? 'لا توجد مصروفات بعد' : 'No expenses yet'}</span></div>
            )}
            {project.expenses.breakdown.map(e => (
              <div key={e.id} style={{ background: 'var(--bg)', borderRadius: 'var(--rs)', padding: '9px 11px', marginBottom: 6, border: '1px solid var(--b)' }}>
                <div className="fl2 jb ic">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{e.label}</div>
                    <div className="fl2 ic g2" style={{ marginTop: 2 }}>
                      <span className="bdg dnv">{catMap[e.cat] || e.cat}</span>
                      <span style={{ fontSize: 10, color: 'var(--m)' }}>{e.date}</span>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--er)' }}>{fmtC(e.amount, t('egp'))}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Tab 4: Workers ───────────────────────────────────────────────── */}
        {tab === 4 && (
          <>
            <div className="fl2 jb ic mb4">
              <div>
                <div className="sl">{ar ? 'عمال المشروع' : 'Project Workers'}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--n)' }}>
                  {fmtC(project.workers.reduce((s, w) => s + w.amount, 0), t('egp'))}
                </div>
              </div>
              <button className="btn bok2 btn-sm" onClick={() => setShowWAModal(true)}>+ {ar ? 'تعيين عامل' : 'Assign Worker'}</button>
            </div>
            {project.workers.length === 0 && <div className="al al-nv"><span>👷</span><span>{ar ? 'لا يوجد عمال معينون بعد' : 'No workers assigned yet'}</span></div>}
            {project.workers.map((w, i) => (
              <div key={i} className="pay-row">
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--n)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, flexShrink: 0 }}>👷</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{w.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--m)' }}>{w.date}</div>
                </div>
                <div style={{ textAlign: 'end' }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{fmtC(w.amount, t('egp'))}</div>
                  <span className={`bdg ${w.status === 'paid' ? 'dok' : 'dwa'}`}>{w.status === 'paid' ? t('paid') : t('pending')}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Tab 5: Progress ──────────────────────────────────────────────── */}
        {tab === 5 && (
          <div className="mb4">
            <div className="sl mb3">{ar ? 'طريقة قياس التقدم' : 'Progress Method'}</div>
            {project.progressMode === 'pct' && (
              <div className="fg">
                <div className="sl">{ar ? 'نسبة الإنجاز' : 'Completion %'}</div>
                <div className="fl2 ic g3">
                  <input type="range" min="0" max="100" value={project.progressPct} style={{ flex: 1 }}
                    onChange={e => updateProjectProgress(pid, parseInt(e.target.value))} />
                  <span style={{ fontSize: 16, fontWeight: 700, minWidth: 40 }}>{project.progressPct}%</span>
                </div>
                <div className="pr" style={{ height: 8, marginTop: 7 }}><div className="pf pf-ok" style={{ width: `${project.progressPct}%` }} /></div>
              </div>
            )}
            {project.progressMode === 'items' && (
              <>
                <div className="fl2 jb ic mb3">
                  <div className="sl">{t('contractItems')} — {project.contractItems.filter(i => i.done).length}/{project.contractItems.length} ({prg}%)</div>
                  <button className="btn bou btn-sm" onClick={() => setShowCIModal(true)}>+ {ar ? 'إضافة بند' : 'Add Item'}</button>
                </div>
                <div className="pr mb4"><div className="pf pf-ok" style={{ width: `${prg}%` }} /></div>
                {project.contractItems.length === 0 && <div className="al al-nv"><span>📋</span><span>{ar ? 'أضف بنوداً لتتبع الإنجاز' : 'Add items to track progress'}</span></div>}
                {project.contractItems.map(ci => (
                  <div key={ci.id} className={`ci${ci.done ? ' done' : ''}`} onClick={() => toggleContractItem(pid, ci.id)}>
                    <div className="ci-ck">{ci.done ? '✓' : ''}</div>
                    <div style={{ flex: 1, fontSize: 12 }}>{ci.title}</div>
                    <span className={`bdg ${ci.done ? 'dok' : 'dgy'}`}>{ci.done ? t('markDone') : (ar ? 'قيد التنفيذ' : 'Pending')}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Tab 6: Contract ──────────────────────────────────────────────── */}
        {tab === 6 && (
          <div>
            {project.contract ? (
              <div style={{ background: 'var(--nl)', border: '1px solid var(--b)', borderRadius: 'var(--r)', padding: 12, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 22 }}>{project.contract.type?.includes('pdf') ? '📕' : '🖼'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{project.contract.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--m)' }}>{project.contract.size} · {project.contract.uploadDate}</div>
                </div>
              </div>
            ) : (
              <div
                style={{ border: '2px dashed var(--b)', borderRadius: 'var(--r)', padding: 36, textAlign: 'center', cursor: 'pointer', marginBottom: 12 }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--g)' }}
                onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b)' }}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setContractFile(f) }}
              >
                <div style={{ fontSize: 28, opacity: .4, marginBottom: 6 }}>📄</div>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>
                  {ar ? 'اسحب الملف هنا أو انقر للاختيار' : 'Drag file here or click to choose'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--m)' }}>PDF، JPG، PNG</div>
              </div>
            )}

            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
              onChange={e => setContractFile(e.target.files?.[0] ?? null)} />

            {contractFile && !project.contract && (
              <div style={{ background: 'var(--okb)', border: '1px solid var(--okr)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                <div className="fl2 jb ic mb2">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>📎 {contractFile.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--m)' }}>{(contractFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button className="btn berou btn-xs" onClick={() => setContractFile(null)}>✕</button>
                </div>
                <button
                  className="btn bpr btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={uploadingContract}
                  onClick={handleContractUpload}
                >
                  {uploadingContract
                    ? (ar ? 'جارٍ الرفع...' : 'Uploading...')
                    : (ar ? '⬆ رفع العقد' : '⬆ Upload Contract')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <Modal title={`💳 ${t('addPayment')}`} onClose={() => setShowPayModal(false)} onSave={handleAddPayment} saveLabel={`💳 ${t('addPayment')}`} saveCls="bok2">
          <div className="al al-ok mb3"><span>💳</span><span>{ar ? 'ستُضاف للمشروع ولرأس المال تلقائياً' : 'Auto-added to project and capital'}</span></div>
          <div className="fg"><label className="fl">{t('amount')} *</label><input className="fc" type="number" min="1" placeholder="0" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('date')}</label><input className="fc" type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="fg">
              <label className="fl">{ar ? 'طريقة الدفع' : 'Payment Method'}</label>
              <select className="fc" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{methodLabel[m]}</option>)}
              </select>
            </div>
          </div>
          <div className="fg"><label className="fl">{t('notes')}</label><input className="fc" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </Modal>
      )}

      {/* Expense Modal */}
      {showExpModal && (
        <Modal title={`💸 ${t('addExpense')}`} onClose={() => setShowExpModal(false)} onSave={handleAddExpense} saveLabel={`💸 ${t('addExpense')}`} saveCls="ber2">
          <div className="fg"><label className="fl">{ar ? 'وصف المصروف' : 'Description'} *</label><input className="fc" value={expForm.label} onChange={e => setExpForm(f => ({ ...f, label: e.target.value }))} /></div>
          <div className="g2c">
            <div className="fg">
              <label className="fl">{t('category')}</label>
              <select className="fc" value={expForm.cat} onChange={e => setExpForm(f => ({ ...f, cat: e.target.value }))}>
                <option value="workers">{t('expWorkers')}</option>
                <option value="materials">{t('expMaterials')}</option>
                <option value="workshop">{t('expWorkshop')}</option>
                <option value="other">{t('expOther')}</option>
              </select>
            </div>
            <div className="fg"><label className="fl">{t('amount')} *</label><input className="fc" type="number" min="1" placeholder="0" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} /></div>
          </div>
          <div className="fg"><label className="fl">{t('date')}</label><input className="fc" type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} /></div>
        </Modal>
      )}

      {/* Contract Item Modal */}
      {showCIModal && (
        <Modal title={ar ? '+ إضافة بند' : '+ Add Contract Item'} onClose={() => setShowCIModal(false)} onSave={handleAddCI} saveLabel={ar ? 'إضافة' : 'Add'} saveCls="bpr">
          <div className="fg"><label className="fl">{ar ? 'عنوان البند' : 'Item Title'} *</label><input className="fc" value={ciTitle} onChange={e => setCiTitle(e.target.value)} placeholder={ar ? 'مثال: أعمال النجارة' : 'e.g. Carpentry work'} /></div>
        </Modal>
      )}

      {/* Worker Assignment Modal */}
      {showWAModal && (
        <Modal title={`👷 ${ar ? 'تعيين عامل للمشروع' : 'Assign Worker to Project'}`} onClose={() => setShowWAModal(false)} onSave={handleWorkerAssign} saveLabel={ar ? 'تعيين' : 'Assign'} saveCls="bok2">
          <div className="fg">
            <label className="fl">{ar ? 'العامل' : 'Worker'} *</label>
            <select className="fc" value={waForm.workerId} onChange={e => setWaForm(f => ({ ...f, workerId: e.target.value }))}>
              <option value="">— {ar ? 'اختر عاملاً' : 'Select worker'} —</option>
              {workers.filter(w => w.type === 'worker').map(w => <option key={w.id} value={w.id}>{w.name} {w.role ? `(${w.role})` : ''}</option>)}
            </select>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('amount')} *</label><input className="fc" type="number" min="1" placeholder="0" value={waForm.amount} onChange={e => setWaForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{t('date')}</label><input className="fc" type="date" value={waForm.date} onChange={e => setWaForm(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
          <div className="fg"><label className="fl">{t('notes')}</label><input className="fc" value={waForm.notes} onChange={e => setWaForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </Modal>
      )}
    </>
  )
}
