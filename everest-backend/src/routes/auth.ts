import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  name:    z.string().min(2),
  email:   z.string().email(),
  password: z.string().min(6),
  roleId:  z.number().int().positive(),
  avatar:  z.string().optional(),
  color:   z.string().optional(),
})

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where:   { email },
      include: { role: true },
    })

    if (!user || user.status !== 'active') {
      res.status(401).json({ message: 'Invalid credentials' })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ message: 'Invalid credentials' })
      return
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as any,
    )

    const { password: _, ...safeUser } = user
    res.json({ accessToken: token, expiresIn: 604800, user: safeUser })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/auth/register (protected — existing admin creates new users) ────
router.post('/register', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body)
    const hashed = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        name:     data.name,
        email:    data.email,
        password: hashed,
        roleId:   data.roleId,
        avatar:   data.avatar ?? data.name.charAt(0).toUpperCase(),
        color:    data.color ?? '#1A2744',
        status:   'active',
      },
      include: { role: true },
    })

    const { password: _, ...safeUser } = user
    res.status(201).json(safeUser)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.user!.id },
      include: { role: true },
    })
    if (!user) { res.status(404).json({ message: 'User not found' }); return }

    const { password: _, ...safeUser } = user
    res.json(safeUser)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/auth/roles ───────────────────────────────────────────────────────
router.get('/roles', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } })
    res.json(roles)
  } catch (err) {
    next(err)
  }
})

export default router
