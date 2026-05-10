import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user:         { findUnique: vi.fn() },
    capitalEntry: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import app from '../app'
import { prisma } from '../lib/prisma'
import { authHeader, mockUser } from './helpers'

const makeEntry = (id: number, type: string, amount: number) => ({
  id, amount: { toString: () => String(amount) }, type,
  date: new Date(), note: null, projectId: null, recordedById: 1,
  project: null, recordedBy: null, createdAt: new Date(), updatedAt: new Date(),
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
})

describe('GET /api/capital', () => {
  it('correctly computes balance = inflow − outflow', async () => {
    vi.mocked(prisma.capitalEntry.findMany).mockResolvedValue([
      makeEntry(1, 'income',   100000),  // inflow
      makeEntry(2, 'deposit',   50000),  // inflow
      makeEntry(3, 'expense',   30000),  // outflow
      makeEntry(4, 'purchase',  15000),  // outflow
    ] as any)

    const res = await request(app).get('/api/capital').set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body.balance).toBe(105000)      // 150000 − 45000
    expect(res.body.totalInflow).toBe(150000)
    expect(res.body.totalOutflow).toBe(45000)
  })

  it('returns balance=0 with empty entries', async () => {
    vi.mocked(prisma.capitalEntry.findMany).mockResolvedValue([])
    const res = await request(app).get('/api/capital').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body.balance).toBe(0)
    expect(res.body.entries).toHaveLength(0)
  })

  it('withdrawal type counts as outflow', async () => {
    vi.mocked(prisma.capitalEntry.findMany).mockResolvedValue([
      makeEntry(1, 'income',     50000),
      makeEntry(2, 'withdrawal', 10000),
    ] as any)

    const res = await request(app).get('/api/capital').set(authHeader())
    expect(res.body.balance).toBe(40000)
    expect(res.body.totalOutflow).toBe(10000)
  })

  it('transfer type is neutral — does not affect inflow or outflow (internal move)', async () => {
    // Transfer = internal movement between accounts, net effect is zero by design
    vi.mocked(prisma.capitalEntry.findMany).mockResolvedValue([
      makeEntry(1, 'income',   100000),
      makeEntry(2, 'transfer',  20000),
    ] as any)

    const res = await request(app).get('/api/capital').set(authHeader())
    expect(res.body.totalInflow).toBe(100000)   // transfer not counted as inflow
    expect(res.body.totalOutflow).toBe(0)        // transfer not counted as outflow
    expect(res.body.balance).toBe(100000)        // net = income only
  })
})

describe('POST /api/capital', () => {
  it('creates a capital entry with correct recordedById', async () => {
    const createSpy = vi.mocked(prisma.capitalEntry.create)
    createSpy.mockResolvedValue({ id: 10 } as any)

    const res = await request(app).post('/api/capital').set(authHeader(1))
      .send({ amount: 50000, type: 'deposit', date: '2024-01-01' })

    expect(res.status).toBe(201)
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recordedById: 1, amount: 50000 }) })
    )
  })

  it('returns 400 for negative amount', async () => {
    const res = await request(app).post('/api/capital').set(authHeader())
      .send({ amount: -1000, type: 'deposit', date: '2024-01-01' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for zero amount', async () => {
    const res = await request(app).post('/api/capital').set(authHeader())
      .send({ amount: 0, type: 'deposit', date: '2024-01-01' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid type', async () => {
    const res = await request(app).post('/api/capital').set(authHeader())
      .send({ amount: 1000, type: 'HACK', date: '2024-01-01' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing date', async () => {
    const res = await request(app).post('/api/capital').set(authHeader())
      .send({ amount: 1000, type: 'income' })
    expect(res.status).toBe(400)
  })
})
