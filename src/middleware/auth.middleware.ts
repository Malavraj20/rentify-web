import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../prisma.js'
import {
  toApiRole,
  verifyToken,
  type AuthUser,
} from '../services/auth.service.js'
import { ApiError } from './error.middleware.js'

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required')
    }

    const token = header.slice('Bearer '.length).trim()
    if (!token) {
      throw new ApiError(401, 'Authentication required')
    }

    const userId = verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new ApiError(401, 'Invalid or expired authentication token')
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: toApiRole(user.role),
      phone: user.phone,
      createdAt: user.createdAt,
    }

    next()
  } catch (error) {
    next(error)
  }
}
