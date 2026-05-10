import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

// Express 5 types req.params values as string | string[].
// Declare params as Record<string, string> so route handlers can use req.params.id safely.
export interface AuthRequest extends Request {
  params: Record<string, string>
  user?: {
    id:          number
    name:        string
    email:       string
    roleName:    string
    permissions: Record<string, boolean>
  }
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' })
    return
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number }

    const user = await prisma.user.findUnique({
      where:   { id: payload.userId },
      include: { role: true },
    })

    if (!user || user.status !== 'active') {
      res.status(401).json({ message: 'Account inactive or not found' })
      return
    }

    req.user = {
      id:          user.id,
      name:        user.name,
      email:       user.email,
      roleName:    user.role.name,
      permissions: user.role.permissions as Record<string, boolean>,
    }

    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}
