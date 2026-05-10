import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { str } from '../lib/query'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const entrySchema = z.object({
  amount:    z.number().positive(),
  type:      z.enum(['income', 'deposit', 'expense', 'purchase', 'withdrawal', 'transfer']),
  note:      z.string().nullable().optional(),
  date:      z.string(),
  projectId: z.number().int().nullable().optional(),
})

// ── GET /api/capital ──────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const type      = str(req.query.type)
    const startDate = str(req.query.startDate)
    const endDate   = str(req.query.endDate)

    const entries = await prisma.capitalEntry.findMany({
      where: {
        ...(type ? { type: type as any } : {}),
        ...(startDate || endDate ? {
          date: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate   ? { lte: new Date(endDate)   } : {}),
          },
        } : {}),
      },
      include: {
        project:    { select: { id: true, name: true } },
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    })

    const INFLOW  = ['income', 'deposit']
    const OUTFLOW = ['expense', 'purchase', 'withdrawal']

    const totalInflow  = entries.filter(e => INFLOW.includes(e.type)) .reduce((s, e) => s + Number(e.amount), 0)
    const totalOutflow = entries.filter(e => OUTFLOW.includes(e.type)).reduce((s, e) => s + Number(e.amount), 0)

    res.json({
      balance:      totalInflow - totalOutflow,
      totalInflow,
      totalOutflow,
      entries,
    })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/capital ─────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = entrySchema.parse(req.body)

    const entry = await prisma.capitalEntry.create({
      data: {
        amount:      data.amount,
        type:        data.type,
        note:        data.note ?? null,
        date:        new Date(data.date),
        projectId:   data.projectId ?? null,
        recordedById: req.user!.id,
      },
      include: { project: { select: { id: true, name: true } } },
    })

    res.status(201).json(entry)
  } catch (err) {
    next(err)
  }
})

export default router
