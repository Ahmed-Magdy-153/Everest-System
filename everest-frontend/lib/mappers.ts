/**
 * Bidirectional mappers between API types (backend schema) and store types (UI).
 *
 * EVERY field name and enum value mismatch between the two sides is handled here.
 * When the backend is live, replace mock store data with API calls and run
 * the relevant fromApi* mapper on the response before storing it.
 *
 * Mismatch summary:
 *  Project:       client→clientName, address→clientAddress, price→totalValue,
 *                 deleted:bool→deletedAt:DateTime, quickMode→needsDetails,
 *                 progressMode 'pct'/'items'→'percentage'/'contract_items',
 *                 status 'inProgress'→'in_progress', 'newStatus'→'pending', 'delayed'→'on_hold'
 *  CapitalTx:     reason→note, project(string)→projectId+projectName, by→recordedBy
 *  InventoryItem: cat→type, qty→quantity, cost→costPerUnit, lowAt→lowStockThreshold
 *  InvLog:        matId→materialId, qBefore→quantityBefore, qAfter→quantityAfter,
 *                 cost→costPerUnit, total→totalCost, by→performedBy,
 *                 action prefix 'log*' removed (e.g. 'logPurchase'→'purchase')
 *  Payment:       no method in store → default 'cash'
 *  ContractItem:  done→isDone (missing order field, defaulted)
 *  Worker:        type 'workshop' → separate ApiWorkshop model; amount field is assignment-level
 *  Expense:       cat→category, label→title, project(string)→projectId
 *  User:          role(string)+permissions on user → roleId FK + permissions on Role
 */

import type {
  ApiProject, ApiPayment, ApiExpense, ApiMaterial, ApiInventoryLog,
  ApiCapitalEntry, ApiContractItem, ApiContract, ApiWorker, ApiWorkshop,
  ApiWorkerAssignment, ApiMaterialUsage, ApiUser, ApiRole,
  ProjectStatus, ProgressMode, InventoryAction, ExpenseCategory,
  MaterialType, MaterialUnit, MaterialSource, ActivityStatus, AssignmentStatus,
  CapitalEntryType,
} from '@/types/api'

import type {
  Project, Payment, Expense, InventoryItem, InvLog, CapitalTx,
  ContractItem, Worker, User,
} from '@/types/store'

// ─── ENUM MAPS ────────────────────────────────────────────────────────────────

// Project status — exported so store/index.ts can use them when calling the API
export const STATUS_TO_API: Record<string, ProjectStatus> = {
  inProgress: 'in_progress',
  completed:  'completed',
  delayed:    'on_hold',
  newStatus:  'pending',
  cancelled:  'cancelled',
  on_hold:    'on_hold',
}
const STATUS_FROM_API: Record<ProjectStatus, string> = {
  in_progress: 'inProgress',
  completed:   'completed',
  on_hold:     'delayed',
  pending:     'newStatus',
  cancelled:   'cancelled',
}

// Progress mode — exported for store use
export const PROGRESS_TO_API: Record<string, ProgressMode> = {
  pct:   'percentage',
  items: 'contract_items',
}
const PROGRESS_FROM_API: Record<ProgressMode, 'pct' | 'items'> = {
  percentage:      'pct',
  contract_items:  'items',
}

// Inventory action: strip 'log' prefix, convert camelCase to snake_case
const ACTION_TO_API: Record<string, InventoryAction> = {
  logPurchase:       'purchase',
  logAdded:          'added',
  logIncreased:      'increased',
  logDecreased:      'decreased',
  logSentToProject:  'sent_to_project',
  logAdjust:         'adjusted',
  logDeleted:        'deleted',
  logEdited:         'edited',
}
const ACTION_FROM_API: Record<InventoryAction, string> = {
  purchase:         'logPurchase',
  added:            'logAdded',
  increased:        'logIncreased',
  decreased:        'logDecreased',
  sent_to_project:  'logSentToProject',
  adjusted:         'logAdjust',
  deleted:          'logDeleted',
  edited:           'logEdited',
}

// Inventory category (frontend 'catWood' → backend uses specific types, not categories)
// The backend MaterialType is per-item specific; the frontend uses broad display categories.
// Mapping is one-to-many so we map the other direction: API type → display category.
const MATERIAL_TYPE_TO_CAT: Record<MaterialType, string> = {
  plywood:        'catWood',
  kabs:           'catWood',
  glue:           'catOther',
  qashat:         'catWood',
  atab:           'catWood',
  wood_structure: 'catWood',
  metals:         'catMetal',
  finish:         'catPaint',
  labor:          'catOther',
  paints:         'catPaint',
  glass:          'catGlass',
  upholstery:     'catFabric',
  fabrics:        'catFabric',
  accessories:    'catAccess',
  miscellaneous:  'catOther',
  other:          'catOther',
}

// Inventory unit
const UNIT_TO_API: Record<string, MaterialUnit> = {
  unitSheet:  'sheet',
  unitMeter:  'meter',
  unitKg:     'kg',
  unitPiece:  'piece',
  unitLiter:  'liter',
  unitSqM:    'sqm',
  unitBox:    'box',
  unitRoll:   'roll',
}
const UNIT_FROM_API: Record<MaterialUnit, string> = {
  sheet:  'unitSheet',
  meter:  'unitMeter',
  kg:     'unitKg',
  piece:  'unitPiece',
  liter:  'unitLiter',
  sqm:    'unitSqM',
  box:    'unitBox',
  roll:   'unitRoll',
}

// Expense category — exported for store use
export const EXP_CAT_TO_API: Record<string, ExpenseCategory> = {
  workers:        'labor',
  workshop:       'workshop',
  transportation: 'transportation',
  monthly:        'monthly',
  materials:      'materials',
  utilities:      'utilities',
  other:          'other',
}
const EXP_CAT_FROM_API: Record<ExpenseCategory, string> = {
  labor:          'workers',
  workshop:       'workshop',
  transportation: 'transportation',
  monthly:        'monthly',
  materials:      'materials',
  utilities:      'utilities',
  other:          'other',
}

// Capital entry type
const CAP_TYPE_TO_API: Record<string, CapitalEntryType> = {
  income:   'income',
  expense:  'expense',
  purchase: 'purchase',
  transfer: 'transfer',
  // store has no deposit / withdrawal — map unknown to transfer
}

// ─── PROJECT ──────────────────────────────────────────────────────────────────

export function fromApiProject(p: ApiProject): Project {
  const totalReceived = p.totalReceived
    ? parseFloat(p.totalReceived)
    : (p.payments ?? []).reduce((s, pay) => s + parseFloat(pay.amount), 0)

  return {
    id:           p.id,
    name:         p.name,
    client:       p.clientName,
    address:      p.clientAddress ?? '',
    phone:        p.clientPhone ?? '',
    price:        parseFloat(p.totalValue),
    received:     totalReceived,
    status:       STATUS_FROM_API[p.status] ?? p.status,
    quickMode:    p.needsDetails,
    progressMode: PROGRESS_FROM_API[p.progressMode],
    progressPct:  p.progressPct,
    notes:        p.notes ?? '',
    startDate:    p.startDate ?? '',
    endDate:      p.endDate ?? '',
    deleted:      p.deletedAt !== null,
    createdAt:    p.createdAt.split('T')[0],

    payments: (p.payments ?? []).map(fromApiPayment),

    expenses: {
      quickTotal: 0,
      breakdown:  (p.expenses ?? []).map(e => ({
        id:     e.id,
        cat:    EXP_CAT_FROM_API[e.category] ?? e.category,
        label:  e.title,
        amount: parseFloat(e.amount),
        date:   e.date,
      })),
    },

    materials: (p.materialUsages ?? []).map(u => ({
      id:     u.id,
      source: u.source === 'from_stock' ? 'inventory' : 'external',
      key:    u.material?.name,
      name:   u.material?.name,
      qty:    parseFloat(u.quantityUsed),
      unit:   u.material ? UNIT_FROM_API[u.material.unit as MaterialUnit] : '',
      cost:   u.material ? parseFloat(u.material.costPerUnit) : parseFloat(u.externalCost ?? '0'),
      total:  parseFloat(u.quantityUsed) * (u.material ? parseFloat(u.material.costPerUnit) : parseFloat(u.externalCost ?? '0')),
      date:   u.date,
    })),

    workers: (p.workerAssignments ?? []).map(a => ({
      id:     a.workerId,
      name:   a.worker?.name ?? '',
      amount: parseFloat(a.amount),
      date:   a.date,
      status: a.status,
    })),

    contractItems: (p.contractItems ?? []).map(fromApiContractItem),

    contract: p.contract
      ? { name: p.contract.fileName ?? '', type: p.contract.fileType ?? '', size: p.contract.fileSize ?? '', uploadDate: p.contract.createdAt.split('T')[0] }
      : null,
  }
}

export function toApiProject(p: Partial<Project> & { name: string; clientName?: string; totalValue?: number }) {
  return {
    name:          p.name,
    clientName:    p.clientName ?? p.client ?? '',
    clientAddress: p.address ?? null,
    totalValue:    String(p.totalValue ?? p.price ?? 0),
    firstPayment:  String(p.received ?? 0),
    status:        STATUS_TO_API[p.status ?? 'newStatus'],
    progressMode:  PROGRESS_TO_API[p.progressMode ?? 'pct'],
    progressPct:   p.progressPct ?? 0,
    needsDetails:  p.quickMode ?? false,
    notes:         p.notes ?? null,
  }
}

// ─── PAYMENT ──────────────────────────────────────────────────────────────────

export function fromApiPayment(p: ApiPayment): Payment {
  return {
    id:     p.id,
    amount: parseFloat(p.amount),
    date:   p.date,
    notes:  p.notes ?? '',
  }
}

export function toApiPayment(p: Payment, projectId: number) {
  return {
    projectId,
    amount: String(p.amount),
    date:   p.date,
    method: 'cash' as const,
    notes:  p.notes || null,
  }
}

// ─── EXPENSE ─────────────────────────────────────────────────────────────────

export function fromApiExpense(e: ApiExpense): Expense {
  return {
    id:       e.id,
    title:    e.title,
    amount:   parseFloat(e.amount),
    category: EXP_CAT_FROM_API[e.category] ?? e.category,
    date:     e.date,
    project:  '',   // projectId is the FK; name must be resolved by the caller
    paidTo:   e.paidTo ?? '',
    notes:    e.notes ?? '',
  }
}

export function toApiExpense(e: Omit<Expense, 'id'>, projectId?: number) {
  return {
    title:     e.title,
    amount:    String(e.amount),
    category:  EXP_CAT_TO_API[e.category] ?? 'other',
    date:      e.date,
    paidTo:    e.paidTo || null,
    notes:     e.notes || null,
    projectId: projectId ?? null,
  }
}

// ─── INVENTORY ITEM ───────────────────────────────────────────────────────────

export function fromApiMaterial(m: ApiMaterial): InventoryItem {
  return {
    id:          m.id,
    name:        m.name,
    cat:         MATERIAL_TYPE_TO_CAT[m.type],
    qty:         parseFloat(m.quantity),
    unit:        UNIT_FROM_API[m.unit],
    cost:        parseFloat(m.costPerUnit),
    supplier:    m.supplier ?? '',
    notes:       m.notes ?? '',
    dateAdded:   m.createdAt.split('T')[0],
    lastUpdated: m.updatedAt.split('T')[0],
    lowAt:       parseFloat(m.lowStockThreshold),
  }
}

export function toApiMaterial(m: Omit<InventoryItem, 'id' | 'dateAdded' | 'lastUpdated'>) {
  return {
    name:              m.name,
    type:              'other' as MaterialType,
    quantity:          m.qty,         // number — Zod requires number, not string
    unit:              UNIT_TO_API[m.unit] ?? 'piece',
    costPerUnit:       m.cost,        // number
    lowStockThreshold: m.lowAt,       // number
    supplier:          m.supplier || null,
    notes:             m.notes || null,
  }
}

// ─── INVENTORY LOG ────────────────────────────────────────────────────────────

export function fromApiInventoryLog(l: ApiInventoryLog): InvLog {
  return {
    id:      l.id,
    matId:   l.materialId,
    matName: l.material?.name ?? '',
    action:  ACTION_FROM_API[l.action] ?? l.action,
    qBefore: parseFloat(l.quantityBefore),
    qAfter:  parseFloat(l.quantityAfter),
    cost:    l.costPerUnit ? parseFloat(l.costPerUnit) : 0,
    total:   l.totalCost ? parseFloat(l.totalCost) : 0,
    date:    l.date,
    by:      l.performedBy?.name ?? '',
    project: l.projectName ?? '',
    notes:   l.notes ?? '',
  }
}

export function toApiInventoryLog(l: Omit<InvLog, 'id'>, materialId: number, projectId?: number) {
  return {
    materialId,
    action:         ACTION_TO_API[l.action] ?? 'adjusted',
    quantityBefore: String(l.qBefore),
    quantityAfter:  String(l.qAfter),
    costPerUnit:    l.cost ? String(l.cost) : null,
    totalCost:      l.total ? String(l.total) : null,
    projectId:      projectId ?? null,
    projectName:    l.project || null,
    notes:          l.notes || null,
    date:           l.date,
  }
}

// ─── CAPITAL ENTRY ────────────────────────────────────────────────────────────

export function fromApiCapitalEntry(c: ApiCapitalEntry): CapitalTx {
  return {
    id:      c.id,
    type:    c.type as CapitalTx['type'],
    amount:  parseFloat(c.amount),
    reason:  c.note ?? '',
    date:    c.date,
    project: c.project?.name ?? '',
    by:      c.recordedBy?.name ?? '',
  }
}

export function toApiCapitalEntry(c: Omit<CapitalTx, 'id'>, projectId?: number) {
  return {
    amount:    String(c.amount),
    type:      CAP_TYPE_TO_API[c.type] ?? 'transfer',
    note:      c.reason || null,
    date:      c.date,
    projectId: projectId ?? null,
  }
}

// ─── CONTRACT ITEM ────────────────────────────────────────────────────────────

export function fromApiContractItem(c: ApiContractItem): ContractItem {
  return {
    id:    c.id,
    title: c.title,
    done:  c.isDone,
  }
}

export function toApiContractItem(c: Omit<ContractItem, 'id'>, projectId: number, order: number) {
  return {
    projectId,
    title:  c.title,
    isDone: c.done,
    order,
  }
}

// ─── WORKER ───────────────────────────────────────────────────────────────────

// Workers and Workshops are separate backend models.
// The frontend merges them into one Worker type with type:'worker'|'workshop'.

export function fromApiWorker(w: ApiWorker): Worker {
  return {
    id:     w.id,
    name:   w.name,
    type:   'worker',
    phone:  w.phone ?? '',
    role:   w.role,
    status: w.status,
    color:  w.color ?? '#1A2744',
    avatar: w.avatar ?? w.name.charAt(0),
  }
}

export function fromApiWorkshop(w: ApiWorkshop): Worker {
  return {
    id:      w.id,
    name:    w.name,
    type:    'workshop',
    phone:   w.phone ?? '',
    contact: w.contact ?? '',
    address: w.location ?? '',
    status:  w.status,
    color:   '#6C3FC0',
    avatar:  w.name.charAt(0),
  }
}

export function toApiWorker(w: Omit<Worker, 'id'>): object {
  if (w.type === 'workshop') {
    return {
      name:     w.name,
      phone:    w.phone || null,
      contact:  w.contact || null,
      location: w.address || null,
      status:   (w.status as ActivityStatus) ?? 'active',
      notes:    null,
    }
  }
  return {
    name:      w.name,
    phone:     w.phone || null,
    role:      w.role ?? 'other',
    dailyRate: null,
    status:    (w.status as ActivityStatus) ?? 'active',
    color:     w.color || null,
    avatar:    w.avatar || null,
    notes:     null,
  }
}

// ─── USER ─────────────────────────────────────────────────────────────────────

// The backend puts permissions on the Role, not the User.
// fromApiUser merges role.permissions onto the User so the store stays unchanged.

export function fromApiUser(u: ApiUser): User {
  return {
    id:          u.id,
    name:        u.name,
    email:       u.email,
    role:        u.role.name,
    status:      u.status,
    avatar:      u.avatar ?? u.name.charAt(0),
    color:       u.color ?? '#1A2744',
    permissions: (u.role.permissions as Record<string, boolean>) ?? {},
  }
}
