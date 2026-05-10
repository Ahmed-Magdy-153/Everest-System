import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import authRoutes      from './routes/auth'
import projectRoutes   from './routes/projects'
import inventoryRoutes from './routes/inventory'
import capitalRoutes   from './routes/capital'
import expenseRoutes   from './routes/expenses'
import workerRoutes    from './routes/workers'
import paymentRoutes   from './routes/payments'
import { errorHandler } from './middleware/error'

const app = express()

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet())

// ── CORS — supports comma-separated list of allowed origins ───────────────────
// Development:   CORS_ORIGIN=http://localhost:3000
// Production:    CORS_ORIGIN=https://everest-system.vercel.app
// Multiple:      CORS_ORIGIN=https://everest-system.vercel.app,https://custom-domain.com
const rawOrigins = process.env.CORS_ORIGIN ?? 'http://localhost:3000'
const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin '${origin}' is not allowed`))
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Prisma Decimal → JSON string serialisation ────────────────────────────────
app.set('json replacer', (_key: string, value: unknown) => {
  if (value !== null && typeof value === 'object' && (value as any).constructor?.name === 'Decimal')
    return String(value)
  return value
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes)
app.use('/api/projects',  projectRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/capital',   capitalRoutes)
app.use('/api/expenses',  expenseRoutes)
app.use('/api/workers',   workerRoutes)
app.use('/api/payments',  paymentRoutes)

// ── Health check (used by Railway / Render for uptime monitoring) ─────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date().toISOString() })
})

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }))

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler)

export default app
