import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user:         { findUnique: vi.fn() },
    expense:      { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    capitalEntry: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import app from '../app'
import { prisma } from '../lib/prisma'
import { authHeader, mockUser } from './helpers'

const mockExpense = {
  id: 1, title: 'Workers pay', amount: '5000', category: 'labor',
  date: new Date('2024-01-15'), paidTo: null, notes: null,
  projectId: 1, recordedById: 1,
  project: { id: 1, name: 'Test Project' },
  createdAt: new Date(), updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
})

// ── POST /api/expenses ────────────────────────────────────────────────────────
describe('POST /api/expenses', () => {
  it('creates expense + capital entry atomically', async () => {
    const txFn = vi.fn().mockImplementation(async (cb: any) => cb({
      expense:      { create: vi.fn().mockResolvedValue(mockExpense) },
      capitalEntry: { create: vi.fn().mockResolvedValue({ id: 10 }) },
    }))
    vi.mocked(prisma.$transaction).mockImplementation(txFn)

    const res = await request(app).post('/api/expenses').set(authHeader())
      .send({ title: 'Workers pay', amount: 5000, category: 'labor', date: '2024-01-15' })

    expect(res.status).toBe(201)
    expect(txFn).toHaveBeenCalledOnce()
  })

  it('returns 400 for negative amount', async () => {
    const res = await request(app).post('/api/expenses').set(authHeader())
      .send({ title: 'X', amount: -100, category: 'labor', date: '2024-01-15' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for zero amount', async () => {
    const res = await request(app).post('/api/expenses').set(authHeader())
      .send({ title: 'X', amount: 0, category: 'labor', date: '2024-01-15' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid category', async () => {
    const res = await request(app).post('/api/expenses').set(authHeader())
      .send({ title: 'X', amount: 100, category: 'INVALID', date: '2024-01-15' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty title', async () => {
    const res = await request(app).post('/api/expenses').set(authHeader())
      .send({ title: '', amount: 100, category: 'labor', date: '2024-01-15' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing title', async () => {
    const res = await request(app).post('/api/expenses').set(authHeader())
      .send({ amount: 100, category: 'labor', date: '2024-01-15' })
    expect(res.status).toBe(400)
  })
})

// ── PUT /api/expenses/:id — FIXED: syncs CapitalEntry ────────────────────────
describe('PUT /api/expenses/:id', () => {
  it('updates expense record', async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any)
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      expense:      { update: vi.fn().mockResolvedValue({ ...mockExpense, title: 'Updated' }) },
      capitalEntry: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() },
    }))

    const res = await request(app).put('/api/expenses/1').set(authHeader())
      .send({ title: 'Updated', amount: 6000, category: 'labor', date: '2024-01-15' })

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Updated')
  })

  it('syncs CapitalEntry amount when expense amount changes', async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any)

    const capFindFirst = vi.fn().mockResolvedValue({ id: 10, amount: '5000' })
    const capUpdate    = vi.fn().mockResolvedValue({ id: 10 })

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      expense:      { update: vi.fn().mockResolvedValue({ ...mockExpense, amount: '6000' }) },
      capitalEntry: { findFirst: capFindFirst, update: capUpdate },
    }))

    await request(app).put('/api/expenses/1').set(authHeader()).send({ amount: 6000 })

    expect(capFindFirst).toHaveBeenCalledOnce()
    expect(capUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 6000 }) })
    )
  })

  it('returns 404 for non-existent expense', async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(null)

    const res = await request(app).put('/api/expenses/9999').set(authHeader())
      .send({ title: 'X', amount: 100, category: 'other', date: '2024-01-01' })

    expect(res.status).toBe(404)
  })

  it('returns 404 (P2025) for non-existent id in update', async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any)
    const { Prisma } = await import('@prisma/client')
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2025', clientVersion: '5' })
    )

    const res = await request(app).put('/api/expenses/9999').set(authHeader())
      .send({ title: 'X', amount: 100, category: 'other', date: '2024-01-01' })

    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/expenses/:id — FIXED: deletes linked CapitalEntry ─────────────
describe('DELETE /api/expenses/:id', () => {
  it('deletes both expense and its CapitalEntry in one transaction', async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any)

    const capDeleteMany = vi.fn().mockResolvedValue({ count: 1 })
    const expDelete     = vi.fn().mockResolvedValue(mockExpense)

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      capitalEntry: { deleteMany: capDeleteMany },
      expense:      { delete: expDelete },
    }))

    const res = await request(app).delete('/api/expenses/1').set(authHeader())

    expect(res.status).toBe(200)
    expect(capDeleteMany).toHaveBeenCalledOnce()
    expect(capDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ type: 'expense' }) })
    )
    expect(expDelete).toHaveBeenCalledOnce()
  })

  it('returns 404 for non-existent expense', async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(null)

    const res = await request(app).delete('/api/expenses/9999').set(authHeader())

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Expense not found')
  })

  it('capital entry deleteMany uses matching fields (no wrong-entry deletion)', async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any)
    const capDeleteMany = vi.fn().mockResolvedValue({ count: 1 })
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      capitalEntry: { deleteMany: capDeleteMany },
      expense:      { delete: vi.fn() },
    }))

    await request(app).delete('/api/expenses/1').set(authHeader())

    // Must filter by amount AND projectId to avoid deleting unrelated entries
    expect(capDeleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        amount:    mockExpense.amount,
        projectId: mockExpense.projectId,
      }),
    }))
  })
})
