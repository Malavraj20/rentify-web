import type { Role } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { toApiRole } from './auth.service.js'
import type { AdminUsersQueryInput } from '../validation/auth.schema.js'

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  preferredLocation: true,
  budget: true,
  preferredBedrooms: true,
  createdAt: true,
  updatedAt: true,
} as const

function buildAdminUsersWhere(
  query: AdminUsersQueryInput,
): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = []

  if (query.role) {
    and.push({ role: query.role.toLowerCase() as Role })
  }

  const search = query.search?.trim()
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    })
  }

  return and.length > 0 ? { AND: and } : {}
}

export async function listAdminUsers(query: AdminUsersQueryInput) {
  const { page, limit } = query
  const where = buildAdminUsersWhere(query)

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: adminUserSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return {
    users: users.map((entry) => ({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      phone: entry.phone ?? undefined,
      role: toApiRole(entry.role),
      preferredLocation: entry.preferredLocation ?? undefined,
      budget: entry.budget ?? undefined,
      preferredBedrooms: entry.preferredBedrooms ?? undefined,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}
