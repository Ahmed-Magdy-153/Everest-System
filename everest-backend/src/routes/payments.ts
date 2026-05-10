import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { str, num } from '../lib/query'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const paymentSchema = z.object({
  amount:    z.number().positive(),
  date:      z.string(),
  method:    z.enum(['cash', 'bank_transfer', 'check', 'online', 'other']).default('cash'),
  notes:     z.string().nullable().optional(),
  projectId: z.number().int().positive(),
})

// ── GET /api/payments ─────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = num(req.query.projectId)
    const method    = str(req.query.method)
    const startDate = str(req.query.startDate)
    const endDate   = str(req.query.endDate)

    const payments = await prisma.payment.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(method    ? { method: method as any } : {}),
        ...(startDate || endDate ? {
          date: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate   ? { lte: new Date(endDate)   } : {}),
          },
        } : {}),
      },
      include: {
        project:    { select: { id: true, name: true, clientName: true } },
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    })

    res.json(payments)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/payments ────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = paymentSchema.parse(req.body)

    const project = await prisma.project.findFirst({
      where: { id: data.projectId, deletedAt: null },
    })
    if (!project) { res.status(404).json({ message: 'Project not found' }); return }

    const payment = await prisma.$transaction(async (tx) => {
      const pay = await tx.payment.create({
        data: {
          amount:      data.amount,
          date:        new Date(data.date),
          method:      data.method,
          notes:       data.notes ?? null,
          projectId:   data.projectId,
          recordedById: req.user!.id,
        },
        include: { project: { select: { id: true, name: true, clientName: true } } },
      })

      // Auto-create capital income entry
      await tx.capitalEntry.create({
        data: {
          amount:      data.amount,
          type:        'income',
          note:        `Payment received — ${project.name}`,
          date:        new Date(data.date),
          projectId:   data.projectId,
          recordedById: req.user!.id,
        },
      })

      return pay
    })

    res.status(201).json(payment)
  } catch (err) {
    next(err)
  }
})

export default router
