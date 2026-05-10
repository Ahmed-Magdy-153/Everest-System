import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { str } from '../lib/query'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const workerSchema = z.object({
  name:      z.string().min(1),
  phone:     z.string().nullable().optional(),
  role:      z.enum(['carpenter','painter','electrician','plumber','welder','upholsterer','installer','supervisor','driver','other']).default('other'),
  dailyRate: z.number().positive().nullable().optional(),
  status:    z.enum(['active', 'inactive']).default('active'),
  notes:     z.string().nullable().optional(),
  color:     z.string().nullable().optional(),
  avatar:    z.string().nullable().optional(),
})

const workshopSchema = z.object({
  name:     z.string().min(1),
  location: z.string().nullable().optional(),
  phone:    z.string().nullable().optional(),
  contact:  z.string().nullable().optional(),
  status:   z.enum(['active', 'inactive']).default('active'),
  notes:    z.string().nullable().optional(),
})

const assignmentSchema = z.object({
  workerId:  z.number().int().positive(),
  projectId: z.number().int().positive(),
  amount:    z.number().positive(),
  date:      z.string(),
  status:    z.enum(['pending', 'paid', 'cancelled']).default('pending'),
  notes:     z.string().nullable().optional(),
})

// ── GET /api/workers ──────────────────────────────────────────────────────────
router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [workers, workshops] = await Promise.all([
      prisma.worker.findMany({ orderBy: { name: 'asc' } }),
      prisma.workshop.findMany({ orderBy: { name: 'asc' } }),
    ])
    res.json({ workers, workshops })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/workers/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id   = parseInt(req.params.id, 10)
    const type = str(req.query.type)

    if (type === 'workshop') {
      const ws = await prisma.workshop.findUnique({
        where:   { id },
        include: { projects: { select: { id: true, name: true, status: true } } },
      })
      if (!ws) { res.status(404).json({ message: 'Workshop not found' }); return }
      return res.json(ws)
    }

    const worker = await prisma.worker.findUnique({
      where:   { id },
      include: {
        assignments: {
          include:  { project: { select: { id: true, name: true } } },
          orderBy:  { date: 'desc' },
        },
      },
    })
    if (!worker) { res.status(404).json({ message: 'Worker not found' }); return }
    res.json(worker)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/workers ─────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { workerType, ...body } = req.body

    if (workerType === 'workshop') {
      const data = workshopSchema.parse(body)
      const ws   = await prisma.workshop.create({ data })
      return res.status(201).json({ ...ws, workerType: 'workshop' })
    }

    const data   = workerSchema.parse(body)
    const worker = await prisma.worker.create({ data })
    res.status(201).json({ ...worker, workerType: 'worker' })
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/workers/:id ──────────────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id               = parseInt(req.params.id, 10)
    const { workerType, ...body } = req.body

    if (workerType === 'workshop') {
      const data = workshopSchema.partial().parse(body)
      const ws   = await prisma.workshop.update({ where: { id }, data })
      return res.json({ ...ws, workerType: 'workshop' })
    }

    const data   = workerSchema.partial().parse(body)
    const worker = await prisma.worker.update({ where: { id }, data })
    res.json({ ...worker, workerType: 'worker' })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/workers/:id ───────────────────────────────────────────────────
// FIX: type param is now required. Previously, omitting ?type= silently deleted
// from the Worker table regardless of what the ID referred to (workshop or worker),
// making it trivial to destroy the wrong record. Now returns 400 if type is absent.
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id   = parseInt(req.params.id, 10)
    const type = str(req.query.type)

    if (type !== 'worker' && type !== 'workshop') {
      res.status(400).json({ message: "Query param 'type' is required and must be 'worker' or 'workshop'" })
      return
    }

    if (type === 'workshop') {
      await prisma.workshop.delete({ where: { id } })
    } else {
      await prisma.worker.delete({ where: { id } })
    }

    res.json({ message: 'Deleted successfully' })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/workers/assignments ─────────────────────────────────────────────
router.post('/assignments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = assignmentSchema.parse(req.body)

    const assignment = await prisma.workerAssignment.create({
      data: {
        workerId:    data.workerId,
        projectId:   data.projectId,
        amount:      data.amount,
        date:        new Date(data.date),
        status:      data.status,
        notes:       data.notes ?? null,
        recordedById: req.user!.id,
      },
      include: {
        worker:  { select: { id: true, name: true, role: true } },
        project: { select: { id: true, name: true } },
      },
    })

    res.status(201).json(assignment)
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/workers/assignments/:id ────────────────────────────────────────
router.patch('/assignments/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id     = parseInt(req.params.id, 10)
    const { status } = z.object({
      status: z.enum(['pending', 'paid', 'cancelled']),
    }).parse(req.body)

    const assignment = await prisma.workerAssignment.update({
      where: { id },
      data:  { status },
    })
    res.json(assignment)
  } catch (err) {
    next(err)
  }
})

export default router
