'use client'
import { useState } from 'react'
import { useAppStore, fmtC } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'
import Modal from '@/components/ui/Modal'
import WorkerProfileModal from '@/components/ui/WorkerProfileModal'
import type { Worker } from '@/types/store'

const COLORS = ['#1D6F42','#1A2744','#6C3FC0','#B8860B','#C0392B','#2980B9']
const WORKER_ROLES = ['carpenter','painter','electrician','plumber','welder','upholsterer','installer','supervisor','driver','other']

export default function WorkersPage() {
  const { t, locale } = useTranslation()
  const { workers, addWorker, updateWorker, deleteWorker, addToast, setLocale } = useAppStore()

  const ar = locale === 'ar'

  const [showWorkerModal,   setShowWorkerModal]   = useState(false)
  const [showWorkshopModal, setShowWorkshopModal] = useState(false)
  const [editWorker,        setEditWorker]        = useState<Worker | null>(null)
  const [profileWorker,     setProfileWorker]     = useState<Worker | null>(null)

  const [wForm,  setWForm]  = useState({ name: '', phone: '', role: 'other', status: 'active', dailyRate: '' })
  const [wsForm, setWsForm] = useState({ name: '', phone: '', contact: '', address: '', status: 'active' })
  const [editWForm,  setEditWForm]  = useState(wForm)
  const [editWsForm, setEditWsForm] = useState(wsForm)

  const roleLabel: Record<string,string> = {
    carpenter: ar?'نجار':'Carpenter', painter: ar?'دهان':'Painter', electrician: ar?'كهربائي':'Electrician',
    plumber: ar?'سباك':'Plumber', welder: ar?'لحام':'Welder', upholsterer: ar?'منجد':'Upholsterer',
    installer: ar?'مركّب':'Installer', supervisor: ar?'مشرف':'Supervisor', driver: ar?'سائق':'Driver', other: t('expOther'),
  }

  const humanWorkers = workers.filter(w => w.type === 'worker')
  const workshops    = workers.filter(w => w.type === 'workshop')

  const totalPaidAll    = workers.reduce((s, w) => s + (w.totalPaid ?? 0), 0)
  const totalPaidMonth  = workers.reduce((s, w) => s + (w.thisMonthPaid ?? 0), 0)

  const handleAddWorker = () => {
    if (!wForm.name.trim()) { addToast(t('fieldRequired'), 'ter'); return }
    addWorker({ name: wForm.name, type: 'worker', phone: wForm.phone, role: wForm.role, status: wForm.status, color: COLORS[humanWorkers.length % COLORS.length], avatar: wForm.name.charAt(0), dailyRate: parseFloat(wForm.dailyRate) || undefined })
    addToast(t('workerAdded'), 'tok')
    setShowWorkerModal(false)
    setWForm({ name: '', phone: '', role: 'other', status: 'active', dailyRate: '' })
  }

  const handleAddWorkshop = () => {
    if (!wsForm.name.trim()) { addToast(t('fieldRequired'), 'ter'); return }
    addWorker({ name: wsForm.name, type: 'workshop', phone: wsForm.phone, contact: wsForm.contact, address: wsForm.address, status: wsForm.status, color: '#6C3FC0', avatar: wsForm.name.charAt(0) })
    addToast(t('workshopAdded'), 'tok')
    setShowWorkshopModal(false)
    setWsForm({ name: '', phone: '', contact: '', address: '', status: 'active' })
  }

  const openEdit = (w: Worker, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditWorker(w)
    if (w.type === 'worker') setEditWForm({ name: w.name, phone: w.phone, role: w.role ?? 'other', status: w.status, dailyRate: String(w.dailyRate ?? '') })
    else setEditWsForm({ name: w.name, phone: w.phone, contact: w.contact ?? '', address: w.address ?? '', status: w.status })
  }

  const handleEditSave = () => {
    if (!editWorker) return
    if (editWorker.type === 'worker') {
      updateWorker(editWorker.id, { name: editWForm.name, phone: editWForm.phone, role: editWForm.role, status: editWForm.status, dailyRate: parseFloat(editWForm.dailyRate) || undefined })
    } else {
      updateWorker(editWorker.id, { name: editWsForm.name, phone: editWsForm.phone, contact: editWsForm.contact, address: editWsForm.address, status: editWsForm.status })
    }
    addToast(ar ? 'تم التحديث ✓' : 'Updated ✓', 'tok')
    setEditWorker(null)
  }

  const handleDelete = (w: Worker, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`${t('deleteWarn')}\n${w.name}`)) return
    deleteWorker(w.id)
    addToast(ar ? 'تم الحذف ✓' : 'Deleted ✓', 'tok')
  }

  const WorkerCard = ({ w }: { w: Worker }) => (
    <div
      className="card"
      style={{ cursor: 'pointer', transition: 'box-shadow .15s' }}
      onClick={() => setProfileWorker(w)}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
    >
      {/* Top: avatar + name + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div className="ava" style={{ background: w.color, width: 44, height: 44, fontSize: 18, flexShrink: 0 }}>
          {w.avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{w.name}</div>
          <div style={{ color: 'var(--m)', fontSize: 12 }}>
            {w.type === 'worker'
              ? (roleLabel[w.role ?? ''] ?? w.role ?? '—')
              : (w.contact || (ar ? 'ورشة' : 'Workshop'))}
          </div>
          {w.phone && <div style={{ color: 'var(--m)', fontSize: 11, marginTop: 1 }}>{w.phone}</div>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button className="btn bou btn-xs" onClick={e => openEdit(w, e)}>✏</button>
          <button className="btn berou btn-xs" onClick={e => handleDelete(w, e)}>🗑</button>
        </div>
      </div>

      {/* Status + daily rate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className={`bdg ${w.status === 'active' ? 'dok' : 'dgy'}`}>
          {w.status === 'active' ? t('active') : t('inactive')}
        </span>
        {w.type === 'worker' && w.dailyRate && (
          <span style={{ fontSize: 11, color: 'var(--m)' }}>
            {fmtC(w.dailyRate, t('egp'))} / {ar ? 'يوم' : 'day'}
          </span>
        )}
      </div>

      {/* Payment totals */}
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--br)', paddingTop: 10 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--m)', marginBottom: 3 }}>{t('thisMonth')}</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: (w.thisMonthPaid ?? 0) > 0 ? 'var(--er)' : 'var(--m)' }}>
            {fmtC(w.thisMonthPaid ?? 0, t('egp'))}
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--br)' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--m)', marginBottom: 3 }}>{t('totalPaid')}</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: (w.totalPaid ?? 0) > 0 ? 'var(--er)' : 'var(--m)' }}>
            {fmtC(w.totalPaid ?? 0, t('egp'))}
          </div>
        </div>
      </div>

      {/* Click hint */}
      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--m)' }}>
        {ar ? 'اضغط لعرض الملف الكامل' : 'Click to view full profile'}
      </div>
    </div>
  )

  return (
    <>
      <div className="topb">
        <div className="tbt">{t('workers')}</div>
        <div className="tba">
          <button className="btn bou btn-sm" onClick={() => setLocale(ar ? 'en' : 'ar')}>{ar ? 'English' : 'العربية'}</button>
          <button className="btn bok2 btn-sm" onClick={() => setShowWorkerModal(true)}>👷 + {t('addWorker')}</button>
          <button className="btn bai btn-sm" onClick={() => setShowWorkshopModal(true)}>🔧 + {t('addWorkshop')}</button>
        </div>
      </div>

      <div className="cnt pg">
        {/* Stats */}
        <div className="sg">
          <div className="sc nv"><div className="sl">{ar ? 'الكل' : 'All'}</div><div className="sv">{workers.length}</div><div className="ss">{ar ? 'عمال + ورش' : 'Workers + Workshops'}</div></div>
          <div className="sc gn"><div className="sl">{ar ? 'عمال' : 'Workers'}</div><div className="sv">{humanWorkers.length}</div></div>
          <div className="sc pp"><div className="sl">{ar ? 'ورش' : 'Workshops'}</div><div className="sv">{workshops.length}</div></div>
          <div className="sc rd"><div className="sl">{t('thisMonth')}</div><div className="sv">{fmtC(totalPaidMonth, t('egp'))}</div><div className="ss">{ar ? 'إجمالي مدفوع' : 'Total paid'}</div></div>
          <div className="sc rd"><div className="sl">{t('totalPaid')}</div><div className="sv">{fmtC(totalPaidAll, t('egp'))}</div></div>
        </div>

        {/* Workers section */}
        {humanWorkers.length > 0 && (
          <div className="mb4">
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--m)', marginBottom: 12 }}>
              👷 {ar ? 'العمال' : 'Workers'} ({humanWorkers.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {humanWorkers.map(w => <WorkerCard key={w.id} w={w} />)}
            </div>
          </div>
        )}

        {/* Workshops section */}
        {workshops.length > 0 && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--m)', marginBottom: 12 }}>
              🔧 {ar ? 'الورش' : 'Workshops'} ({workshops.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {workshops.map(w => <WorkerCard key={w.id} w={w} />)}
            </div>
          </div>
        )}

        {workers.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--m)', padding: 40 }}>
            {ar ? 'لا يوجد عمال أو ورش بعد. اضغط + للإضافة.' : 'No workers or workshops yet. Click + to add.'}
          </div>
        )}
      </div>

      {/* Worker Profile Modal */}
      {profileWorker && (
        <WorkerProfileModal worker={profileWorker} onClose={() => setProfileWorker(null)} />
      )}

      {/* Add Worker Modal */}
      {showWorkerModal && (
        <Modal title={`👷 ${t('addWorker')}`} onClose={() => setShowWorkerModal(false)} onSave={handleAddWorker} saveLabel={`👷 ${t('addWorker')}`} saveCls="bok2">
          <div className="g2c">
            <div className="fg"><label className="fl">{t('fullName')} *</label><input className="fc" value={wForm.name} onChange={e => setWForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
            <div className="fg"><label className="fl">{t('phone')}</label><input className="fc" value={wForm.phone} onChange={e => setWForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="g2c">
            <div className="fg">
              <label className="fl">{t('role')}</label>
              <select className="fc" value={wForm.role} onChange={e => setWForm(f => ({ ...f, role: e.target.value }))}>
                {WORKER_ROLES.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">{ar ? 'أجر يومي (اختياري)' : 'Daily Rate (optional)'}</label><input className="fc" type="number" min="0" value={wForm.dailyRate} onChange={e => setWForm(f => ({ ...f, dailyRate: e.target.value }))} /></div>
          </div>
          <div className="fg">
            <label className="fl">{t('status')}</label>
            <select className="fc" value={wForm.status} onChange={e => setWForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>
        </Modal>
      )}

      {/* Add Workshop Modal */}
      {showWorkshopModal && (
        <Modal title={`🔧 ${t('addWorkshop')}`} onClose={() => setShowWorkshopModal(false)} onSave={handleAddWorkshop} saveLabel={`🔧 ${t('addWorkshop')}`} saveCls="bai">
          <div className="g2c">
            <div className="fg"><label className="fl">{ar ? 'اسم الورشة' : 'Workshop Name'} *</label><input className="fc" value={wsForm.name} onChange={e => setWsForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
            <div className="fg"><label className="fl">{t('contact')}</label><input className="fc" value={wsForm.contact} onChange={e => setWsForm(f => ({ ...f, contact: e.target.value }))} /></div>
          </div>
          <div className="g2c">
            <div className="fg"><label className="fl">{t('phone')}</label><input className="fc" value={wsForm.phone} onChange={e => setWsForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="fg"><label className="fl">{t('address')}</label><input className="fc" value={wsForm.address} onChange={e => setWsForm(f => ({ ...f, address: e.target.value }))} /></div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editWorker && (
        <Modal title={`✏ ${ar ? 'تعديل' : 'Edit'} — ${editWorker.name}`} onClose={() => setEditWorker(null)} onSave={handleEditSave} saveLabel={ar ? 'حفظ' : 'Save'} saveCls="bpr">
          {editWorker.type === 'worker' ? (
            <>
              <div className="g2c">
                <div className="fg"><label className="fl">{t('fullName')}</label><input className="fc" value={editWForm.name} onChange={e => setEditWForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="fg"><label className="fl">{t('phone')}</label><input className="fc" value={editWForm.phone} onChange={e => setEditWForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="g2c">
                <div className="fg">
                  <label className="fl">{t('role')}</label>
                  <select className="fc" value={editWForm.role} onChange={e => setEditWForm(f => ({ ...f, role: e.target.value }))}>
                    {WORKER_ROLES.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="fl">{ar ? 'أجر يومي' : 'Daily Rate'}</label><input className="fc" type="number" min="0" value={editWForm.dailyRate} onChange={e => setEditWForm(f => ({ ...f, dailyRate: e.target.value }))} /></div>
              </div>
              <div className="fg">
                <label className="fl">{t('status')}</label>
                <select className="fc" value={editWForm.status} onChange={e => setEditWForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">{t('active')}</option>
                  <option value="inactive">{t('inactive')}</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="g2c">
                <div className="fg"><label className="fl">{ar ? 'اسم الورشة' : 'Workshop Name'}</label><input className="fc" value={editWsForm.name} onChange={e => setEditWsForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="fg"><label className="fl">{t('contact')}</label><input className="fc" value={editWsForm.contact} onChange={e => setEditWsForm(f => ({ ...f, contact: e.target.value }))} /></div>
              </div>
              <div className="g2c">
                <div className="fg"><label className="fl">{t('phone')}</label><input className="fc" value={editWsForm.phone} onChange={e => setEditWsForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="fg"><label className="fl">{t('address')}</label><input className="fc" value={editWsForm.address} onChange={e => setEditWsForm(f => ({ ...f, address: e.target.value }))} /></div>
              </div>
              <div className="fg">
                <label className="fl">{t('status')}</label>
                <select className="fc" value={editWsForm.status} onChange={e => setEditWsForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">{t('active')}</option>
                  <option value="inactive">{t('inactive')}</option>
                </select>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
