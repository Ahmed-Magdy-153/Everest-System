// Store-layer TypeScript interfaces — the shape of data inside the Zustand store.
// Kept separate from types/api.ts (backend shapes) to avoid circular imports.
// lib/mappers.ts converts between these two type worlds.

export interface CapitalTx {
  id: number; type: 'income'|'expense'|'purchase'|'transfer'|'deposit'|'withdrawal'
  amount: number; reason: string; date: string; project: string; by: string
}

export interface InventoryItem {
  id: number; name: string; cat: string; qty: number; unit: string
  cost: number; supplier: string; notes: string; dateAdded: string
  lastUpdated: string; lowAt: number
}

export interface InvLog {
  id: number; matId: number; matName: string; action: string
  qBefore: number; qAfter: number; cost: number; total: number
  date: string; by: string; project: string; notes: string
}

export interface Payment { id: number; amount: number; date: string; notes: string; method?: string }

export interface ProjectExpense {
  id: number; cat: string; label: string; amount: number; date: string
}

export interface ProjectMaterial {
  id: number; source: 'inventory'|'external'
  key?: string; name?: string; qty: number; unit?: string
  cost: number; total: number; date: string
}

export interface ContractItem { id: number; title: string; done: boolean }

export interface ProjectWorker {
  id: number; name: string; amount: number; date: string; status: string
  assignmentId?: number
}

export interface Project {
  id: number; name: string; client: string; address: string
  phone?: string        // clientPhone
  price: number; received: number; status: string; quickMode: boolean
  startDate?: string    // ISO date string
  endDate?: string      // ISO date string
  payments: Payment[]
  expenses: { quickTotal: number; breakdown: ProjectExpense[] }
  materials: ProjectMaterial[]
  workers: ProjectWorker[]
  progressMode: 'pct'|'items'; progressPct: number
  contractItems: ContractItem[]; notes: string
  contract: { name: string; type: string; size: string; uploadDate: string } | null
  deleted: boolean; createdAt: string
}

export interface Expense {
  id: number; title: string; category: string; amount: number
  date: string; project: string; paidTo: string; notes: string
}

export interface Worker {
  id: number; name: string; type: 'worker'|'workshop'
  phone: string; role?: string; contact?: string; address?: string
  status: string; color: string; avatar: string; amount?: number
  dailyRate?: number
}

export interface User {
  id: number; name: string; role: string; email: string
  status: string; avatar: string; color: string
  permissions: Record<string, boolean>
}

export interface Toast { id: number; msg: string; type: string }
