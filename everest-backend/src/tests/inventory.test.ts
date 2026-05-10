import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user:          { findUnique: vi.fn() },
    material:      { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    materialUsage: { deleteMany: vi.fn() },
    inventoryLog:  { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    capitalEntry:  { create: vi.fn() },
    $transaction:  vi.fn(),
  },
}))

import app from '../app'
import { prisma } from '../lib/prisma'
import { authHeader, mockUser, mockMaterial } from './helpers'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
})

// ── POST /api/inventory/:id/decrease ─────────────────────────────────────────
describe('POST /api/inventory/:id/decrease', () => {
  it('returns 400 when qty exceeds available stock', async () => {
    vi.mocked(prisma.material.findUnique).mockResolvedValue({
      ...mockMaterial, quantity: { toString: () => '10' },
    } as any)

    const res = await request(app).post('/api/inventory/1/decrease').set(authHeader())
      .send({ qty: 50 })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Insufficient stock')
  })

  it('returns 404 for non-existent material', async () => {
    vi.mocked(prisma.material.findUnique).mockResolvedValue(null)
    const res = await request(app).post('/api/inventory/9999/decrease').set(authHeader())
      .send({ qty: 1 })
    expect(res.status).toBe(404)
  })

  it('returns 400 for negative qty', async () => {
    const res = await request(app).post('/api/inventory/1/decrease').set(authHeader())
      .send({ qty: -5 })
    expect(res.status).toBe(400)
  })

  it('returns 400 for zero qty', async () => {
    const res = await request(app).post('/api/inventory/1/decrease').set(authHeader())
      .send({ qty: 0 })
    expect(res.status).toBe(400)
  })

  it('exact boundary: qty === stock succeeds', async () => {
    vi.mocked(prisma.material.findUnique).mockResolvedValue({
      ...mockMaterial, quantity: { toString: () => '10' },
    } as any)
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      material:     { update: vi.fn().mockResolvedValue(mockMaterial) },
      inventoryLog: { create: vi.fn().mockResolvedValue({}) },
    }))

    const res = await request(app).post('/api/inventory/1/decrease').set(authHeader())
      .send({ qty: 10 })

    expect(res.status).toBe(200)
  })
})

// ── POST /api/inventory/:id/increase ─────────────────────────────────────────
describe('POST /api/inventory/:id/increase', () => {
  it('returns 404 for non-existent material', async () => {
    vi.mocked(prisma.material.findUnique).mockResolvedValue(null)
    const res = await request(app).post('/api/inventory/999/increase').set(authHeader())
      .send({ qty: 10, cost: 280 })
    expect(res.status).toBe(404)
  })

  it('returns 400 for negative qty', async () => {
    const res = await request(app).post('/api/inventory/1/increase').set(authHeader())
      .send({ qty: -10, cost: 280 })
    expect(res.status).toBe(400)
  })

  it('returns 400 for negative cost', async () => {
    const res = await request(app).post('/api/inventory/1/increase').set(authHeader())
      .send({ qty: 10, cost: -280 })
    expect(res.status).toBe(400)
  })

  it('creates capital entry (type=purchase, amount=qty×cost) when withCapital=true', async () => {
    vi.mocked(prisma.material.findUnique).mockResolvedValue(mockMaterial as any)
    const capCreate = vi.fn().mockResolvedValue({ id: 3 })
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      material:     { update: vi.fn().mockResolvedValue(mockMaterial) },
      inventoryLog: { create: vi.fn().mockResolvedValue({}) },
      capitalEntry: { create: capCreate },
    }))

    await request(app).post('/api/inventory/1/increase').set(authHeader())
      .send({ qty: 10, cost: 280, withCapital: true })

    expect(capCreate).toHaveBeenCalledOnce()
    expect(capCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'purchase', amount: 2800 }) })
    )
  })

  it('skips capital entry when withCapital=false', async () => {
    vi.mocked(prisma.material.findUnique).mockResolvedValue(mockMaterial as any)
    const capCreate = vi.fn()
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      material:     { update: vi.fn().mockResolvedValue(mockMaterial) },
      inventoryLog: { create: vi.fn().mockResolvedValue({}) },
      capitalEntry: { create: capCreate },
    }))

    await request(app).post('/api/inventory/1/increase').set(authHeader())
      .send({ qty: 10, cost: 280, withCapital: false })

    expect(capCreate).not.toHaveBeenCalled()
  })
})

// ── DELETE /api/inventory/:id — FIXED: no FK crash ───────────────────────────
describe('DELETE /api/inventory/:id', () => {
  it('returns 404 if material not found', async () => {
    vi.mocked(prisma.material.findUnique).mockResolvedValue(null)
    const res = await request(app).delete('/api/inventory/999').set(authHeader())
    expect(res.status).toBe(404)
  })

  it('deletes MaterialUsage and InventoryLog rows first to avoid FK crash', async () => {
    vi.mocked(prisma.material.findUnique).mockResolvedValue(mockMaterial as any)

    const usageDeleteMany = vi.fn().mockResolvedValue({ count: 2 })
    const logDeleteMany   = vi.fn().mockResolvedValue({ count: 3 })
    const matDelete       = vi.fn().mockResolvedValue(mockMaterial)

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      materialUsage: { deleteMany: usageDeleteMany },
      inventoryLog:  { deleteMany: logDeleteMany },
      material:      { delete: matDelete },
    }))

    const res = await request(app).delete('/api/inventory/1').set(authHeader())

    expect(res.status).toBe(200)
    // Dependent rows removed before material — order is enforced by the transaction
    expect(usageDeleteMany).toHaveBeenCalledWith({ where: { materialId: 1 } })
    expect(logDeleteMany).toHaveBeenCalledWith({ where: { materialId: 1 } })
    expect(matDelete).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('no longer crashes with P2003 FK constraint on materials with usages', async () => {
    vi.mocked(prisma.material.findUnique).mockResolvedValue(mockMaterial as any)
    // Transaction succeeds because usages/logs are deleted first
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      materialUsage: { deleteMany: vi.fn().mockResolvedValue({ count: 5 }) },
      inventoryLog:  { deleteMany: vi.fn().mockResolvedValue({ count: 10 }) },
      material:      { delete: vi.fn().mockResolvedValue(mockMaterial) },
    }))

    const res = await request(app).delete('/api/inventory/1').set(authHeader())

    // Previously returned 500 (P2003), now returns 200
    expect(res.status).toBe(200)
  })
})
