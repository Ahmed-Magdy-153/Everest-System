'use client'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore, fmtC, getProjProgress, getProjProfit, getProjExp, STATUS_BADGE } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'
import Modal from '@/components/ui/Modal'
import ProjectDetail from './ProjectDetail'
import type { Project } from '@/types/store'

type Filter = 'all' | 'active' | 'done' | 'delayed'

const ALL_STATUSES = ['newStatus','inProgress','completed','delayed','cancelled']

export default function ProjectsPage() {
  const { t, locale } = useTranslation()
  const { addProject, updateProject, addToast, setLocale, deleteProject } = useAppStore()
  const activeProjects = useAppStore(useShallow(s => s.projects.filter(p => !p.deleted)))

  const ar = locale === 'ar'

  const [filter, setFilter]     = useState<Filter>('all')
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [showQuick, setShowQuick] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)

  const emptyAdd = { name: '', client: '', phone: '', address: '', price: '', status: 'newStatus', received: '', notes: '', startDate: '', endDate: '' }
  const [addForm, setAddForm]   = useState(emptyAdd)
  const [quickForm, setQuickForm] = useState({ name: '', client: '', status: 'newStatus', price: '', received: '', notes: '' })
  const [editForm, setEditForm] = useState(emptyAdd)

  const statusLabel: Record<string,string> = {
    inProgress: t('inProgress'), completed: t('completed'), delayed: t('delayed'),
    newStatus: t('newStatus'), cancelled: ar ? 'ملغي' : 'Cancelled',
  }

  const filtered = activeProjects.filter(p => {
    const matchFilter =
      filter === 'active'  ? (p.status === 'inProgress' || p.status === 'newStatus') :
      filter === 'done'    ? p.status === 'completed' :
      filter === 'delayed' ? p.status === 'delayed' : true
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.client || '').toLowerCase().includes(q) || (p.address || '').toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totV = activeProjects.reduce((s, p) => s + p.price, 0)
  const totR = activeProjects.reduce((s, p) => s + p.received, 0)
  const totP = activeProjects.reduce((s, p) => s + getProjProfit(p), 0)

  const handleAddProject = () => {
    if (!addForm.name.trim() || !addForm.price) { addToast(t('fieldRequired'), 'ter'); return }
    const recv = parseFloat(addForm.received) || 0
    addProject({ name: addForm.name, client: addForm.client, phone: addForm.phone, address: addForm.address, price: parseFloat(addForm.price), received: recv, status: addForm.status, quickMode: false, progressMode: 'pct', notes: addForm.notes, startDate: addForm.startDate, endDate: addForm.endDate, initialReceived: recv })
    addToast(t('projectAdded'), 'tok')
    setShowAdd(false)
    setAddForm(emptyAdd)
  }

  const handleQuickProject = () => {
    if (!quickForm.name.trim()) { addToast(t('fieldRequired'), 'ter'); return }
    const recv = parseFloat(quickForm.received) || 0
    addProject({ name: quickForm.name, client: quickForm.client, address: '', price: parseFloat(quickForm.price) || 0, received: recv, status: quickForm.status, quickMode: true, progressMode: 'pct', notes: quickForm.notes, initialReceived: recv })
    addToast(t('projectAdded'), 'tok')
    setShowQuick(false)
    setQuickForm({ name: '', client: '', status: 'newStatus', price: '', received: '', notes: '' })
  }

  const openEdit = (p: Project) => {
    setEditProject(p)
    setEditForm({ name: p.name, client: p.client, phone: p.phone ?? '', address: p.address, price: String(p.price), status: p.status, received: String(p.received), notes: p.notes, startDate: p.startDate ?? '', endDate: p.endDate ?? '' })
  }

  const handleEditSave = () => {
    if (!editProject) return
    if (!editForm.name.trim()) { addToast(t('fieldRequired'), 'ter'); return }
    updateProject(editProject.id, {
      name: editForm.name, client: editForm.client, phone: editForm.phone,
      address: editForm.address, price: parseFloat(editForm.price) || editProject.price,
      status: editForm.status, notes: editForm.notes,
      startDate: editForm.startDate, endDate: editForm.endDate,
    })
    addToast(ar ? 'تم تحديث المشروع ✓' : 'Project updated ✓', 'tok')
    setEditProject(null)
  }

  const handleStatusChange = (p: Project, status: string) => {
    updateProject(p.id, { status })
    addToast(ar ? 'تم تحديث الحالة ✓' : 'Status updated ✓', 'tok')
  }

  if (detailId !== null) return <ProjectDetail pid={detailId} onClose={() => setDetailId(null)} />

  return (
    <>
      <div className="topb">
        <div className="tbt">{t('projects')}</div>
        <div className="tba">
          <button className="btn bou btn-sm" onClick={() => setLocale(ar ? 'en' : 'ar')}>{ar ? 'English' : 'العربية'}</button>
          <button className="btn bwa btn-sm" onClick={() => setShowQuick(true)}>⚡ {t('quickProject')}</button>
          <button className="btn bpr btn-sm" onClick={() => setShowAdd(true)}>+ {t('addProject')}</button>
        </div>
      </div>

      <div className="cnt pg">
        {/* Stats */}
        <div className="sg">
          <div className="sc gd"><div className="sl">{t('projectPrice')}</div><div className="sv">{fmtC(totV, t('egp'))}</div></div>
          <div className="sc gn"><div className="sl">{t('received')}</div><div className="sv">{fmtC(totR, t('egp'))}</div></div>
          <div className="sc nv"><div className="sl">{t('remaining')}</div><div className="sv">{fmtC(totV - totR, t('egp'))}</div></div>
          <div className={`sc ${totP >= 0 ? 'gn' : 'rd'}`}><div className="sl">{t('netProfit')}</div><div className="sv">{fmtC(totP, t('egp'))}</div></div>
        </div>

        {/* Search + Filters */}
        <div className="fbar mb3">
          <span className="fbl">{ar ? 'بحث:' : 'Search:'}</span>
          <input className="fctl" style={{ minWidth: 180 }} placeholder={ar ? 'اسم المشروع أو العميل...' : 'Project or client name...'} value={search} onChange={e => setSearch(e.target.value)} />
          <span className="fbl">{ar ? 'تصفية:' : 'Filter:'}</span>
          {(['all','active','done','delayed'] as Filter[]).map(f => (
            <button key={f} className={`btn ${filter === f ? 'bpr' : 'bou'} btn-sm`} onClick={() => setFilter(f)}>
              {f === 'all' ? t('filterAll') : f === 'active' ? t('filterActive') : f === 'done' ? t('filterDone') : (ar ? 'متأخر' : 'Delayed')}
            </button>
          ))}
        </div>

        {/* Project cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 10 }}>
          {filtered.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--m)', gridColumn: '1/-1' }}>
              {ar ? 'لا توجد مشاريع مطابقة' : 'No matching projects'}
            </div>
          )}
          {filtered.map(p => {
            const prg    = getProjProgress(p)
            const prf    = getProjProfit(p)
            const margin = p.price > 0 ? Math.round(prf / p.price * 100) : 0
            const lowMargin = margin < 15

            return (
              <div key={p.id} className="card" style={{ borderInlineStart: `3px solid ${p.status === 'completed' ? 'var(--ok)' : p.status === 'delayed' ? 'var(--er)' : p.quickMode ? 'var(--wa)' : 'var(--n)'}` }}>
                <div className="ch" style={{ marginBottom: 9 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="fl2 ic g2 mb2">
                      <strong style={{ fontSize: 12 }}>{p.name}</strong>
                      {p.quickMode && <span className="bdg dwa" style={{ fontSize: 9 }}>⚡</span>}
                      {lowMargin && prf >= 0 && <span className="bdg der" style={{ fontSize: 9 }}>⚠ {ar ? 'هامش منخفض' : 'Low margin'}</span>}
                      {prf < 0  && <span className="bdg der" style={{ fontSize: 9 }}>🔴 {ar ? 'خسارة' : 'Loss'}</span>}
                    </div>
                    {p.client && <div style={{ fontSize: 10, color: 'var(--m)' }}>👤 {p.client}</div>}
                    {(p.startDate || p.endDate) && (
                      <div style={{ fontSize: 10, color: 'var(--m)', marginTop: 1 }}>
                        📅 {p.startDate || '?'} → {p.endDate || '?'}
                      </div>
                    )}
                  </div>
                  {/* Status quick-change */}
                  <select
                    className={`bdg ${STATUS_BADGE[p.status] || 'dgy'}`}
                    style={{ border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 10, background: 'transparent' }}
                    value={p.status}
                    onChange={e => handleStatusChange(p, e.target.value)}
                    onClick={e => e.stopPropagation()}
                  >
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{statusLabel[s] || s}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 10 }}>
                  <div><div className="sl">{t('projectPrice')}</div><div style={{ fontWeight: 700, fontSize: 11 }}>{fmtC(p.price, t('egp'))}</div></div>
                  <div><div className="sl">{t('received')}</div><div style={{ fontWeight: 700, fontSize: 11, color: 'var(--ok)' }}>{fmtC(p.received, t('egp'))}</div></div>
                  <div>
                    <div className="sl">{prf >= 0 ? t('profit') : t('loss')}</div>
                    <div style={{ fontWeight: 700, fontSize: 11, color: prf >= 0 ? 'var(--ok)' : 'var(--er)' }}>{fmtC(Math.abs(prf), t('egp'))}</div>
                  </div>
                </div>

                <div className="fl2 jb" style={{ fontSize: 10, color: 'var(--m)', marginBottom: 2 }}>
                  <span>{ar ? 'التحصيل' : 'Collection'} — {margin}% {ar ? 'هامش' : 'margin'}</span>
                  <span>{prg}%</span>
                </div>
                <div className="pr mb3"><div className="pf" style={{ width: `${prg}%`, background: lowMargin ? 'var(--wa)' : undefined }} /></div>

                <div className="dvd" />
                <div className="fl2 g1 fw">
                  <button className="btn bnv btn-xs" onClick={() => setDetailId(p.id)}>📋 {t('view')}</button>
                  <button className="btn bou btn-xs" onClick={() => openEdit(p)}>✏ {ar ? 'تعديل' : 'Edit'}</button>
                  <button className="btn berou btn-xs" onClick={() => { if (confirm(`${t('deleteWarn')}\n${p.name}`)) { deleteProject(p.id); addToast(t('projectDeleted'), 'tok') } }}>🗑</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Project Modal */}
      {showAdd && (
        <Modal title={`+ ${t('addProject')}`} onClose={() => setShowAdd(false)} onSave={handleAddProject} saveLabel={`+ ${t('addProject')}`} saveCls="bpr">
          <div className="g2c">
            <div className="fg"><label className="fl">{t('name')} *</label><input className="fc" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{t('client')}</label><input className="fc" value={addForm.client} onChange={e => setAddForm(f => ({ ...f, client: e.target.value }))} /></div>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('phone')}</label><input className="fc" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{t('address')}</label><input className="fc" value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} /></div>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('projectPrice')} *</label><input className="fc" type="number" min="0" value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{t('received')}</label><input className="fc" type="number" value={addForm.received} onChange={e => setAddForm(f => ({ ...f, received: e.target.value }))} /></div>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{ar ? 'تاريخ البداية' : 'Start Date'}</label><input className="fc" type="date" value={addForm.startDate} onChange={e => setAddForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{ar ? 'تاريخ التسليم' : 'End Date'}</label><input className="fc" type="date" value={addForm.endDate} onChange={e => setAddForm(f => ({ ...f, endDate: e.target.value }))} /></div>
          </div>
          <div className="fg">
            <label className="fl">{t('status')}</label>
            <select className="fc" value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{statusLabel[s] || s}</option>)}
            </select>
          </div>
          <div className="fg"><label className="fl">{t('notes')}</label><textarea className="fc" rows={2} value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </Modal>
      )}

      {/* Quick Project Modal */}
      {showQuick && (
        <Modal title={`⚡ ${t('quickProject')}`} onClose={() => setShowQuick(false)} onSave={handleQuickProject} saveLabel={`⚡ ${t('quickProject')}`} saveCls="bwa">
          <div className="al al-wa mb3"><span>⚡</span><span>{ar ? 'أدخل المعلومات الأساسية فقط' : 'Enter basics only — add details later'}</span></div>
          <div className="fg"><label className="fl">{t('name')} *</label><input className="fc" value={quickForm.name} onChange={e => setQuickForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('client')}</label><input className="fc" value={quickForm.client} onChange={e => setQuickForm(f => ({ ...f, client: e.target.value }))} /></div>
            <div className="fg">
              <label className="fl">{t('status')}</label>
              <select className="fc" value={quickForm.status} onChange={e => setQuickForm(f => ({ ...f, status: e.target.value }))}>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{statusLabel[s] || s}</option>)}
              </select>
            </div>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('projectPrice')}</label><input className="fc" type="number" value={quickForm.price} onChange={e => setQuickForm(f => ({ ...f, price: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{ar ? 'دفعة مستلمة' : 'Initial Received'}</label><input className="fc" type="number" value={quickForm.received} onChange={e => setQuickForm(f => ({ ...f, received: e.target.value }))} /></div>
          </div>
          <div className="fg"><label className="fl">{t('notes')}</label><input className="fc" value={quickForm.notes} onChange={e => setQuickForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </Modal>
      )}

      {/* Edit Project Modal */}
      {editProject && (
        <Modal title={`✏ ${ar ? 'تعديل المشروع' : 'Edit Project'}`} onClose={() => setEditProject(null)} onSave={handleEditSave} saveLabel={ar ? 'حفظ التعديلات' : 'Save Changes'} saveCls="bpr">
          <div className="g2c">
            <div className="fg"><label className="fl">{t('name')} *</label><input className="fc" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{t('client')}</label><input className="fc" value={editForm.client} onChange={e => setEditForm(f => ({ ...f, client: e.target.value }))} /></div>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('phone')}</label><input className="fc" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{t('address')}</label><input className="fc" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('projectPrice')}</label><input className="fc" type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} /></div>
            <div className="fg">
              <label className="fl">{t('status')}</label>
              <select className="fc" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{statusLabel[s] || s}</option>)}
              </select>
            </div>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{ar ? 'تاريخ البداية' : 'Start Date'}</label><input className="fc" type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{ar ? 'تاريخ التسليم' : 'End Date'}</label><input className="fc" type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} /></div>
          </div>
          <div className="fg"><label className="fl">{t('notes')}</label><textarea className="fc" rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </Modal>
      )}
    </>
  )
}
