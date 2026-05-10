import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user:             { findUnique: vi.fn() },
    worker:           { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    workshop:         { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    workerAssignment: { create: vi.fn(), update: vi.fn() },
    $transaction:     vi.fn(),
  },
}))

import app from '../app'
import { prisma } from '../lib/prisma'
import { authHeader, mockUser } from './helpers'

const mockWorker = {
  id: 1, name: 'Ahmed', phone: '010-000-0001', role: 'carpenter' as const,
  dailyRate: null, status: 'active' as const, notes: null, color: '#1D6F42', avatar: 'A',
  createdAt: new Date(), updatedAt: new Date(),
}
const mockWorkshop = {
  id: 2, name: 'Al-Amana', location: 'Cairo', phone: '02-000-0001',
  contact: 'Mohamed', status: 'active' as const, notes: null, createdAt: new Date(), updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
})

describe('POST /api/workers — worker', () => {
  it('creates worker with valid role enum', async () => {
    vi.mocked(prisma.worker.create).mockResolvedValue(mockWorker)
    const res = await request(app).post('/api/workers').set(authHeader())
      .send({ workerType: 'worker', name: 'Ahmed', role: 'carpenter', status: 'active' })
    expect(res.status).toBe(201)
    expect(res.body.workerType).toBe('worker')
  })

  it('returns 400 for invalid role', async () => {
    const res = await request(app).post('/api/workers').set(authHeader())
      .send({ workerType: 'worker', name: 'Test', role: 'wizard' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing name', async () => {
    const res = await request(app).post('/api/workers').set(authHeader())
      .send({ workerType: 'worker', role: 'carpenter' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/workers — workshop', () => {
  it('creates workshop', async () => {
    vi.mocked(prisma.workshop.create).mockResolvedValue(mockWorkshop)
    const res = await request(app).post('/api/workers').set(authHeader())
      .send({ workerType: 'workshop', name: 'Al-Amana Workshop' })
    expect(res.status).toBe(201)
    expect(res.body.workerType).toBe('workshop')
  })

  it('returns 400 for missing workshop name', async () => {
    const res = await request(app).post('/api/workers').set(authHeader())
      .send({ workerType: 'workshop' })
    expect(res.status).toBe(400)
  })
})

// ── DELETE /api/workers/:id — FIXED: type param is required ──────────────────
describe('DELETE /api/workers/:id', () => {
  it('deletes from Worker table when type=worker', async () => {
    vi.mocked(prisma.worker.delete).mockResolvedValue(mockWorker)
    const res = await request(app).delete('/api/workers/1?type=worker').set(authHeader())
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.worker.delete)).toHaveBeenCalledWith({ where: { id: 1 } })
    expect(vi.mocked(prisma.workshop.delete)).not.toHaveBeenCalled()
  })

  it('deletes from Workshop table when type=workshop', async () => {
    vi.mocked(prisma.workshop.delete).mockResolvedValue(mockWorkshop)
    const res = await request(app).delete('/api/workers/2?type=workshop').set(authHeader())
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.workshop.delete)).toHaveBeenCalledWith({ where: { id: 2 } })
    expect(vi.mocked(prisma.worker.delete)).not.toHaveBeenCalled()
  })

  it('returns 400 when type param is absent', async () => {
    const res = await request(app).delete('/api/workers/1').set(authHeader())
    expect(res.status).toBe(400)
    expect(res.body.message).toContain("type")
    // Neither table should be touched
    expect(vi.mocked(prisma.worker.delete)).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.workshop.delete)).not.toHaveBeenCalled()
  })

  it('returns 400 when type param has an invalid value', async () => {
    const res = await request(app).delete('/api/workers/1?type=employee').set(authHeader())
    expect(res.status).toBe(400)
  })
})

describe('POST /api/workers/assignments', () => {
  it('creates assignment with valid payload', async () => {
    vi.mocked(prisma.workerAssignment.create).mockResolvedValue({
      id: 1, workerId: 1, projectId: 1, amount: '3000', date: new Date(),
      status: 'pending', notes: null, recordedById: 1, createdAt: new Date(), updatedAt: new Date(),
    } as any)

    const res = await request(app).post('/api/workers/assignments').set(authHeader())
      .send({ workerId: 1, projectId: 1, amount: 3000, date: '2024-01-15' })

    expect(res.status).toBe(201)
  })

  it('returns 400 for missing workerId', async () => {
    const res = await request(app).post('/api/workers/assignments').set(authHeader())
      .send({ projectId: 1, amount: 3000, date: '2024-01-15' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for negative amount', async () => {
    const res = await request(app).post('/api/workers/assignments').set(authHeader())
      .send({ workerId: 1, projectId: 1, amount: -500, date: '2024-01-15' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing projectId', async () => {
    const res = await request(app).post('/api/workers/assignments').set(authHeader())
      .send({ workerId: 1, amount: 3000, date: '2024-01-15' })
    expect(res.status).toBe(400)
  })
})
