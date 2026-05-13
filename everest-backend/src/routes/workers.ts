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
  projectId: z.number().int().positive().nullable().optional(),
  amount:    z.number().positive(),
  date:      z.string(),
  status:    z.enum(['pending', 'paid', 'cancelled']).default('pending'),
  notes:     z.string().nullable().optional(),
})

const paySchema = z.object({
  amount:    z.number().positive(),
  date:      z.string(),
  projectId: z.number().int().positive().nullable().optional(),
  notes:     z.string().nullable().optional(),
})

// ── GET /api/workers ──────────────────────────────────────────────────────────
router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [workers, workshops] = await Promise.all([
      prisma.worker.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { assignments: true } },
          assignments: {
            select: { amount: true, date: true },
          },
        },
      }),
      prisma.workshop.findMany({ orderBy: { name: 'asc' } }),
    ])

    const workersWithTotals = workers.map(w => {
      const totalPaid      = w.assignments.reduce((s, a) => s + Number(a.amount), 0)
      const thisMonthPaid  = w.assignments
        .filter(a => new Date(a.date) >= monthStart)
        .reduce((s, a) => s + Number(a.amount), 0)
      const { assignments: _, ...rest } = w
      return { ...rest, totalPaid, thisMonthPaid }
    })

    // Workshop totals: sum expenses with category=workshop and paidTo=workshop.name
    const workshopExpenses = await prisma.expense.findMany({
      where: { category: 'workshop' },
      select: { paidTo: true, amount: true, date: true },
    })

    const workshopsWithTotals = workshops.map(ws => {
      const exps          = workshopExpenses.filter(e => e.paidTo === ws.name)
      const totalPaid     = exps.reduce((s, e) => s + Number(e.amount), 0)
      const thisMonthPaid = exps
        .filter(e => new Date(e.date) >= monthStart)
        .reduce((s, e) => s + Number(e.amount), 0)
      return { ...ws, totalPaid, thisMonthPaid }
    })

    res.json({ workers: workersWithTotals, workshops: workshopsWithTotals })
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

// ── GET /api/workers/:id/payments ────────────────────────────────────────────
router.get('/:id/payments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id   = parseInt(req.params.id, 10)
    const type = str(req.query.type)

    if (type === 'workshop') {
      const ws = await prisma.workshop.findUnique({ where: { id } })
      if (!ws) { res.status(404).json({ message: 'Workshop not found' }); return }
      const expenses = await prisma.expense.findMany({
        where:   { category: 'workshop', paidTo: ws.name },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      })
      res.json(expenses.map(e => ({
        id:      e.id,
        amount:  Number(e.amount),
        date:    e.date,
        project: e.project?.name ?? null,
        notes:   e.notes ?? e.title,
      })))
      return
    }

    const assignments = await prisma.workerAssignment.findMany({
      where:   { workerId: id },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    })
    res.json(assignments.map(a => ({
      id:      a.id,
      amount:  Number(a.amount),
      date:    a.date,
      project: a.project?.name ?? null,
      notes:   a.notes ?? null,
      status:  a.status,
    })))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/workers/:id/pay ─────────────────────────────────────────────────
router.post('/:id/pay', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id   = parseInt(req.params.id, 10)
    const type = str(req.query.type)
    const data = paySchema.parse(req.body)

    if (type === 'workshop') {
      const ws = await prisma.workshop.findUnique({ where: { id } })
      if (!ws) { res.status(404).json({ message: 'Workshop not found' }); return }
      const expense = await prisma.expense.create({
        data: {
          title:        data.notes || `دفعة - ${ws.name}`,
          amount:       data.amount,
          category:     'workshop',
          date:         new Date(data.date),
          paidTo:       ws.name,
          notes:        data.notes ?? null,
          projectId:    data.projectId ?? null,
          recordedById: req.user!.id,
        },
      })
      res.status(201).json({
        id: expense.id, amount: Number(expense.amount),
        date: expense.date, notes: expense.notes,
      })
      return
    }

    const assignment = await prisma.workerAssignment.create({
      data: {
        workerId:    id,
        projectId:   data.projectId ?? undefined,
        amount:      data.amount,
        date:        new Date(data.date),
        status:      'paid',
        notes:       data.notes ?? null,
        recordedById: req.user!.id,
      },
      include: { project: { select: { id: true, name: true } } },
    })
    const proj = (assignment as any).project as { id: number; name: string } | null
    res.status(201).json({
      id:      assignment.id,
      amount:  Number(assignment.amount),
      date:    assignment.date,
      project: proj?.name ?? null,
      notes:   assignment.notes,
      status:  assignment.status,
    })
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
        projectId:   data.projectId ?? undefined,
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
