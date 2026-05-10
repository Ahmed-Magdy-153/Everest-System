import { Router, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { str, num } from '../lib/query'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const materialSchema = z.object({
  name:              z.string().min(1),
  type:              z.enum(['plywood','kabs','glue','qashat','atab','wood_structure','metals','finish','labor','paints','glass','upholstery','fabrics','accessories','miscellaneous','other']),
  quantity:          z.number().min(0),
  unit:              z.enum(['meter','piece','kg','liter','sqm','sheet','roll','box']),
  costPerUnit:       z.number().positive(),
  lowStockThreshold: z.number().min(0).default(0),
  supplier:          z.string().nullable().optional(),
  notes:             z.string().nullable().optional(),
})

// ── GET /api/inventory/logs ───────────────────────────────────────────────────
// Must be BEFORE /:id to avoid "logs" being treated as an id
router.get('/logs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const materialId = num(req.query.materialId)
    const limit      = num(req.query.limit)

    const logs = await prisma.inventoryLog.findMany({
      where: materialId ? { materialId } : {},
      include: {
        material:    { select: { id: true, name: true, unit: true } },
        performedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take:    limit ?? 100,
    })

    res.json(logs)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/inventory ────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const type     = str(req.query.type)
    const search   = str(req.query.search)
    const lowStock = str(req.query.lowStock)

    let materials = await prisma.material.findMany({
      where: {
        ...(type   ? { type: type as any } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    })

    if (lowStock === 'true') {
      materials = materials.filter(m => Number(m.quantity) <= Number(m.lowStockThreshold))
    }

    res.json(materials)
  } catch (err) {
    next(err)
  }
})

// ── GET /api/inventory/:id ────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10)

    const material = await prisma.material.findUnique({
      where:   { id },
      include: {
        inventoryLogs: {
          orderBy: { createdAt: 'desc' },
          take:    50,
          include: { performedBy: { select: { id: true, name: true } } },
        },
      },
    })

    if (!material) { res.status(404).json({ message: 'Material not found' }); return }
    res.json(material)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/inventory ───────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data     = materialSchema.parse(req.body)
    const purchase = req.query.purchase === 'true'
    const today    = new Date()

    const material = await prisma.$transaction(async (tx) => {
      const mat = await tx.material.create({ data })

      await tx.inventoryLog.create({
        data: {
          materialId:     mat.id,
          action:         purchase ? 'purchase' : 'added',
          quantityBefore: 0,
          quantityAfter:  data.quantity,
          costPerUnit:    data.costPerUnit,
          totalCost:      purchase ? data.quantity * data.costPerUnit : null,
          date:           today,
          performedById:  req.user!.id,
        },
      })

      if (purchase && data.quantity > 0) {
        await tx.capitalEntry.create({
          data: {
            amount:      data.quantity * data.costPerUnit,
            type:        'purchase',
            note:        `Purchase: ${data.name} × ${data.quantity}`,
            date:        today,
            recordedById: req.user!.id,
          },
        })
      }

      return mat
    })

    res.status(201).json(material)
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/inventory/:id ────────────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id   = parseInt(req.params.id, 10)
    const data = materialSchema.partial().parse(req.body)

    const material = await prisma.material.update({ where: { id }, data })
    res.json(material)
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/inventory/:id ─────────────────────────────────────────────────
// FIX: MaterialUsage and InventoryLog both have non-cascading FKs to Material.
// We delete dependent rows inside the transaction before removing the material,
// avoiding the P2003 FK constraint crash that occurred previously.
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id  = parseInt(req.params.id, 10)
    const mat = await prisma.material.findUnique({ where: { id } })
    if (!mat) { res.status(404).json({ message: 'Material not found' }); return }

    await prisma.$transaction(async (tx) => {
      // Remove FK-dependent records first (order matters)
      await tx.materialUsage.deleteMany({ where: { materialId: id } })
      await tx.inventoryLog.deleteMany({ where: { materialId: id } })
      // Safe to delete the material now — no dangling FKs
      await tx.material.delete({ where: { id } })
    })

    res.json({ message: 'Material deleted' })
  } catch (err) {
    next(err)
  }
})

// ── POST /api/inventory/:id/increase ─────────────────────────────────────────
router.post('/:id/increase', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { qty, cost, notes, withCapital } = z.object({
      qty:         z.number().positive(),
      cost:        z.number().positive(),
      notes:       z.string().optional(),
      withCapital: z.boolean().default(false),
    }).parse(req.body)

    const mat = await prisma.material.findUnique({ where: { id } })
    if (!mat) { res.status(404).json({ message: 'Material not found' }); return }

    const before = Number(mat.quantity)
    const after  = before + qty
    const today  = new Date()

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.material.update({
        where: { id },
        data:  { quantity: after, costPerUnit: cost },
      })

      await tx.inventoryLog.create({
        data: {
          materialId:     id,
          action:         withCapital ? 'purchase' : 'increased',
          quantityBefore: before,
          quantityAfter:  after,
          costPerUnit:    cost,
          totalCost:      withCapital ? qty * cost : null,
          notes:          notes ?? null,
          date:           today,
          performedById:  req.user!.id,
        },
      })

      if (withCapital) {
        await tx.capitalEntry.create({
          data: {
            amount:      qty * cost,
            type:        'purchase',
            note:        `Restock: ${mat.name} +${qty}`,
            date:        today,
            recordedById: req.user!.id,
          },
        })
      }

      return result
    })

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/inventory/:id/decrease ─────────────────────────────────────────
router.post('/:id/decrease', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { qty, projectId, notes } = z.object({
      qty:       z.number().positive(),
      projectId: z.number().int().optional(),
      notes:     z.string().optional(),
    }).parse(req.body)

    const mat = await prisma.material.findUnique({ where: { id } })
    if (!mat) { res.status(404).json({ message: 'Material not found' }); return }
    if (Number(mat.quantity) < qty) { res.status(400).json({ message: 'Insufficient stock' }); return }

    const before  = Number(mat.quantity)
    const after   = before - qty
    const today   = new Date()
    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
      : null

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.material.update({ where: { id }, data: { quantity: after } })

      await tx.inventoryLog.create({
        data: {
          materialId:     id,
          action:         projectId ? 'sent_to_project' : 'decreased',
          quantityBefore: before,
          quantityAfter:  after,
          costPerUnit:    mat.costPerUnit,
          totalCost:      qty * Number(mat.costPerUnit),
          projectId:      projectId ?? null,
          projectName:    project?.name ?? null,
          notes:          notes ?? null,
          date:           today,
          performedById:  req.user!.id,
        },
      })

      return result
    })

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

export default router
