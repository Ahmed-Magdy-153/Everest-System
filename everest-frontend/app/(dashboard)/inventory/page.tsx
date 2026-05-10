'use client'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore, fmtC, isLow, isMid, lvl, sColor, sPct, invTotal, CATS, UNITS, CAT_ICONS } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'
import Modal from '@/components/ui/Modal'

type View = 'grid' | 'table' | 'log'

const LOG_COLOR: Record<string,string> = { logPurchase:'var(--ok)', logAdded:'var(--n)', logEdited:'var(--ai)', logIncreased:'var(--ok)', logDecreased:'var(--wa)', logSentToProject:'var(--ai)', logDeleted:'var(--er)' }
const LOG_ICON: Record<string,string>  = { logPurchase:'🛒', logAdded:'➕', logEdited:'✏', logIncreased:'📈', logDecreased:'📉', logSentToProject:'📤', logDeleted:'🗑' }

export default function InventoryPage() {
  const { t, locale } = useTranslation()
  const { inventory, invLog, addInventoryItem, increaseStock, decreaseStock, deleteInventoryItem, addToast, setLocale } = useAppStore()
  const activeProjects = useAppStore(useShallow(s => s.projects.filter(p => !p.deleted)))

  const [view, setView] = useState<View>('grid')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [sort, setSort] = useState('name')

  const [showAdd, setShowAdd] = useState(false)
  const [showInc, setShowInc] = useState<number | null>(null)
  const [showDec, setShowDec] = useState<number | null>(null)

  const [addForm, setAddForm] = useState({ name: '', cat: CATS[0], qty: '', unit: UNITS[0], cost: '', supplier: '', notes: '', lowAt: '10' })
  const [incForm, setIncForm] = useState({ qty: '', withCap: false, notes: '' })
  const [decForm, setDecForm] = useState({ qty: '', reason: 'damage', project: '', notes: '' })

  const lowCnt = inventory.filter(isLow).length

  let mats = inventory.filter(m => {
    if (catFilter && m.cat !== catFilter) return false
    if (search) { const q = search.toLowerCase(); if (!m.name.toLowerCase().includes(q) && !(m.supplier || '').toLowerCase().includes(q)) return false }
    return true
  })
  if (sort === 'qty') mats = [...mats].sort((a, b) => b.qty - a.qty)
  else if (sort === 'value') mats = [...mats].sort((a, b) => (b.qty * b.cost) - (a.qty * a.cost))
  else if (sort === 'low') mats = [...mats].sort((a, b) => (a.qty / Math.max(a.lowAt, 1)) - (b.qty / Math.max(b.lowAt, 1)))
  else mats = [...mats].sort((a, b) => a.name.localeCompare(b.name))

  const handleAddMat = () => {
    if (!addForm.name.trim()) { addToast(t('fieldRequired'), 'ter'); return }
    const qty = parseFloat(addForm.qty) || 0
    const cost = parseFloat(addForm.cost) || 0
    addInventoryItem({ name: addForm.name, cat: addForm.cat, qty, unit: addForm.unit, cost, supplier: addForm.supplier, notes: addForm.notes, lowAt: parseInt(addForm.lowAt) || 10 }, false)
    addToast(t('matAdded'), 'tok')
    setShowAdd(false)
    setAddForm({ name: '', cat: CATS[0], qty: '', unit: UNITS[0], cost: '', supplier: '', notes: '', lowAt: '10' })
  }

  const incMat = inventory.find(m => m.id === showInc)
  const decMat = inventory.find(m => m.id === showDec)

  const handleIncrease = () => {
    if (!incMat) return
    const qty = parseFloat(incForm.qty) || 0
    if (qty <= 0) { addToast(t('amountInvalid'), 'ter'); return }
    increaseStock(incMat.id, qty, incMat.cost, incForm.notes, incForm.withCap)
    addToast(t('stockIncreased'), 'tok')
    setShowInc(null)
    setIncForm({ qty: '', withCap: false, notes: '' })
  }

  const handleDecrease = () => {
    if (!decMat) return
    const qty = parseFloat(decForm.qty) || 0
    if (qty <= 0) { addToast(t('amountInvalid'), 'ter'); return }
    if (qty > decMat.qty) { addToast(t('insufficientStock'), 'ter'); return }
    decreaseStock(decMat.id, qty, decForm.reason, decForm.project, decForm.notes)
    addToast(t('stockDecreased'), 'tok')
    setShowDec(null)
    setDecForm({ qty: '', reason: 'damage', project: '', notes: '' })
  }

  return (
    <>
      <div className="topb">
        <div className="tbt">{t('inventory')}</div>
        <div className="tba">
          <button className="btn bou btn-sm" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>{locale === 'ar' ? 'English' : 'العربية'}</button>
          <button className="btn bpr btn-sm" onClick={() => setShowAdd(true)}>+ {t('addMaterial')}</button>
        </div>
      </div>

      <div className="cnt pg">
        <div className="sg">
          <div className="sc gd"><div className="sl">{t('totalInventory')}</div><div className="sv">{fmtC(invTotal(inventory), t('egp'))}</div></div>
          <div className="sc nv"><div className="sl">{t('totalItems')}</div><div className="sv">{inventory.length}</div></div>
          <div className={`sc ${lowCnt > 0 ? 'rd' : 'gn'}`}><div className="sl">{t('lowStock')}</div><div className="sv">{lowCnt}</div><div className="ss">{lowCnt > 0 ? t('lowStockWarn') : '✓ ' + (locale === 'ar' ? 'جيد' : 'Good')}</div></div>
          <div className="sc wa"><div className="sl">{t('capitalBalance')}</div><div className="sv">{fmtC(useAppStore.getState().capital, t('egp'))}</div></div>
        </div>

        {/* View toggle + filters */}
        <div className="fl2 ic g2 mb3 fw">
          <div className="vt">
            <button className={`vtb${view === 'grid' ? ' a' : ''}`} onClick={() => setView('grid')}>⊞ {t('viewGrid')}</button>
            <button className={`vtb${view === 'table' ? ' a' : ''}`} onClick={() => setView('table')}>≡ {t('viewTable')}</button>
            <button className={`vtb${view === 'log' ? ' a' : ''}`} onClick={() => setView('log')}>📋 {locale === 'ar' ? 'السجل' : 'Log'}</button>
          </div>
        </div>

        <div className="fbar">
          <span className="fbl">{locale === 'ar' ? 'بحث:' : 'Search:'}</span>
          <input className="fctl" style={{ minWidth: 140 }} type="text" placeholder={t('searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
          <span className="fbl">{locale === 'ar' ? 'الفئة:' : 'Cat:'}</span>
          <select className="fctl" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">{t('catAll')}</option>
            {CATS.map(c => <option key={c} value={c}>{t(c as any)}</option>)}
          </select>
          <span className="fbl">{locale === 'ar' ? 'ترتيب:' : 'Sort:'}</span>
          <select className="fctl" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="name">{locale === 'ar' ? 'الاسم' : 'Name'}</option>
            <option value="qty">{locale === 'ar' ? 'الكمية' : 'Qty'}</option>
            <option value="value">{locale === 'ar' ? 'القيمة' : 'Value'}</option>
            <option value="low">{locale === 'ar' ? 'منخفض أولاً' : 'Low First'}</option>
          </select>
        </div>

        {/* Grid View */}
        {view === 'grid' && (
          mats.length === 0
            ? <div className="card" style={{ textAlign: 'center', padding: 36, color: 'var(--m)' }}>{t('noMaterials')}</div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                {mats.map(m => {
                  const tv = m.qty * m.cost
                  const sp = sPct(m)
                  return (
                    <div key={m.id} className={`icard ${lvl(m)}`}>
                      <div className="fl2 jb ic mb3">
                        <div className="mic" style={{ background: isLow(m) ? 'var(--erb)' : isMid(m) ? 'var(--wab)' : 'var(--okb)' }}>{CAT_ICONS[m.cat] || '📦'}</div>
                        <div style={{ textAlign: 'end' }}>
                          {isLow(m) ? <span className="bdg der" style={{ fontSize: 9 }}>⚠ {locale === 'ar' ? 'منخفض' : 'Low'}</span>
                            : isMid(m) ? <span className="bdg dwa" style={{ fontSize: 9 }}>!</span>
                            : <span className="bdg dok" style={{ fontSize: 9 }}>✓</span>}
                          <div style={{ fontSize: 9, color: 'var(--m)', marginTop: 1 }}>{t(m.cat as any)}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 1 }}>{m.name}</div>
                      {m.supplier && <div style={{ fontSize: 10, color: 'var(--m)', marginBottom: 5 }}>🏭 {m.supplier}</div>}
                      <div className="fl2 jb ic mb3">
                        <div><div className="qind" style={{ color: sColor(m) }}>{m.qty}</div><div className="qunit">{t(m.unit as any)}</div></div>
                        <div style={{ textAlign: 'end' }}>
                          <div style={{ fontSize: 10, color: 'var(--m)' }}>{fmtC(m.cost, t('egp'))}/{t(m.unit as any)}</div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--g)' }}>{fmtC(tv, t('egp'))}</div>
                        </div>
                      </div>
                      <div className="sbar"><div className="sfill" style={{ width: `${sp}%`, background: sColor(m) }} /></div>
                      <div style={{ fontSize: 9, color: 'var(--m)', marginTop: 2 }}>{locale === 'ar' ? 'حد التنبيه:' : 'Alert at:'} {m.lowAt} {t(m.unit as any)}</div>
                      <div className="dvd" />
                      <div className="fl2 g1 fw">
                        <button className="btn bok2 btn-xs" onClick={() => setShowInc(m.id)}>+</button>
                        <button className="btn bwa btn-xs" onClick={() => setShowDec(m.id)}>−</button>
                        <button className="btn berou btn-xs" onClick={() => { if (confirm(`${t('deleteWarn')}\n${m.name}`)) { deleteInventoryItem(m.id); addToast(t('matDeleted'), 'tok') } }}>🗑</button>
                      </div>
                    </div>
                  )
                })}
              </div>
        )}

        {/* Table View */}
        {view === 'table' && (
          <div className="card">
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>{t('name')}</th><th>{t('category')}</th><th>{t('quantity')}</th>
                    <th>{t('unit')}</th><th>{t('costPerUnit')}</th><th>{t('totalValue')}</th>
                    <th>{t('supplier')}</th><th>{locale === 'ar' ? 'حالة' : 'Status'}</th><th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mats.map(m => (
                    <tr key={m.id}>
                      <td><strong>{m.name}</strong></td>
                      <td><span className="bdg dnv">{t(m.cat as any)}</span></td>
                      <td><span style={{ fontWeight: 700, color: sColor(m) }}>{m.qty}</span></td>
                      <td style={{ color: 'var(--m)' }}>{t(m.unit as any)}</td>
                      <td>{fmtC(m.cost, t('egp'))}</td>
                      <td style={{ fontWeight: 700, color: 'var(--g)' }}>{fmtC(m.qty * m.cost, t('egp'))}</td>
                      <td style={{ color: 'var(--m)' }}>{m.supplier || '—'}</td>
                      <td>{isLow(m) ? <span className="bdg der">⚠ {locale === 'ar' ? 'منخفض' : 'Low'}</span> : isMid(m) ? <span className="bdg dwa">!</span> : <span className="bdg dok">✓</span>}</td>
                      <td>
                        <div className="fl2 g1">
                          <button className="btn bok2 btn-xs" onClick={() => setShowInc(m.id)}>+</button>
                          <button className="btn bwa btn-xs" onClick={() => setShowDec(m.id)}>−</button>
                          <button className="btn berou btn-xs" onClick={() => { if (confirm(`${t('deleteWarn')}\n${m.name}`)) { deleteInventoryItem(m.id); addToast(t('matDeleted'), 'tok') } }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--bg)' }}>
                    <td colSpan={5} style={{ fontWeight: 700, color: 'var(--m)' }}>{locale === 'ar' ? 'الإجمالي' : 'Total'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--g)' }}>{fmtC(mats.reduce((s, m) => s + m.qty * m.cost, 0), t('egp'))}</td>
                    <td colSpan={3} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Log View */}
        {view === 'log' && (
          <div className="card">
            <div className="ch"><div className="ct">📋 {t('viewLog')}</div><span style={{ fontSize: 11, color: 'var(--m)' }}>{invLog.length} {locale === 'ar' ? 'سجل' : 'records'}</span></div>
            {invLog.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--m)' }}>{t('noLogs')}</div>}
            {invLog.map(l => (
              <div key={l.id} className="lrow">
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: LOG_COLOR[l.action] || 'var(--m)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{LOG_ICON[l.action] || '📋'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fl2 jb ic">
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>{l.matName}</span>
                      <span className="bdg" style={{ background: (LOG_COLOR[l.action] || 'var(--m)') + '22', color: LOG_COLOR[l.action] || 'var(--m)', marginInlineStart: 5 }}>{t(l.action as any)}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--m)' }}>{l.date}</div>
                  </div>
                  <div className="fl2 ic g3 fw" style={{ marginTop: 2, fontSize: 11, color: 'var(--m)' }}>
                    <span>{t('qtyBefore')}: <strong>{l.qBefore}</strong> → {t('qtyAfter')}: <strong>{l.qAfter}</strong></span>
                    {l.total ? <span style={{ color: 'var(--er)' }}>{fmtC(l.total, t('egp'))}</span> : null}
                    {l.project ? <span>📁 {l.project}</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Material Modal */}
      {showAdd && (
        <Modal title={`+ ${t('addMaterial')}`} onClose={() => setShowAdd(false)} onSave={handleAddMat} saveLabel={`+ ${t('addMaterial')}`} saveCls="bpr">
          <div className="g2c">
            <div className="fg"><label className="fl">{t('name')} *</label><input className="fc" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{t('category')}</label><select className="fc" value={addForm.cat} onChange={e => setAddForm(f => ({ ...f, cat: e.target.value }))}>{CATS.map(c => <option key={c} value={c}>{t(c as any)}</option>)}</select></div>
          </div>
          <div className="g3c">
            <div className="fg"><label className="fl">{t('quantity')}</label><input className="fc" type="number" min="0" value={addForm.qty} onChange={e => setAddForm(f => ({ ...f, qty: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{t('unit')}</label><select className="fc" value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))}>{UNITS.map(u => <option key={u} value={u}>{t(u as any)}</option>)}</select></div>
            <div className="fg"><label className="fl">{t('costPerUnit')}</label><input className="fc" type="number" min="0" value={addForm.cost} onChange={e => setAddForm(f => ({ ...f, cost: e.target.value }))} /></div>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('supplier')}</label><input className="fc" value={addForm.supplier} onChange={e => setAddForm(f => ({ ...f, supplier: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{locale === 'ar' ? 'حد التنبيه' : 'Low stock at'}</label><input className="fc" type="number" min="0" value={addForm.lowAt} onChange={e => setAddForm(f => ({ ...f, lowAt: e.target.value }))} /></div>
          </div>
          <div className="fg"><label className="fl">{t('notes')}</label><textarea className="fc" rows={2} value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </Modal>
      )}

      {/* Increase Stock Modal */}
      {showInc !== null && incMat && (
        <Modal title={`📈 ${t('increaseStock')}`} onClose={() => setShowInc(null)} onSave={handleIncrease} saveLabel={`📈 ${t('increaseStock')}`} saveCls="bok2">
          <div className="al al-nv mb3"><span>📦</span><span>{locale === 'ar' ? `المخزون الحالي: ${incMat.qty} ${t(incMat.unit as any)}` : `Current: ${incMat.qty} ${t(incMat.unit as any)}`}</span></div>
          <div className="fg"><label className="fl">{locale === 'ar' ? 'الكمية المضافة' : 'Quantity to Add'} *</label><input className="fc" type="number" min="0.01" step="0.01" placeholder="0" value={incForm.qty} onChange={e => setIncForm(f => ({ ...f, qty: e.target.value }))} /></div>
          <div className="fg"><label className="fl">{t('notes')}</label><input className="fc" value={incForm.notes} onChange={e => setIncForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </Modal>
      )}

      {/* Decrease Stock Modal */}
      {showDec !== null && decMat && (
        <Modal title={`📉 ${t('decreaseStock')}`} onClose={() => setShowDec(null)} onSave={handleDecrease} saveLabel={`📉 ${t('decreaseStock')}`} saveCls="bwa">
          <div className="al al-nv mb3"><span>📦</span><span>{locale === 'ar' ? `المخزون الحالي: ${decMat.qty} ${t(decMat.unit as any)}` : `Current: ${decMat.qty} ${t(decMat.unit as any)}`}</span></div>
          <div className="fg"><label className="fl">{locale === 'ar' ? 'الكمية المخفضة' : 'Quantity to Decrease'} *</label><input className="fc" type="number" min="0.01" max={decMat.qty} step="0.01" placeholder="0" value={decForm.qty} onChange={e => setDecForm(f => ({ ...f, qty: e.target.value }))} /></div>
          <div className="fg">
            <label className="fl">{t('adjustReason')}</label>
            <select className="fc" value={decForm.reason} onChange={e => setDecForm(f => ({ ...f, reason: e.target.value }))}>
              <option value="damage">{locale === 'ar' ? 'تلف/كسر' : 'Damage'}</option>
              <option value="loss">{locale === 'ar' ? 'فقدان' : 'Loss'}</option>
              <option value="project">{locale === 'ar' ? 'صرف لمشروع' : 'Issued to Project'}</option>
              <option value="adjustment">{locale === 'ar' ? 'تسوية مخزون' : 'Stock Adjustment'}</option>
            </select>
          </div>
          <div className="fg">
            <label className="fl">{t('project')}</label>
            <select className="fc" value={decForm.project} onChange={e => setDecForm(f => ({ ...f, project: e.target.value }))}>
              <option value="">— {locale === 'ar' ? 'بدون مشروع' : 'No Project'} —</option>
              {activeProjects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="fg"><label className="fl">{t('notes')}</label><input className="fc" value={decForm.notes} onChange={e => setDecForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </Modal>
      )}
    </>
  )
}
