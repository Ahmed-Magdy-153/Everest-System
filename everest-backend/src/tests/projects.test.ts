import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user:         { findUnique: vi.fn() },
    project:      { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    payment:      { create: vi.fn() },
    capitalEntry: { create: vi.fn() },
    contractItem: { create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import app from '../app'
import { prisma } from '../lib/prisma'
import { authHeader, mockUser, mockProject } from './helpers'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
})

describe('GET /api/projects', () => {
  it('returns 200 with empty array', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    const res = await request(app).get('/api/projects').set(authHeader())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('always filters deletedAt: null', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    await request(app).get('/api/projects').set(authHeader())
    expect(vi.mocked(prisma.project.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) })
    )
  })

  it('passes status filter to Prisma', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    await request(app).get('/api/projects?status=completed').set(authHeader())
    expect(vi.mocked(prisma.project.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'completed' }) })
    )
  })
})

describe('POST /api/projects', () => {
  it('creates project successfully', async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      project:      { create: vi.fn().mockResolvedValue(mockProject) },
      payment:      { create: vi.fn() },
      capitalEntry: { create: vi.fn() },
    }))

    const res = await request(app).post('/api/projects').set(authHeader())
      .send({ name: 'Villa Ahmed', clientName: 'Ahmed', totalValue: 450000, firstPayment: 0 })

    expect(res.status).toBe(201)
  })

  it('returns 400 for missing name', async () => {
    const res = await request(app).post('/api/projects').set(authHeader())
      .send({ clientName: 'Ahmed', totalValue: 450000 })
    expect(res.status).toBe(400)
  })

  it('returns 400 for negative totalValue', async () => {
    const res = await request(app).post('/api/projects').set(authHeader())
      .send({ name: 'Test', clientName: 'C', totalValue: -1000 })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid status enum', async () => {
    const res = await request(app).post('/api/projects').set(authHeader())
      .send({ name: 'X', clientName: 'C', totalValue: 1000, status: 'INVALID' })
    expect(res.status).toBe(400)
  })

  it('auto-creates payment + capital entry when firstPayment > 0', async () => {
    const payCreate = vi.fn().mockResolvedValue({})
    const capCreate = vi.fn().mockResolvedValue({})
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      project:      { create: vi.fn().mockResolvedValue(mockProject) },
      payment:      { create: payCreate },
      capitalEntry: { create: capCreate },
    }))

    await request(app).post('/api/projects').set(authHeader())
      .send({ name: 'Villa', clientName: 'C', totalValue: 100000, firstPayment: 20000 })

    expect(payCreate).toHaveBeenCalledOnce()
    expect(capCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'income', amount: 20000 }) })
    )
  })

  it('skips payment + capital when firstPayment = 0', async () => {
    const payCreate = vi.fn()
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb({
      project:      { create: vi.fn().mockResolvedValue(mockProject) },
      payment:      { create: payCreate },
      capitalEntry: { create: vi.fn() },
    }))

    await request(app).post('/api/projects').set(authHeader())
      .send({ name: 'Villa', clientName: 'C', totalValue: 100000, firstPayment: 0 })

    expect(payCreate).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/projects/:id', () => {
  it('soft-deletes by setting deletedAt — never calls project.delete', async () => {
    vi.mocked(prisma.project.update).mockResolvedValue({ ...mockProject, deletedAt: new Date() } as any)

    const res = await request(app).delete('/api/projects/1').set(authHeader())

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.project.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) })
    )
    expect(vi.mocked(prisma.project.delete)).not.toHaveBeenCalled()
  })
})

describe('PUT /api/projects/:id', () => {
  it('updates project fields', async () => {
    vi.mocked(prisma.project.update).mockResolvedValue(mockProject as any)
    const res = await request(app).put('/api/projects/1').set(authHeader())
      .send({ name: 'Updated Name', status: 'completed' })
    expect(res.status).toBe(200)
  })

  it('returns 404 on non-existent project (P2025)', async () => {
    const { Prisma } = await import('@prisma/client')
    vi.mocked(prisma.project.update).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2025', clientVersion: '5' })
    )
    const res = await request(app).put('/api/projects/9999').set(authHeader())
      .send({ name: 'X' })
    expect(res.status).toBe(404)
  })
})
