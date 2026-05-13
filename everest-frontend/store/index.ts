'use client'
import { create } from 'zustand'
import type { Locale } from '@/i18n/translations'
import { api, tokenStorage } from '@/services/api'
import {
  fromApiProject, fromApiMaterial, fromApiInventoryLog, fromApiCapitalEntry,
  fromApiExpense, fromApiWorker, fromApiWorkshop, fromApiUser, fromApiPayment,
  fromApiContractItem, toApiMaterial, STATUS_TO_API, PROGRESS_TO_API, EXP_CAT_TO_API,
} from '@/lib/mappers'
import type {
  ApiProject, ApiMaterial, ApiInventoryLog, ApiCapitalEntry,
  ApiExpense, ApiWorker, ApiWorkshop, ApiUser, ApiPayment,
} from '@/types/api'

// Re-export store types so existing imports from '@/store' still work
export type {
  CapitalTx, InventoryItem, InvLog, Payment, ProjectExpense,
  ProjectMaterial, ContractItem, Project, Expense, Worker, User, Toast,
} from '@/types/store'
import type {
  CapitalTx, InventoryItem, InvLog, Payment, ProjectExpense,
  ProjectMaterial, ContractItem, Project, Expense, Worker, User, Toast,
} from '@/types/store'

// ── HELPERS ───────────────────────────────────────────────────────────────────
let _nid = 9000
const uid = () => _nid++
const today = () => new Date().toISOString().split('T')[0]

// ── STORE INTERFACE ───────────────────────────────────────────────────────────
interface AppStore {
  locale: Locale
  setLocale: (l: Locale) => void

  // App lifecycle
  initialized:    boolean
  loading:        boolean
  sessionChecked: boolean   // true once restoreSession has finished (success or fail)

  // Data
  capital:   number
  capitalTx: CapitalTx[]
  inventory: InventoryItem[]
  invLog:    InvLog[]
  projects:  Project[]
  expenses:  Expense[]
  workers:   Worker[]
  users:     User[]

  // Toasts
  toasts:      Toast[]
  addToast:    (msg: string, type?: string) => void
  removeToast: (id: number) => void

  // Data fetching
  fetchAll:      () => Promise<void>
  fetchProjects: () => Promise<void>
  fetchInventory:() => Promise<void>
  fetchCapital:  () => Promise<void>
  fetchExpenses: () => Promise<void>
  fetchWorkers:  () => Promise<void>

  // Auth
  currentUser:    User | null
  login:          (email: string, password: string) => Promise<boolean>
  logout:         () => void
  restoreSession: () => Promise<void>
  updateProfile:  (name: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>

  // Capital
  addCapital: (amount: number, source: string, date: string) => Promise<void>

  // Inventory
  addInventoryItem:    (item: Omit<InventoryItem,'id'|'dateAdded'|'lastUpdated'>, purchase?: boolean) => Promise<void>
  updateInventoryItem: (id: number, patch: Partial<InventoryItem>) => Promise<void>
  deleteInventoryItem: (id: number) => Promise<void>
  increaseStock:       (id: number, qty: number, cost: number, notes: string, withCap: boolean) => Promise<void>
  decreaseStock:       (id: number, qty: number, reason: string, project: string, notes: string) => Promise<void>

  // Projects
  addProject:              (p: Omit<Project,'id'|'deleted'|'createdAt'|'payments'|'expenses'|'materials'|'workers'|'contractItems'|'contract'|'progressPct'> & { initialReceived?: number }) => Promise<void>
  updateProject:           (id: number, patch: Partial<Omit<Project,'id'|'deleted'|'payments'|'expenses'|'materials'|'workers'|'contractItems'|'contract'>>) => Promise<void>
  deleteProject:           (id: number) => Promise<void>
  addPaymentToProject:     (pid: number, amount: number, date: string, notes: string, method?: string) => Promise<void>
  addExpenseToProject:     (pid: number, cat: string, label: string, amount: number, date: string) => Promise<void>
  addMaterialFromInventory:(pid: number, matId: number, qty: number) => Promise<void>
  updateProjectProgress:   (pid: number, pct: number) => Promise<void>
  toggleContractItem:      (pid: number, cid: number) => Promise<void>
  addContractItem:         (pid: number, title: string) => Promise<void>
  addWorkerAssignment:     (pid: number, workerId: number, amount: number, date: string, notes: string) => Promise<void>
  uploadContract:          (pid: number, file: File) => Promise<void>

  // Expenses
  addExpense:    (e: Omit<Expense,'id'>) => Promise<void>
  updateExpense: (id: number, patch: Partial<Omit<Expense,'id'>>) => Promise<void>
  deleteExpense: (id: number) => Promise<void>

  // Workers
  addWorker:    (w: Omit<Worker,'id'>) => Promise<void>
  updateWorker: (id: number, patch: Partial<Omit<Worker,'id'>>) => Promise<void>
  deleteWorker: (id: number) => Promise<void>

  // Users
  addUser: (u: Omit<User,'id'>) => Promise<void>
}

// ── STORE IMPLEMENTATION ──────────────────────────────────────────────────────
export const useAppStore = create<AppStore>((set, get) => ({
  locale:      'ar',
  setLocale:   (locale) => set({ locale }),
  initialized:    false,
  loading:        false,
  sessionChecked: false,

  capital:   0,
  capitalTx: [],
  inventory: [],
  invLog:    [],
  projects:  [],
  expenses:  [],
  workers:   [],
  users:     [],

  // ── Toasts ─────────────────────────────────────────────────────────────────
  toasts: [],
  addToast: (msg, type = 'tok') => {
    const id = uid()
    set(s => ({ toasts: [...s.toasts, { id, msg, type }] }))
    setTimeout(() => get().removeToast(id), 3500)
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ── Auth ───────────────────────────────────────────────────────────────────
  currentUser: null,

  login: async (email, password) => {
    try {
      const res = await api.post<{ accessToken: string; user: ApiUser }>(
        '/auth/login',
        { email, password },
      )
      tokenStorage.set(res.accessToken)
      set({ currentUser: fromApiUser(res.user) })
      await get().fetchAll()
      return true
    } catch {
      return false
    }
  },

  logout: () => {
    tokenStorage.clear()
    set({
      currentUser: null, initialized: false, sessionChecked: false,
      capital: 0, capitalTx: [], inventory: [], invLog: [],
      projects: [], expenses: [], workers: [], users: [],
    })
  },

  restoreSession: async () => {
    if (!tokenStorage.get()) { set({ sessionChecked: true }); return }
    try {
      const res = await api.get<ApiUser & { role: ApiUser['role'] }>('/auth/me')
      set({ currentUser: fromApiUser(res) })
      await get().fetchAll()
    } catch {
      tokenStorage.clear()
    } finally {
      set({ sessionChecked: true })
    }
  },

  updateProfile: async (name) => {
    const res = await api.patch<ApiUser>('/auth/me', { name })
    set(s => ({ currentUser: s.currentUser ? { ...s.currentUser, name: res.name } : null }))
  },

  changePassword: async (currentPassword, newPassword) => {
    await api.patch('/auth/me/password', { currentPassword, newPassword })
  },

  // ── Data fetching ──────────────────────────────────────────────────────────
  fetchAll: async () => {
    set({ loading: true })
    try {
      await Promise.all([
        get().fetchProjects(),
        get().fetchInventory(),
        get().fetchCapital(),
        get().fetchExpenses(),
        get().fetchWorkers(),
      ])
      set({ initialized: true })
    } finally {
      set({ loading: false })
    }
  },

  fetchProjects: async () => {
    const res = await api.get<ApiProject[]>('/projects')
    set({ projects: res.map(fromApiProject) })
  },

  fetchInventory: async () => {
    const [materials, logs] = await Promise.all([
      api.get<ApiMaterial[]>('/inventory'),
      api.get<ApiInventoryLog[]>('/inventory/logs'),
    ])
    set({
      inventory: materials.map(fromApiMaterial),
      invLog:    logs.map(fromApiInventoryLog),
    })
  },

  fetchCapital: async () => {
    const res = await api.get<{ balance: number; entries: ApiCapitalEntry[] }>('/capital')
    set({
      capital:   res.balance,
      capitalTx: res.entries.map(fromApiCapitalEntry),
    })
  },

  fetchExpenses: async () => {
    const res = await api.get<ApiExpense[]>('/expenses')
    set({ expenses: res.map(fromApiExpense) })
  },

  fetchWorkers: async () => {
    const res = await api.get<{ workers: ApiWorker[]; workshops: ApiWorkshop[] }>('/workers')
    set({
      workers: [
        ...res.workers.map(fromApiWorker),
        ...res.workshops.map(fromApiWorkshop),
      ],
    })
  },

  // ── Capital ────────────────────────────────────────────────────────────────
  addCapital: async (amount, source, date) => {
    await api.post('/capital', { amount, type: 'deposit', note: source, date })
    await get().fetchCapital()
  },

  // ── Inventory ──────────────────────────────────────────────────────────────
  addInventoryItem: async (item, purchase = false) => {
    const body = toApiMaterial(item)
    await api.post(`/inventory${purchase ? '?purchase=true' : ''}`, body)
    await get().fetchInventory()
    if (purchase) await get().fetchCapital()
  },

  updateInventoryItem: async (id, patch) => {
    const current = get().inventory.find(m => m.id === id)
    if (!current) return
    const merged = { ...current, ...patch }
    await api.put(`/inventory/${id}`, toApiMaterial(merged))
    set(s => ({
      inventory: s.inventory.map(m => m.id === id ? { ...m, ...patch } : m),
    }))
  },

  deleteInventoryItem: async (id) => {
    await api.delete(`/inventory/${id}`)
    set(s => ({ inventory: s.inventory.filter(m => m.id !== id) }))
    await get().fetchInventory() // refresh logs too
  },

  increaseStock: async (id, qty, cost, notes, withCap) => {
    await api.post(`/inventory/${id}/increase`, { qty, cost, notes, withCapital: withCap })
    await get().fetchInventory()
    if (withCap) await get().fetchCapital()
  },

  decreaseStock: async (id, qty, _reason, projectName, notes) => {
    const proj = get().projects.find(p => p.name === projectName)
    await api.post(`/inventory/${id}/decrease`, {
      qty,
      projectId: proj?.id ?? null,
      notes,
    })
    await get().fetchInventory()
  },

  // ── Projects ───────────────────────────────────────────────────────────────
  addProject: async (p) => {
    const body = {
      name:          p.name,
      clientName:    p.client,
      clientAddress: p.address || null,
      totalValue:    p.price,
      firstPayment:  p.initialReceived ?? 0,
      status:        STATUS_TO_API[p.status ?? 'newStatus'] ?? 'pending',
      progressMode:  PROGRESS_TO_API[p.progressMode ?? 'pct'] ?? 'percentage',
      progressPct:   0,
      needsDetails:  p.quickMode ?? false,
      notes:         p.notes || null,
    }
    const res = await api.post<ApiProject>('/projects', body)
    const project = fromApiProject({ ...res, payments: [], expenses: [], contractItems: [] })
    set(s => ({ projects: [...s.projects, project] }))
    if (p.initialReceived && p.initialReceived > 0) await get().fetchCapital()
  },

  deleteProject: async (id) => {
    await api.delete(`/projects/${id}`)
    set(s => ({
      projects: s.projects.map(p => p.id === id ? { ...p, deleted: true } : p),
    }))
  },

  addPaymentToProject: async (pid, amount, date, notes, method = 'cash') => {
    const res = await api.post<ApiPayment>('/payments', {
      projectId: pid, amount, date, notes, method,
    })
    set(s => ({
      projects: s.projects.map(p =>
        p.id === pid
          ? { ...p, received: p.received + amount, payments: [...p.payments, fromApiPayment(res)] }
          : p,
      ),
    }))
    await get().fetchCapital()
  },

  addExpenseToProject: async (pid, cat, label, amount, date) => {
    await api.post('/expenses', {
      title:     label,
      amount,
      category:  EXP_CAT_TO_API[cat] ?? 'other',
      date,
      projectId: pid,
    })
    set(s => ({
      projects: s.projects.map(p =>
        p.id === pid
          ? { ...p, expenses: { ...p.expenses, breakdown: [...p.expenses.breakdown, { id: uid(), cat, label, amount, date }] } }
          : p,
      ),
    }))
    await get().fetchCapital()
  },

  addMaterialFromInventory: async (pid, matId, qty) => {
    const mat  = get().inventory.find(m => m.id === matId)
    const proj = get().projects.find(p => p.id === pid)
    if (!mat || !proj || mat.qty < qty) return
    await api.post(`/inventory/${matId}/decrease`, { qty, projectId: pid, notes: '' })
    const total = qty * mat.cost
    set(s => ({
      inventory: s.inventory.map(m => m.id === matId ? { ...m, qty: m.qty - qty } : m),
      projects:  s.projects.map(p =>
        p.id === pid
          ? {
              ...p,
              materials: [...p.materials, { id: uid(), source: 'inventory' as const, key: mat.name, name: mat.name, qty, unit: mat.unit, cost: mat.cost, total, date: today() }],
              expenses:  { ...p.expenses, quickTotal: p.expenses.quickTotal + total },
            }
          : p,
      ),
    }))
    await get().fetchCapital()
  },

  updateProjectProgress: async (pid, pct) => {
    await api.patch(`/projects/${pid}/progress`, { progressPct: pct })
    set(s => ({
      projects: s.projects.map(p => p.id === pid ? { ...p, progressPct: pct } : p),
    }))
  },

  toggleContractItem: async (pid, cid) => {
    const proj = get().projects.find(p => p.id === pid)
    const item = proj?.contractItems.find(c => c.id === cid)
    if (!item) return
    await api.patch(`/projects/${pid}/contract-items/${cid}`, { isDone: !item.done })
    set(s => ({
      projects: s.projects.map(p =>
        p.id === pid
          ? { ...p, contractItems: p.contractItems.map(c => c.id === cid ? { ...c, done: !c.done } : c) }
          : p,
      ),
    }))
  },

  addContractItem: async (pid, title) => {
    const res = await api.post<{ id: number; title: string; isDone: boolean }>(`/projects/${pid}/contract-items`, { title, order: 0 })
    set(s => ({
      projects: s.projects.map(p =>
        p.id === pid
          ? { ...p, contractItems: [...p.contractItems, { id: res.id, title: res.title, done: res.isDone }] }
          : p,
      ),
    }))
  },

  updateProject: async (id, patch) => {
    const apiBody: Record<string, unknown> = {}
    if (patch.name          !== undefined) apiBody.name          = patch.name
    if (patch.client        !== undefined) apiBody.clientName    = patch.client
    if (patch.address       !== undefined) apiBody.clientAddress = patch.address
    if (patch.phone         !== undefined) apiBody.clientPhone   = patch.phone
    if (patch.price         !== undefined) apiBody.totalValue    = patch.price
    if (patch.status        !== undefined) apiBody.status        = STATUS_TO_API[patch.status] ?? 'pending'
    if (patch.notes         !== undefined) apiBody.notes         = patch.notes
    if (patch.startDate     !== undefined) apiBody.startDate     = patch.startDate || null
    if (patch.endDate       !== undefined) apiBody.endDate       = patch.endDate || null
    if (patch.progressMode  !== undefined) apiBody.progressMode  = PROGRESS_TO_API[patch.progressMode] ?? 'percentage'
    await api.put(`/projects/${id}`, apiBody)
    set(s => ({
      projects: s.projects.map(p => p.id === id ? { ...p, ...patch } : p),
    }))
  },

  addWorkerAssignment: async (pid, workerId, amount, date, notes) => {
    const worker = get().workers.find(w => w.id === workerId)
    await api.post('/workers/assignments', { workerId, projectId: pid, amount, date, notes, status: 'pending' })
    set(s => ({
      projects: s.projects.map(p =>
        p.id === pid
          ? { ...p, workers: [...p.workers, { id: workerId, name: worker?.name ?? '', amount, date, status: 'pending' }] }
          : p,
      ),
    }))
  },

  uploadContract: async (pid, file) => {
    const { uploadContractFile } = await import('@/lib/supabase-storage')
    const { url } = await uploadContractFile(file, pid)

    await api.post(`/projects/${pid}/contract`, {
      fileUrl:  url,
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      fileType: file.type,
    })

    set(s => ({
      projects: s.projects.map(p =>
        p.id === pid
          ? { ...p, contract: { name: file.name, type: file.type, size: `${(file.size / 1024).toFixed(1)} KB`, uploadDate: new Date().toISOString().split('T')[0] } }
          : p,
      ),
    }))
  },

  // ── Expenses ───────────────────────────────────────────────────────────────
  addExpense: async (e) => {
    const proj = get().projects.find(p => p.name === e.project)
    const res  = await api.post<ApiExpense>('/expenses', {
      title:     e.title,
      amount:    e.amount,
      category:  EXP_CAT_TO_API[e.category] ?? 'other',
      date:      e.date,
      paidTo:    e.paidTo || null,
      notes:     e.notes || null,
      projectId: proj?.id ?? null,
    })
    set(s => ({ expenses: [fromApiExpense(res), ...s.expenses] }))
    await get().fetchCapital()
  },

  updateExpense: async (id, patch) => {
    const res = await api.put<ApiExpense>(`/expenses/${id}`, {
      ...patch,
      category: patch.category ? (EXP_CAT_TO_API[patch.category] ?? 'other') : undefined,
    })
    set(s => ({ expenses: s.expenses.map(e => e.id === id ? fromApiExpense(res) : e) }))
  },

  deleteExpense: async (id) => {
    await api.delete(`/expenses/${id}`)
    set(s => ({ expenses: s.expenses.filter(e => e.id !== id) }))
    await get().fetchCapital()
  },

  // ── Workers ────────────────────────────────────────────────────────────────
  addWorker: async (w) => {
    const body = { workerType: w.type, ...( w.type === 'workshop'
      ? { name: w.name, phone: w.phone, contact: w.contact, location: w.address, status: w.status }
      : { name: w.name, phone: w.phone, role: w.role ?? 'other', status: w.status, color: w.color, avatar: w.avatar, dailyRate: w.dailyRate ?? null }
    )}
    await api.post('/workers', body)
    await get().fetchWorkers()
  },

  updateWorker: async (id, patch) => {
    const current = get().workers.find(w => w.id === id)
    if (!current) return
    const isWorkshop = current.type === 'workshop'
    const body = { workerType: current.type, ...(isWorkshop
      ? { name: patch.name ?? current.name, phone: patch.phone ?? current.phone, contact: patch.contact ?? current.contact, location: patch.address ?? current.address, status: patch.status ?? current.status }
      : { name: patch.name ?? current.name, phone: patch.phone ?? current.phone, role: patch.role ?? current.role ?? 'other', status: patch.status ?? current.status, dailyRate: patch.dailyRate ?? current.dailyRate ?? null }
    )}
    await api.put(`/workers/${id}`, body)
    set(s => ({ workers: s.workers.map(w => w.id === id ? { ...w, ...patch } : w) }))
  },

  deleteWorker: async (id) => {
    const w = get().workers.find(x => x.id === id)
    await api.delete(`/workers/${id}?type=${w?.type === 'workshop' ? 'workshop' : 'worker'}`)
    set(s => ({ workers: s.workers.filter(w => w.id !== id) }))
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  addUser: async (u) => {
    // Users are created via /auth/register (protected endpoint)
    // roleId 1 = owner by default; caller should pass correct roleId
    await api.post('/auth/register', {
      name: u.name, email: u.email, password: 'changeme123', roleId: 1,
      avatar: u.avatar, color: u.color,
    })
  },
}))

// ── HELPERS (re-exported for pages that import from '@/store') ────────────────
export const fmt  = (n: number) => Number(Math.round(n)).toLocaleString()
export const fmtC = (n: number, egp = 'ج.م') => `${fmt(n)} ${egp}`
export const isLow = (m: InventoryItem) => m.qty <= m.lowAt
export const isMid = (m: InventoryItem) => m.qty <= m.lowAt * 2 && !isLow(m)
export const lvl   = (m: InventoryItem) => isLow(m) ? 'low' : isMid(m) ? 'mid' : 'ok3'
export const sColor= (m: InventoryItem) => isLow(m) ? 'var(--er)' : isMid(m) ? 'var(--wa)' : 'var(--ok)'
export const sPct  = (m: InventoryItem) => Math.min(100, Math.round(m.qty / Math.max(m.qty, m.lowAt * 3, 1) * 100))
export const invTotal = (inv: InventoryItem[]) => inv.reduce((s, m) => s + m.qty * m.cost, 0)
export const getProjExp = (p: Project) =>
  p.expenses.breakdown.length > 0
    ? p.expenses.breakdown.reduce((s, e) => s + e.amount, 0)
    : p.expenses.quickTotal || 0
export const getProjProfit   = (p: Project) => p.received - getProjExp(p)
export const getProjProgress = (p: Project) => {
  if (p.progressMode === 'items' && p.contractItems.length > 0)
    return Math.round(p.contractItems.filter(i => i.done).length / p.contractItems.length * 100)
  return p.progressPct || 0
}

export const STATUS_BADGE: Record<string, string> = {
  inProgress:'dwa', completed:'dok', delayed:'der', newStatus:'dnv',
  cancelled:'dgy', paid:'dok', pending:'dwa', active:'dok', inactive:'dgy',
}
export const CATS      = ['catWood','catMetal','catPaint','catGlass','catFabric','catAccess','catOther']
export const UNITS     = ['unitSheet','unitMeter','unitKg','unitPiece','unitLiter','unitSqM','unitBox','unitRoll']
export const CAT_ICONS: Record<string,string> = {
  catWood:'🪵',catMetal:'🔩',catPaint:'🎨',catGlass:'🪟',catFabric:'🧵',catAccess:'🔧',catOther:'📦',
}
