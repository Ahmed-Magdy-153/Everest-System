import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET ?? 'test-secret-key-for-vitest'

/** Generate a signed JWT for a mock user */
export function makeToken(userId = 1): string {
  return jwt.sign({ userId }, SECRET, { expiresIn: '1h' })
}

/** Auth header string */
export function authHeader(userId = 1) {
  return { Authorization: `Bearer ${makeToken(userId)}` }
}

/** Minimal mock user that auth middleware expects from Prisma */
export const mockUser = {
  id:        1,
  name:      'Test User',
  email:     'test@everest.com',
  password:  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdEPxKVhEMFiA6', // 'password123'
  status:    'active',
  avatar:    'T',
  color:     '#1A2744',
  roleId:    1,
  role: {
    id:          1,
    name:        'owner',
    permissions: { manageProjects: true, manageExpenses: true, manageInventory: true, manageCapital: true, manageWorkers: true, manageUsers: true, viewReports: true },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockProject = {
  id:            1,
  name:          'Test Project',
  clientName:    'Test Client',
  clientPhone:   null,
  clientAddress: null,
  totalValue:    { toString: () => '100000' },
  firstPayment:  { toString: () => '20000' },
  status:        'in_progress',
  progressMode:  'percentage',
  progressPct:   0,
  needsDetails:  false,
  startDate:     null,
  endDate:       null,
  notes:         null,
  workshopId:    null,
  createdById:   1,
  deletedAt:     null,
  createdAt:     new Date(),
  updatedAt:     new Date(),
}

export const mockMaterial = {
  id:                1,
  name:              'Plywood',
  type:              'plywood',
  quantity:          { toString: () => '50' },
  unit:              'sheet',
  costPerUnit:       { toString: () => '280' },
  lowStockThreshold: { toString: () => '10' },
  supplier:          null,
  notes:             null,
  createdAt:         new Date(),
  updatedAt:         new Date(),
}
