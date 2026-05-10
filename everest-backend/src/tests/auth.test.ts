import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user:         { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    role:         { findMany: vi.fn() },
    project:      { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import app from '../app'
import { prisma } from '../lib/prisma'
import { authHeader, mockUser } from './helpers'

const pu = vi.mocked(prisma.user.findUnique)

beforeEach(() => vi.clearAllMocks())

describe('POST /api/auth/login', () => {
  it('returns 200 + accessToken on valid credentials', async () => {
    const hash = await bcrypt.hash('password123', 10)
    pu.mockResolvedValue({ ...mockUser, password: hash } as any)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@everest.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body.user).not.toHaveProperty('password')
  })

  it('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('correct', 10)
    pu.mockResolvedValue({ ...mockUser, password: hash } as any)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@everest.com', password: 'wrong' })

    expect(res.status).toBe(401)
  })

  it('returns 401 for unknown email', async () => {
    pu.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@x.com', password: 'any' })
    expect(res.status).toBe(401)
  })

  it('returns 401 for inactive user even with correct password', async () => {
    const hash = await bcrypt.hash('password123', 10)
    pu.mockResolvedValue({ ...mockUser, password: hash, status: 'inactive' } as any)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@everest.com', password: 'password123' })

    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'pass' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('errors')
  })

  it('returns 400 for missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com' })
    expect(res.status).toBe(400)
  })
})

describe('JWT middleware protection', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(401)
  })

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer not.valid.jwt')
    expect(res.status).toBe(401)
  })

  it('returns 401 with expired token', async () => {
    const jwt = await import('jsonwebtoken')
    const expired = jwt.default.sign({ userId: 1 }, process.env.JWT_SECRET!, { expiresIn: -1 })
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${expired}`)
    expect(res.status).toBe(401)
  })

  it('returns 401 when user account is inactive', async () => {
    pu.mockResolvedValue({ ...mockUser, status: 'inactive' } as any)
    const res = await request(app)
      .get('/api/projects')
      .set(authHeader())
    expect(res.status).toBe(401)
  })

  it('passes through with valid token and active user', async () => {
    pu.mockResolvedValue(mockUser as any)
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    const res = await request(app).get('/api/projects').set(authHeader())
    expect(res.status).toBe(200)
  })
})

describe('GET /api/auth/me', () => {
  it('returns user without password field', async () => {
    pu.mockResolvedValue(mockUser as any)
    const res = await request(app).get('/api/auth/me').set(authHeader())
    expect(res.status).toBe(200)
    expect(res.body).not.toHaveProperty('password')
    expect(res.body).toHaveProperty('email')
  })
})
