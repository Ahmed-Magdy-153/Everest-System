import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

const isProd = process.env.NODE_ENV === 'production'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Always log full error server-side
  console.error(`[ERROR] ${err.message}`, isProd ? '' : err.stack)

  // Validation errors — safe to expose field details
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed',
      errors:  err.flatten().fieldErrors,
    })
    return
  }

  // Known Prisma errors — expose a safe, mapped message
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const map: Record<string, [number, string]> = {
      P2002: [409, 'A record with this value already exists.'],
      P2025: [404, 'Record not found.'],
      P2003: [409, 'Operation blocked by a related record. Remove dependencies first.'],
      P2014: [400, 'Relation violation — the change would break a required association.'],
    }
    const [status, message] = map[err.code] ?? [400, 'Database request error.']
    res.status(status).json({ message })
    return
  }

  // Prisma connection / timeout errors
  if (err instanceof Prisma.PrismaClientInitializationError ||
      err instanceof Prisma.PrismaClientRustPanicError) {
    res.status(503).json({ message: 'Database unavailable. Please try again.' })
    return
  }

  // In production: never expose raw error messages for 5xx — they may contain
  // internal details (file paths, DB structure, env vars, etc.)
  const status = (err as any).statusCode ?? 500
  if (isProd && status >= 500) {
    res.status(500).json({ message: 'Internal server error' })
    return
  }

  res.status(status).json({ message: err.message || 'Internal server error' })
}
