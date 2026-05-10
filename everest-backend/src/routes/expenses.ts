import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { str, num } from '../lib/query'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const expenseSchema = z.object({
  title:     z.string().min(1),
  amount:    z.number().positive(),
  category:  z.enum(['materials', 'labor', 'workshop', 'transportation', 'utilities', 'monthly', 'other']),
  date:      z.string(),
  paidTo:    z.string().nullable().optional(),
  notes:     z.string().nullable().optional(),
  projectId: z.number().int().nullable().optional(),
})

// ── GET /api/expenses ─────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = num(req.query.projectId)
    const category  = str(req.query.category)
    const startDate = str(req.query.startDate)
    const endDate   = str(req.query.endDate)

    const expenses = await prisma.expense.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(category  ? { category: category as any } : {}),
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

    res.json(expenses)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/expenses ────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = expenseSchema.parse(req.body)

    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          title:       data.title,
          amount:      data.amount,
          category:    data.category,
          date:        new Date(data.date),
          paidTo:      data.paidTo   ?? null,
          notes:       data.notes    ?? null,
          projectId:   data.projectId ?? null,
          recordedById: req.user!.id,
        },
        include: { project: { select: { id: true, name: true } } },
      })

      // Auto-create capital outflow entry
      await tx.capitalEntry.create({
        data: {
          amount:      data.amount,
          type:        'expense',
          note:        exp.project ? `${data.title} — ${exp.project.name}` : data.title,
          date:        new Date(data.date),
          projectId:   data.projectId ?? null,
          recordedById: req.user!.id,
        },
      })

      return exp
    })

    res.status(201).json(expense)
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/expenses/:id ─────────────────────────────────────────────────────
// FIX: wraps update in $transaction and syncs the linked CapitalEntry.
// CapitalEntry is matched by (type, amount, date, projectId, note) — the same
// fields written at creation time. If no match is found (e.g. manually removed),
// the expense is still updated; capital drift is flagged via console.warn.
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id   = parseInt(req.params.id, 10)
    const data = expenseSchema.partial().parse(req.body)

    // Fetch current state before updating so we can locate the CapitalEntry
    const existing = await prisma.expense.findUnique({
      where:   { id },
      include: { project: { select: { id: true, name: true } } },
    })
    if (!existing) { res.status(404).json({ message: 'Expense not found' }); return }

    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id },
        data:  { ...data, date: data.date ? new Date(data.date) : undefined },
        include: { project: { select: { id: true, name: true } } },
      })

      // Locate the auto-created CapitalEntry by its original field values
      const oldNote = existing.project
        ? `${existing.title} — ${existing.project.name}`
        : existing.title

      const capEntry = await tx.capitalEntry.findFirst({
        where: {
          type:      'expense',
          amount:    existing.amount,
          date:      existing.date,
          projectId: existing.projectId,
          note:      oldNote,
        },
      })

      if (capEntry) {
        const newNote = updated.project
          ? `${updated.title} — ${updated.project.name}`
          : updated.title

        await tx.capitalEntry.update({
          where: { id: capEntry.id },
          data:  {
            amount: data.amount   ?? capEntry.amount,
            note:   newNote,
            date:   data.date     ? new Date(data.date) : capEntry.date,
          },
        })
      } else {
        console.warn(`[expenses] No matching CapitalEntry found for expense ${id} — balance may drift`)
      }

      return updated
    })

    res.json(expense)
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/expenses/:id ──────────────────────────────────────────────────
// FIX: deletes the linked CapitalEntry in the same transaction so capital
// balance stays consistent. Uses deleteMany (not delete) to be safe if the
// entry was already removed manually.
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10)

    const existing = await prisma.expense.findUnique({
      where:   { id },
      include: { project: { select: { id: true, name: true } } },
    })
    if (!existing) { res.status(404).json({ message: 'Expense not found' }); return }

    await prisma.$transaction(async (tx) => {
      const note = existing.project
        ? `${existing.title} — ${existing.project.name}`
        : existing.title

      // Remove the auto-created CapitalEntry so balance stays accurate
      await tx.capitalEntry.deleteMany({
        where: {
          type:      'expense',
          amount:    existing.amount,
          date:      existing.date,
          projectId: existing.projectId,
          note,
        },
      })

      await tx.expense.delete({ where: { id } })
    })

    res.json({ message: 'Expense deleted' })
  } catch (err) {
    next(err)
  }
})

export default router
