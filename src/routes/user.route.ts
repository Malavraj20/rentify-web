import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { prisma } from '../prisma.js'
import { toApiRole } from '../services/auth.service.js'

export const userRouter = Router()

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  preferredLocation: true,
  budget: true,
  preferredBedrooms: true,
  createdAt: true,
} as const

userRouter.get('/', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: 'desc' },
  })

  res.status(200).json({
    users: users.map((entry) => ({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      role: toApiRole(entry.role),
      phone: entry.phone ?? undefined,
      preferredLocation: entry.preferredLocation ?? undefined,
      budget: entry.budget ?? undefined,
      preferredBedrooms: entry.preferredBedrooms ?? undefined,
      createdAt: entry.createdAt,
    })),
  })
})
