'use client'
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore, fmtC, getProjProfit, getProjExp, getProjProgress, STATUS_BADGE } from '@/store'
import { useTranslation } from '@/hooks/useTranslation'

// xlsx is loaded dynamically to avoid SSR issues
async function downloadExcel(data: Record<string, unknown>[], filename: string, sheetName: string) {
  const XLSX = await import('xlsx')
  const ws   = XLSX.utils.json_to_sheet(data)
  const wb   = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export default function ReportsPage() {
  const { t, locale } = useTranslation()
  const { setLocale, expenses, capitalTx } = useAppStore()
  const activeProjects = useAppStore(useShallow(s => s.projects.filter(p => !p.deleted)))
  const inventory      = useAppStore(s => s.inventory)
  const workers        = useAppStore(s => s.workers)

  const ar = locale === 'ar'

  const maxAbs = Math.max(...activeProjects.map(p => Math.abs(getProjProfit(p))), 1)

  const statusLabel: Record<string,string> = {
    inProgress: t('inProgress'), completed: t('completed'), delayed: t('delayed'), newStatus: t('newStatus'),
  }

  // Monthly expense breakdown
  const monthlyExpenses = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => {
      const month = e.date.substring(0, 7) // "YYYY-MM"
      map[month] = (map[month] ?? 0) + e.amount
    })
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .reverse()
  }, [expenses])

  const maxMonthly = Math.max(...monthlyExpenses.map(([, v]) => v), 1)

  // Monthly income
  const monthlyIncome = useMemo(() => {
    const map: Record<string, number> = {}
    capitalTx.filter(x => x.type === 'income').forEach(x => {
      const month = x.date.substring(0, 7)
      map[month] = (map[month] ?? 0) + x.amount
    })
    return map
  }, [capitalTx])

  // Export functions
  const exportProjects = () => downloadExcel(
    activeProjects.map(p => ({
      [ar?'اسم المشروع':'Project']:   p.name,
      [ar?'العميل':'Client']:         p.client,
      [ar?'قيمة المشروع':'Value']:    p.price,
      [ar?'المحصل':'Received']:       p.received,
      [ar?'المصروفات':'Expenses']:     getProjExp(p),
      [ar?'الربح':'Profit']:           getProjProfit(p),
      [ar?'الهامش%':'Margin%']:        p.price > 0 ? Math.round(getProjProfit(p)/p.price*100) : 0,
      [ar?'الحالة':'Status']:          statusLabel[p.status] ?? p.status,
      [ar?'تاريخ الإنشاء':'Created']: p.createdAt,
    })),
    'projects', ar ? 'المشاريع' : 'Projects'
  )

  const exportExpenses = () => downloadExcel(
    expenses.map(e => ({
      [ar?'التاريخ':'Date']:           e.date,
      [ar?'العنوان':'Title']:           e.title,
      [ar?'الفئة':'Category']:          e.category,
      [ar?'المشروع':'Project']:         e.project || '—',
      [ar?'المدفوع لـ':'Paid To']:      e.paidTo || '—',
      [ar?'المبلغ':'Amount']:            e.amount,
    })),
    'expenses', ar ? 'المصروفات' : 'Expenses'
  )

  const exportInventory = () => downloadExcel(
    inventory.map(m => ({
      [ar?'المادة':'Material']:         m.name,
      [ar?'الكمية':'Quantity']:          m.qty,
      [ar?'الوحدة':'Unit']:              m.unit,
      [ar?'تكلفة الوحدة':'Cost/Unit']:  m.cost,
      [ar?'القيمة الإجمالية':'Total']:  m.qty * m.cost,
      [ar?'المورد':'Supplier']:           m.supplier || '—',
      [ar?'حد التنبيه':'Low At']:        m.lowAt,
    })),
    'inventory', ar ? 'المخزون' : 'Inventory'
  )

  const exportCapital = () => downloadExcel(
    capitalTx.map(tx => ({
      [ar?'التاريخ':'Date']:    tx.date,
      [ar?'النوع':'Type']:       tx.type,
      [ar?'السبب':'Reason']:     tx.reason,
      [ar?'المشروع':'Project']:  tx.project || '—',
      [ar?'المبلغ':'Amount']:    tx.amount,
    })),
    'capital', ar ? 'رأس المال' : 'Capital'
  )

  const exportWorkers = () => downloadExcel(
    workers.map(w => ({
      [ar?'الاسم':'Name']:    w.name,
      [ar?'النوع':'Type']:     w.type,
      [ar?'الهاتف':'Phone']:  w.phone || '—',
      [ar?'الدور':'Role']:     w.role || w.contact || '—',
      [ar?'الحالة':'Status']: w.status,
    })),
    'workers', ar ? 'العمال' : 'Workers'
  )

  return (
    <>
      <div className="topb">
        <div className="tbt">{t('reports')}</div>
        <div className="tba">
          <button className="btn bou btn-sm" onClick={() => setLocale(ar ? 'en' : 'ar')}>{ar ? 'English' : 'العربية'}</button>
        </div>
      </div>

      <div className="cnt pg">
        {/* Row 1: P&L + Export */}
        <div className="g2c mb4">
          {/* Project P&L */}
          <div className="card">
            <div className="ct mb3">{ar ? 'ربح/خسارة المشاريع' : 'Project P&L'}</div>
            {activeProjects.length === 0 && <div style={{ color: 'var(--m)', fontSize: 12 }}>{ar ? 'لا توجد مشاريع' : 'No projects'}</div>}
            {activeProjects.map(p => {
              const pr     = getProjProfit(p)
              const pct    = Math.round(Math.abs(pr) / maxAbs * 100)
              const margin = p.price > 0 ? Math.round(pr / p.price * 100) : 0
              return (
                <div key={p.id} style={{ marginBottom: 12 }}>
                  <div className="fl2 jb" style={{ fontSize: 11, marginBottom: 3 }}>
                    <div className="fl2 ic g2">
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      {margin < 15 && pr >= 0 && <span className="bdg dwa" style={{ fontSize: 9 }}>⚠</span>}
                      {pr < 0 && <span className="bdg der" style={{ fontSize: 9 }}>خسارة</span>}
                    </div>
                    <div style={{ textAlign: 'end' }}>
                      <span style={{ fontWeight: 700, color: pr >= 0 ? 'var(--ok)' : 'var(--er)' }}>{pr >= 0 ? '+' : ''}{fmtC(pr, t('egp'))}</span>
                      <span style={{ fontSize: 9, color: 'var(--m)', marginInlineStart: 4 }}>{margin}%</span>
                    </div>
                  </div>
                  <div className="pr"><div className={`pf ${pr >= 0 ? 'pf-ok' : 'pf-er'}`} style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </div>

          {/* Export section */}
          <div className="card">
            <div className="ct mb3">{ar ? 'تصدير التقارير' : 'Export Reports'}</div>
            {([
              ['projects', '🏗', exportProjects],
              ['expenses', '💸', exportExpenses],
              ['inventory','📦', exportInventory],
              ['capital',  '💰', exportCapital],
              ['workers',  '👷', exportWorkers],
            ] as [string, string, () => void][]).map(([k, ic, fn]) => (
              <div key={k} className="fl2 jb ic" style={{ padding: '8px 0', borderBottom: '1px solid var(--b)' }}>
                <div className="fl2 ic g2">
                  <span>{ic}</span>
                  <span style={{ fontSize: 12 }}>{t(`export${k.charAt(0).toUpperCase() + k.slice(1)}` as any)}</span>
                </div>
                <button className="btn bxl btn-xs" onClick={fn}>📊 Excel</button>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Income vs Expense chart */}
        {monthlyExpenses.length > 0 && (
          <div className="card mb4">
            <div className="ct mb3">{ar ? 'المصروفات الشهرية' : 'Monthly Expenses'}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '0 4px' }}>
              {monthlyExpenses.map(([month, amount]) => {
                const inc   = monthlyIncome[month] ?? 0
                const pct   = Math.round(amount / maxMonthly * 100)
                const incPct= Math.round(inc / maxMonthly * 100)
                return (
                  <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ fontSize: 9, color: 'var(--m)', whiteSpace: 'nowrap' }}>{fmtC(amount, '')}</div>
                    <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 90 }}>
                      <div style={{ flex: 1, background: 'var(--er)', opacity: .7, height: `${pct}%`, borderRadius: '3px 3px 0 0', minHeight: 2 }} title={`${ar?'مصروفات':'Expenses'}: ${fmtC(amount, t('egp'))}`} />
                      {inc > 0 && <div style={{ flex: 1, background: 'var(--ok)', opacity: .7, height: `${incPct}%`, borderRadius: '3px 3px 0 0', minHeight: 2 }} title={`${ar?'إيراد':'Income'}: ${fmtC(inc, t('egp'))}`} />}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--m)', whiteSpace: 'nowrap' }}>{month.substring(5)}</div>
                  </div>
                )
              })}
            </div>
            <div className="fl2 ic g3 mt2" style={{ fontSize: 10, color: 'var(--m)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'var(--er)', opacity: .7, display: 'inline-block', borderRadius: 2 }}/>{ar?'مصروفات':'Expenses'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'var(--ok)', opacity: .7, display: 'inline-block', borderRadius: 2 }}/>{ar?'إيرادات':'Income'}</span>
            </div>
          </div>
        )}

        {/* Detailed project table */}
        <div className="card">
          <div className="ct mb3">{ar ? 'تقرير تفصيلي للمشاريع' : 'Detailed Project Report'}</div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('projectPrice')}</th>
                  <th>{t('received')}</th>
                  <th>{ar ? 'مصروفات' : 'Expenses'}</th>
                  <th>{t('profit')}</th>
                  <th>{ar ? 'هامش' : 'Margin'}</th>
                  <th>{ar ? 'إنجاز' : 'Progress'}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {activeProjects.map(p => {
                  const pr     = getProjProfit(p)
                  const margin = p.received > 0 ? Math.round(pr / p.price * 100) : 0
                  const prg    = getProjProgress(p)
                  const lowMargin = margin < 15 && pr >= 0

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="fl2 ic g2">
                          <strong>{p.name}</strong>
                          {p.quickMode && <span className="bdg dwa" style={{ fontSize: 8 }}>⚡</span>}
                          {lowMargin && <span className="bdg dwa" style={{ fontSize: 8 }}>⚠</span>}
                          {pr < 0    && <span className="bdg der" style={{ fontSize: 8 }}>🔴</span>}
                        </div>
                        {p.client && <div style={{ fontSize: 10, color: 'var(--m)' }}>👤 {p.client}</div>}
                      </td>
                      <td>{fmtC(p.price, t('egp'))}</td>
                      <td style={{ color: 'var(--ok)' }}>{fmtC(p.received, t('egp'))}</td>
                      <td style={{ color: 'var(--er)' }}>{fmtC(getProjExp(p), t('egp'))}</td>
                      <td style={{ fontWeight: 700, color: pr >= 0 ? 'var(--ok)' : 'var(--er)' }}>{fmtC(pr, t('egp'))}</td>
                      <td style={{ color: lowMargin ? 'var(--wa)' : pr < 0 ? 'var(--er)' : 'var(--ok)', fontWeight: 700 }}>{margin}%</td>
                      <td>
                        <div className="fl2 ic g2">
                          <div className="pr" style={{ width: 60, height: 6 }}><div className="pf pf-ok" style={{ width: `${prg}%` }} /></div>
                          <span style={{ fontSize: 10 }}>{prg}%</span>
                        </div>
                      </td>
                      <td><span className={`bdg ${STATUS_BADGE[p.status] || 'dgy'}`}>{statusLabel[p.status] || p.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
