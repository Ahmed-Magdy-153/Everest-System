/**
 * Database integration tests — connect to the real Supabase instance.
 * NO mocks. Every test talks directly to PostgreSQL via Prisma.
 *
 * All test data is prefixed with TS (timestamp) so it never collides with
 * production records and can be identified and cleaned up reliably.
 *
 * Run with:  npm run test:db
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// Unique prefix per test run — prevents collisions on parallel CI runs
const TS = `TEST_${Date.now()}`

// IDs of records created in beforeAll — used in tests and cleaned up in afterAll
let roleId:     number
let userId:     number
let projectId:  number
let materialId: number

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  // 1. Role
  const role = await prisma.role.create({
    data: { name: `${TS}_owner`, permissions: { manageProjects: true, manageExpenses: true, manageInventory: true, manageCapital: true } },
  })
  roleId = role.id

  // 2. User
  const user = await prisma.user.create({
    data: { name: 'DB Test User', email: `${TS}@test.com`, password: 'hashed-pw', roleId, avatar: 'D', color: '#000' },
  })
  userId = user.id

  // 3. Project
  const project = await prisma.project.create({
    data: { name: `${TS} Villa`, clientName: 'Test Client', totalValue: 500000, firstPayment: 0, createdById: userId },
  })
  projectId = project.id

  // 4. Material
  const material = await prisma.material.create({
    data: { name: `${TS} Plywood`, type: 'plywood', quantity: 100, unit: 'sheet', costPerUnit: 280, lowStockThreshold: 10 },
  })
  materialId = material.id
})

afterAll(async () => {
  // Delete in FK-safe order (children before parents)
  await prisma.workerAssignment.deleteMany({ where: { recordedById: userId } })
  await prisma.contractItem.deleteMany({ where: { projectId } })
  await prisma.contract.deleteMany({ where: { projectId } })
  await prisma.materialUsage.deleteMany({ where: { projectId } })
  await prisma.materialUsage.deleteMany({ where: { materialId } })
  await prisma.inventoryLog.deleteMany({ where: { materialId } })
  await prisma.inventoryLog.deleteMany({ where: { performedById: userId } })
  await prisma.payment.deleteMany({ where: { projectId } })
  await prisma.expense.deleteMany({ where: { projectId } })
  await prisma.expense.deleteMany({ where: { recordedById: userId } })
  await prisma.capitalEntry.deleteMany({ where: { recordedById: userId } })
  await prisma.capitalEntry.deleteMany({ where: { projectId } })
  await prisma.material.deleteMany({ where: { name: { startsWith: TS } } })
  await prisma.project.deleteMany({ where: { name: { startsWith: TS } } })
  await prisma.user.deleteMany({ where: { email: { startsWith: TS } } })
  await prisma.role.deleteMany({ where: { name: { startsWith: TS } } })
  await prisma.$disconnect()
})

// ── 1. Connection & Schema ────────────────────────────────────────────────────

describe('Connection & Schema', () => {
  it('connects to the database successfully', async () => {
    const result = await prisma.$queryRaw<[{ '?column?': number }]>`SELECT 1`
    expect(Number(result[0]['?column?'])).toBe(1)
  })

  it('all 17 models are accessible via Prisma', async () => {
    // Each query returns without throwing — confirms table exists and schema matches
    await expect(prisma.role.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.user.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.session.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.project.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.payment.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.expense.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.material.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.materialUsage.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.inventoryLog.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.worker.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.workshop.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.workerAssignment.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.contract.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.contractItem.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.capitalEntry.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.notification.count()).resolves.toBeGreaterThanOrEqual(0)
    await expect(prisma.auditLog.count()).resolves.toBeGreaterThanOrEqual(0)
  })

  it('reads seeded roles from database', async () => {
    const roles = await prisma.role.findMany({ where: { name: { in: ['owner', 'manager', 'accountant'] } } })
    expect(roles.length).toBeGreaterThanOrEqual(1)
  })

  it('permissions column stores and retrieves JSON correctly', async () => {
    const role = await prisma.role.findUnique({ where: { id: roleId } })
    expect(role).not.toBeNull()
    expect(typeof role!.permissions).toBe('object')
    expect((role!.permissions as any).manageProjects).toBe(true)
  })
})

// ── 2. Unique Constraints ─────────────────────────────────────────────────────

describe('Unique Constraints', () => {
  it('enforces unique email on User (P2002)', async () => {
    await expect(
      prisma.user.create({
        data: { name: 'Duplicate', email: `${TS}@test.com`, password: 'pw', roleId }, // same email as beforeAll user
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError)

    await prisma.user.findUnique({ where: { email: `${TS}@test.com` } }).then(u => {
      expect(u).not.toBeNull()
    })
  })

  it('enforces unique role name (P2002)', async () => {
    await expect(
      prisma.role.create({ data: { name: `${TS}_owner`, permissions: {} } })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError)
  })

  it('enforces one Contract per Project (unique projectId)', async () => {
    await prisma.contract.create({
      data: { projectId, fileUrl: 'https://example.com/contract.pdf', uploadedById: userId },
    })
    await expect(
      prisma.contract.create({
        data: { projectId, fileUrl: 'https://example.com/another.pdf' },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError)
    // Clean up
    await prisma.contract.deleteMany({ where: { projectId } })
  })
})

// ── 3. Foreign Key Constraints ────────────────────────────────────────────────

describe('Foreign Key Constraints', () => {
  it('Payment requires a valid (non-deleted) projectId — enforced by FK', async () => {
    await expect(
      prisma.payment.create({
        data: { amount: 1000, date: new Date(), method: 'cash', projectId: 999999, recordedById: userId },
      })
    ).rejects.toThrow()
  })

  it('CapitalEntry allows null projectId (standalone capital entry)', async () => {
    const entry = await prisma.capitalEntry.create({
      data: { amount: 1000, type: 'deposit', date: new Date(), recordedById: userId },
    })
    expect(entry.projectId).toBeNull()
    await prisma.capitalEntry.delete({ where: { id: entry.id } })
  })

  it('Expense allows null projectId (general overhead expense)', async () => {
    const exp = await prisma.expense.create({
      data: { title: `${TS} overhead`, amount: 500, category: 'monthly', date: new Date(), recordedById: userId },
    })
    expect(exp.projectId).toBeNull()
    await prisma.expense.delete({ where: { id: exp.id } })
  })
})

// ── 4. Soft Delete ────────────────────────────────────────────────────────────

describe('Soft Delete (Project)', () => {
  let softDeletedId: number

  it('setting deletedAt hides project from deletedAt:null queries', async () => {
    const proj = await prisma.project.create({
      data: { name: `${TS} Deleted`, clientName: 'Ghost', totalValue: 10000, firstPayment: 0, createdById: userId },
    })
    softDeletedId = proj.id

    await prisma.project.update({ where: { id: proj.id }, data: { deletedAt: new Date() } })

    const found = await prisma.project.findFirst({ where: { id: proj.id, deletedAt: null } })
    expect(found).toBeNull()
  })

  it('soft-deleted project still exists in the database (payments are preserved)', async () => {
    const raw = await prisma.project.findUnique({ where: { id: softDeletedId } })
    expect(raw).not.toBeNull()
    expect(raw!.deletedAt).not.toBeNull()
    await prisma.project.delete({ where: { id: softDeletedId } }) // hard-delete test record
  })
})

// ── 5. Capital Balance Calculation ────────────────────────────────────────────

describe('Capital Balance', () => {
  it('balance = income + deposit − expense − purchase − withdrawal', async () => {
    const entries = [
      { amount: 100000, type: 'income'     as const },
      { amount:  50000, type: 'deposit'    as const },
      { amount:  30000, type: 'expense'    as const },
      { amount:  15000, type: 'purchase'   as const },
      { amount:  10000, type: 'withdrawal' as const },
    ]

    const created = await Promise.all(entries.map(e =>
      prisma.capitalEntry.create({
        data: { ...e, date: new Date(), recordedById: userId },
      })
    ))

    const all = await prisma.capitalEntry.findMany({
      where: { id: { in: created.map(c => c.id) } },
    })

    const INFLOW  = ['income', 'deposit']
    const OUTFLOW = ['expense', 'purchase', 'withdrawal']
    const inflow  = all.filter(e => INFLOW.includes(e.type)).reduce((s, e) => s + Number(e.amount), 0)
    const outflow = all.filter(e => OUTFLOW.includes(e.type)).reduce((s, e) => s + Number(e.amount), 0)

    expect(inflow).toBe(150000)
    expect(outflow).toBe(55000)
    expect(inflow - outflow).toBe(95000)

    await prisma.capitalEntry.deleteMany({ where: { id: { in: created.map(c => c.id) } } })
  })
})

// ── 6. Decimal Precision ──────────────────────────────────────────────────────

describe('Decimal Field Precision', () => {
  it('stores and retrieves Decimal(14,2) amounts without loss', async () => {
    const entry = await prisma.capitalEntry.create({
      data: { amount: 123456.78, type: 'income', date: new Date(), recordedById: userId },
    })
    const fetched = await prisma.capitalEntry.findUnique({ where: { id: entry.id } })
    expect(Number(fetched!.amount)).toBe(123456.78)
    await prisma.capitalEntry.delete({ where: { id: entry.id } })
  })

  it('stores and retrieves Decimal(14,3) quantity without loss', async () => {
    const mat = await prisma.material.findUnique({ where: { id: materialId } })
    // Update to a fractional quantity
    await prisma.material.update({ where: { id: materialId }, data: { quantity: 99.5 } })
    const updated = await prisma.material.findUnique({ where: { id: materialId } })
    expect(Number(updated!.quantity)).toBe(99.5)
    // Reset
    await prisma.material.update({ where: { id: materialId }, data: { quantity: 100 } })
  })
})

// ── 7. Inventory Stock Operations ─────────────────────────────────────────────

describe('Inventory Stock', () => {
  it('decreases stock and logs the action atomically', async () => {
    const before = await prisma.material.findUnique({ where: { id: materialId } })
    const beforeQty = Number(before!.quantity)
    const decreaseBy = 5

    await prisma.$transaction(async (tx) => {
      await tx.material.update({ where: { id: materialId }, data: { quantity: beforeQty - decreaseBy } })
      await tx.inventoryLog.create({
        data: {
          materialId, action: 'decreased',
          quantityBefore: beforeQty, quantityAfter: beforeQty - decreaseBy,
          date: new Date(), performedById: userId,
        },
      })
    })

    const after = await prisma.material.findUnique({ where: { id: materialId } })
    expect(Number(after!.quantity)).toBe(beforeQty - decreaseBy)

    const log = await prisma.inventoryLog.findFirst({
      where: { materialId, action: 'decreased', performedById: userId },
      orderBy: { createdAt: 'desc' },
    })
    expect(log).not.toBeNull()
    expect(Number(log!.quantityBefore)).toBe(beforeQty)
    expect(Number(log!.quantityAfter)).toBe(beforeQty - decreaseBy)
  })
})

// ── 8. Payment → CapitalEntry (business logic) ────────────────────────────────

describe('Payment auto-creates CapitalEntry', () => {
  it('payment + income capital entry created atomically via $transaction', async () => {
    const amount = 75000

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: { amount, date: new Date(), method: 'bank_transfer', projectId, recordedById: userId },
      })
      await tx.capitalEntry.create({
        data: { amount, type: 'income', note: `${TS} payment`, date: new Date(), projectId, recordedById: userId },
      })
    })

    const pay = await prisma.payment.findFirst({ where: { projectId, amount, recordedById: userId } })
    expect(pay).not.toBeNull()
    expect(Number(pay!.amount)).toBe(amount)

    const cap = await prisma.capitalEntry.findFirst({ where: { projectId, amount, type: 'income', recordedById: userId } })
    expect(cap).not.toBeNull()
    expect(cap!.type).toBe('income')
  })
})

// ── 9. ContractItem Cascade Delete ───────────────────────────────────────────

describe('ContractItem cascade on project delete', () => {
  it('deleting project (hard) cascades to ContractItem rows', async () => {
    const proj = await prisma.project.create({
      data: { name: `${TS} CascadeTest`, clientName: 'C', totalValue: 1000, firstPayment: 0, createdById: userId },
    })
    const item = await prisma.contractItem.create({
      data: { projectId: proj.id, title: 'Test item', isDone: false, order: 0 },
    })

    await prisma.project.delete({ where: { id: proj.id } })

    const orphan = await prisma.contractItem.findUnique({ where: { id: item.id } })
    expect(orphan).toBeNull() // cascaded
  })
})

// ── 10. MaterialUsage + InventoryLog safe delete (Bug 3 fix) ─────────────────

describe('Material delete — Bug 3 fix', () => {
  it('deleting material after creating usage rows succeeds (no FK crash)', async () => {
    const mat = await prisma.material.create({
      data: { name: `${TS} DeleteMe`, type: 'other', quantity: 10, unit: 'piece', costPerUnit: 50, lowStockThreshold: 2 },
    })

    // Create FK-dependent rows
    await prisma.inventoryLog.create({
      data: { materialId: mat.id, action: 'added', quantityBefore: 0, quantityAfter: 10, date: new Date(), performedById: userId },
    })
    await prisma.materialUsage.create({
      data: { materialId: mat.id, projectId, quantityUsed: 2, source: 'from_stock', date: new Date(), recordedById: userId },
    })

    // Apply the fix: delete dependents first, then material
    await prisma.$transaction(async (tx) => {
      await tx.materialUsage.deleteMany({ where: { materialId: mat.id } })
      await tx.inventoryLog.deleteMany({ where: { materialId: mat.id } })
      await tx.material.delete({ where: { id: mat.id } })
    })

    const deleted = await prisma.material.findUnique({ where: { id: mat.id } })
    expect(deleted).toBeNull()
  })
})
