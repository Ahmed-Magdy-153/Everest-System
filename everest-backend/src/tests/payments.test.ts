import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user:         { findUnique: vi.fn() },
    project:      { findFirst: vi.fn() },
    payment:      { findMany: vi.fn(), create: vi.fn() },
    capitalEntry: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import app from '../app'
import { prisma } from '../lib/prisma'
import { authHeader, mockUser, mockProject } from './helpers'

const mockPayment = {
  id: 1, amount: '10000', date: new Date(), method: 'cash',
  notes: null, projectId: 1, recordedById: 1,
  project: { id: 1, name: 'Test Project', clientName: 'Client' },
  createdAt: new Date(), updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
})

describe('POST /api/payments', () => {
  it('creates payment + capital income entry in transaction', async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any)
    const txFn = vi.fn().mockImplementation(async (cb: any) => cb({
      payment:      { create: vi.fn().mockResolvedValue(mockPayment) },
      capitalEntry: { create: vi.fn().mockResolvedValue({ id: 5 }) },
    }))
    vi.mocked(prisma.$transaction).mockImplementation(txFn)

    const res = await request(app).post('/api/payments').set(authHeader())
      .send({ projectId: 1, amount: 10000, date: '2024-01-15', method: 'cash' })

    expect(res.status).toBe(201)
    expect(txFn).toHaveBeenCalledOnce()
  })

  it('returns 404 for deleted project (deletedAt filter)', async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValue(null)

    const res = await request(app).post('/api/payments').set(authHeader())
      .send({ projectId: 999, amount: 5000, date: '2024-01-15' })

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Project not found')
  })

  it('returns 400 for negative amount', async () => {
    const res = await request(app).post('/api/payments').set(authHeader())
      .send({ projectId: 1, amount: -500, date: '2024-01-15' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for zero amount', async () => {
    const res = await request(app).post('/api/payments').set(authHeader())
      .send({ projectId: 1, amount: 0, date: '2024-01-15' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing projectId', async () => {
    const res = await request(app).post('/api/payments').set(authHeader())
      .send({ amount: 5000, date: '2024-01-15' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid payment method', async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any)
    const res = await request(app).post('/api/payments').set(authHeader())
      .send({ projectId: 1, amount: 5000, date: '2024-01-15', method: 'bitcoin' })
    expect(res.status).toBe(400)
  })

  it('capital entry type is always "income"', async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValue(mockProject as any)
    const capCreate = vi.fn().mockResolvedValue({})
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      payment:      { create: vi.fn().mockResolvedValue(mockPayment) },
      capitalEntry: { create: capCreate },
    }))

    await request(app).post('/api/payments').set(authHeader())
      .send({ projectId: 1, amount: 5000, date: '2024-01-15' })

    expect(capCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'income', amount: 5000 }) })
    )
  })
})

describe('GET /api/payments', () => {
  it('returns list for authenticated user', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([mockPayment] as any)
    const res = await request(app).get('/api/payments').set(authHeader())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('filters by projectId', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([])
    await request(app).get('/api/payments?projectId=42').set(authHeader())
    expect(vi.mocked(prisma.payment.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ projectId: 42 }) })
    )
  })
})
