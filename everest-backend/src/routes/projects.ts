import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { str, num } from '../lib/query'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const projectSchema = z.object({
  name:          z.string().min(1),
  clientName:    z.string().min(1),
  clientPhone:   z.string().nullable().optional(),
  clientAddress: z.string().nullable().optional(),
  totalValue:    z.number().positive(),
  firstPayment:  z.number().min(0).default(0),
  status:        z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).default('pending'),
  progressMode:  z.enum(['percentage', 'contract_items']).default('percentage'),
  progressPct:   z.number().min(0).max(100).default(0),
  needsDetails:  z.boolean().default(false),
  startDate:     z.string().nullable().optional(),
  endDate:       z.string().nullable().optional(),
  notes:         z.string().nullable().optional(),
  workshopId:    z.number().int().nullable().optional(),
})

// ── GET /api/projects ─────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = str(req.query.status)
    const search = str(req.query.search)

    const projects = await prisma.project.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as any } : {}),
        ...(search  ? { OR: [
          { name:       { contains: search, mode: 'insensitive' } },
          { clientName: { contains: search, mode: 'insensitive' } },
        ]} : {}),
      },
      include: {
        payments:      true,
        expenses:      true,
        contractItems: { orderBy: { order: 'asc' } },
        contract:      true,
        workshop:      { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = projects.map(p => ({
      ...p,
      totalReceived: p.payments.reduce((s, pay) => s + Number(pay.amount), 0),
      totalExpenses: p.expenses.reduce((s, exp) => s + Number(exp.amount), 0),
    }))

    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/projects/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10)

    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        payments:         { orderBy: { date: 'desc' } },
        expenses:         { orderBy: { date: 'desc' } },
        materialUsages:   { include: { material: true }, orderBy: { date: 'desc' } },
        workerAssignments:{ include: { worker: true },   orderBy: { date: 'desc' } },
        contractItems:    { orderBy: { order: 'asc' } },
        contract:         true,
        workshop:         true,
        createdBy:        { select: { id: true, name: true } },
      },
    })

    if (!project) { res.status(404).json({ message: 'Project not found' }); return }

    res.json({
      ...project,
      totalReceived: project.payments.reduce((s, p) => s + Number(p.amount), 0),
      totalExpenses: project.expenses.reduce((s, e) => s + Number(e.amount), 0),
    })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/projects ────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = projectSchema.parse(req.body)
    const today = new Date()

    const project = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: {
          name:          data.name,
          clientName:    data.clientName,
          clientPhone:   data.clientPhone ?? null,
          clientAddress: data.clientAddress ?? null,
          totalValue:    data.totalValue,
          firstPayment:  data.firstPayment,
          status:        data.status,
          progressMode:  data.progressMode,
          progressPct:   data.progressPct,
          needsDetails:  data.needsDetails,
          startDate:     data.startDate ? new Date(data.startDate) : null,
          endDate:       data.endDate   ? new Date(data.endDate)   : null,
          notes:         data.notes ?? null,
          workshopId:    data.workshopId ?? null,
          createdById:   req.user!.id,
        },
      })

      // Auto-create first payment + capital entry
      if (data.firstPayment > 0) {
        await tx.payment.create({
          data: {
            amount:      data.firstPayment,
            date:        today,
            method:      'cash',
            notes:       'First payment',
            projectId:   proj.id,
            recordedById: req.user!.id,
          },
        })

        await tx.capitalEntry.create({
          data: {
            amount:      data.firstPayment,
            type:        'income',
            note:        `First payment — ${data.name}`,
            date:        today,
            projectId:   proj.id,
            recordedById: req.user!.id,
          },
        })
      }

      return proj
    })

    res.status(201).json(project)
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/projects/:id ─────────────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id   = parseInt(req.params.id, 10)
    const data = projectSchema.partial().parse(req.body)

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
        endDate:   data.endDate   !== undefined ? (data.endDate   ? new Date(data.endDate)   : null) : undefined,
      },
    })

    res.json(project)
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/projects/:id (soft delete) ────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10)
    await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } })
    res.json({ message: 'Project deleted' })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/projects/:id/contract-items ────────────────────────────────────
router.post('/:id/contract-items', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params.id, 10)
    const { title, order } = z.object({
      title: z.string().min(1),
      order: z.number().int().optional(),
    }).parse(req.body)

    const item = await prisma.contractItem.create({
      data: { projectId, title, isDone: false, order: order ?? 0 },
    })
    res.status(201).json(item)
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/projects/:id/contract-items/:itemId ────────────────────────────
router.patch('/:id/contract-items/:itemId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.itemId)
    const { isDone } = z.object({ isDone: z.boolean() }).parse(req.body)
    const item = await prisma.contractItem.update({ where: { id }, data: { isDone } })
    res.json(item)
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/projects/:id/progress ─────────────────────────────────────────
router.patch('/:id/progress', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { progressPct } = z.object({ progressPct: z.number().min(0).max(100) }).parse(req.body)
    const project = await prisma.project.update({ where: { id }, data: { progressPct } })
    res.json(project)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/projects/:id/contract ──────────────────────────────────────────
// Saves contract metadata (URL from Supabase Storage) to the database.
router.post('/:id/contract', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params.id, 10)
    const data = z.object({
      fileUrl:  z.string().url(),
      fileName: z.string().min(1),
      fileSize: z.string().optional(),
      fileType: z.string().optional(),
    }).parse(req.body)

    const contract = await prisma.contract.upsert({
      where:  { projectId },
      create: { projectId, ...data, uploadedById: req.user!.id },
      update: { ...data, uploadedById: req.user!.id },
    })

    res.status(201).json(contract)
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/projects/:id/contract ─────────────────────────────────────────
router.delete('/:id/contract', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params.id, 10)
    await prisma.contract.delete({ where: { projectId } })
    res.json({ message: 'Contract deleted' })
  } catch (err) {
    next(err)
  }
})

export default router
