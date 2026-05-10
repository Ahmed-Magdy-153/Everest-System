/**
 * API contract types — exact TypeScript mirror of the backend Prisma schema.
 *
 * Rules:
 *  - Decimal fields come as strings in JSON (Prisma serialises them that way).
 *  - DateTime fields come as ISO-8601 strings.
 *  - Nullable fields are typed  T | null.
 *  - Optional included relations are typed  T | undefined.
 *
 * These types are ONLY used at the API boundary (fetch / axios response shapes).
 * Use the store types for all UI logic; use the mappers in lib/mappers.ts to convert.
 */

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export type ProjectStatus     = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
export type ProgressMode      = 'percentage' | 'contract_items'
export type MaterialType      = 'plywood' | 'kabs' | 'glue' | 'qashat' | 'atab' | 'wood_structure' | 'metals' | 'finish' | 'labor' | 'paints' | 'glass' | 'upholstery' | 'fabrics' | 'accessories' | 'miscellaneous' | 'other'
export type MaterialUnit      = 'meter' | 'piece' | 'kg' | 'liter' | 'sqm' | 'sheet' | 'roll' | 'box'
export type MaterialSource    = 'from_stock' | 'external_purchase'
export type InventoryAction   = 'purchase' | 'added' | 'increased' | 'decreased' | 'sent_to_project' | 'adjusted' | 'deleted' | 'edited'
export type PaymentMethod     = 'cash' | 'bank_transfer' | 'check' | 'online' | 'other'
export type ExpenseCategory   = 'materials' | 'labor' | 'workshop' | 'transportation' | 'utilities' | 'monthly' | 'other'
export type WorkerRole        = 'carpenter' | 'painter' | 'electrician' | 'plumber' | 'welder' | 'upholsterer' | 'installer' | 'supervisor' | 'driver' | 'other'
export type ActivityStatus    = 'active' | 'inactive'
export type AssignmentStatus  = 'pending' | 'paid' | 'cancelled'
export type CapitalEntryType  = 'income' | 'deposit' | 'expense' | 'purchase' | 'withdrawal' | 'transfer'
export type UserStatus        = 'active' | 'inactive' | 'suspended'
export type NotificationType  = 'low_stock' | 'payment_due' | 'payment_received' | 'project_completed' | 'project_delayed' | 'expense_recorded' | 'user_created' | 'system'

// ─── AUTH & USERS ─────────────────────────────────────────────────────────────

export interface ApiRole {
  id:          number
  name:        string
  permissions: Record<string, boolean>
  createdAt:   string
  updatedAt:   string
}

export interface ApiUser {
  id:        number
  name:      string
  email:     string
  status:    UserStatus
  avatar:    string | null
  color:     string | null
  roleId:    number
  role:      ApiRole
  createdAt: string
  updatedAt: string
}

export interface ApiAuthResponse {
  accessToken:  string
  refreshToken: string
  expiresIn:    number   // seconds
  user:         ApiUser
}

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

export interface ApiProject {
  id:            number
  name:          string
  clientName:    string
  clientPhone:   string | null
  clientAddress: string | null
  totalValue:    string           // Decimal → string
  firstPayment:  string           // Decimal → string
  status:        ProjectStatus
  progressMode:  ProgressMode
  progressPct:   number
  needsDetails:  boolean
  startDate:     string | null    // "YYYY-MM-DD"
  endDate:       string | null
  notes:         string | null
  workshopId:    number | null
  createdById:   number
  deletedAt:     string | null
  createdAt:     string
  updatedAt:     string
  // computed totals (API may include these to avoid N+1 on the frontend)
  totalReceived?:   string        // SUM(payments.amount)
  totalExpenses?:   string        // SUM(expenses.amount)
  // optional includes — only present when ?include= param is used
  workshop?:          ApiWorkshop
  payments?:          ApiPayment[]
  expenses?:          ApiExpense[]
  contractItems?:     ApiContractItem[]
  contract?:          ApiContract | null
  materialUsages?:    ApiMaterialUsage[]
  workerAssignments?: ApiWorkerAssignment[]
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

export interface ApiPayment {
  id:           number
  amount:       string
  date:         string
  method:       PaymentMethod
  notes:        string | null
  projectId:    number
  recordedById: number | null
  createdAt:    string
  updatedAt:    string
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export interface ApiExpense {
  id:           number
  title:        string
  amount:       string
  category:     ExpenseCategory
  date:         string
  paidTo:       string | null
  notes:        string | null
  projectId:    number | null
  recordedById: number | null
  createdAt:    string
  updatedAt:    string
}

// ─── INVENTORY ────────────────────────────────────────────────────────────────

export interface ApiMaterial {
  id:                number
  name:              string
  type:              MaterialType
  quantity:          string
  unit:              MaterialUnit
  costPerUnit:       string
  lowStockThreshold: string
  supplier:          string | null
  notes:             string | null
  createdAt:         string
  updatedAt:         string
}

export interface ApiMaterialUsage {
  id:           number
  materialId:   number
  material?:    Pick<ApiMaterial, 'id' | 'name' | 'unit' | 'costPerUnit'>
  projectId:    number
  quantityUsed: string
  source:       MaterialSource
  externalCost: string | null
  date:         string
  notes:        string | null
  recordedById: number | null
  createdAt:    string
  updatedAt:    string
}

export interface ApiInventoryLog {
  id:             number
  materialId:     number
  material?:      Pick<ApiMaterial, 'id' | 'name' | 'unit'>
  action:         InventoryAction
  quantityBefore: string
  quantityAfter:  string
  costPerUnit:    string | null
  totalCost:      string | null
  projectId:      number | null
  projectName:    string | null
  notes:          string | null
  date:           string
  performedById:  number | null
  performedBy?:   Pick<ApiUser, 'id' | 'name'>
  createdAt:      string
  // no updatedAt — inventory logs are immutable
}

// ─── WORKERS & WORKSHOPS ──────────────────────────────────────────────────────

export interface ApiWorker {
  id:        number
  name:      string
  phone:     string | null
  role:      WorkerRole
  dailyRate: string | null
  status:    ActivityStatus
  notes:     string | null
  color:     string | null
  avatar:    string | null
  createdAt: string
  updatedAt: string
}

export interface ApiWorkshop {
  id:        number
  name:      string
  location:  string | null
  phone:     string | null
  contact:   string | null
  status:    ActivityStatus
  notes:     string | null
  createdAt: string
  updatedAt: string
}

export interface ApiWorkerAssignment {
  id:           number
  workerId:     number
  worker?:      Pick<ApiWorker, 'id' | 'name' | 'role' | 'avatar' | 'color'>
  projectId:    number
  amount:       string
  date:         string
  status:       AssignmentStatus
  notes:        string | null
  recordedById: number | null
  createdAt:    string
  updatedAt:    string
}

// ─── CONTRACTS ────────────────────────────────────────────────────────────────

export interface ApiContract {
  id:            number
  projectId:     number
  fileUrl:       string
  fileName:      string | null
  fileSize:      string | null
  fileType:      string | null
  extractedData: Record<string, unknown> | null
  uploadedById:  number | null
  createdAt:     string
  updatedAt:     string
}

export interface ApiContractItem {
  id:        number
  projectId: number
  title:     string
  isDone:    boolean
  order:     number
  createdAt: string
  updatedAt: string
}

// ─── CAPITAL ─────────────────────────────────────────────────────────────────

export interface ApiCapitalEntry {
  id:           number
  amount:       string
  type:         CapitalEntryType
  note:         string | null
  date:         string
  projectId:    number | null
  recordedById: number | null
  createdAt:    string
  updatedAt:    string
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export interface ApiNotification {
  id:        number
  userId:    number
  type:      NotificationType
  title:     string
  body:      string
  isRead:    boolean
  data:      Record<string, unknown> | null
  createdAt: string
}

// ─── GENERIC API WRAPPERS ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data:     T
  message?: string
  success:  boolean
}

export interface ApiList<T> {
  data:     T[]
  total:    number
  page:     number
  pageSize: number
}

export interface ApiError {
  statusCode: number
  message:    string
  errors?:    Record<string, string[]>  // field-level validation errors
}
