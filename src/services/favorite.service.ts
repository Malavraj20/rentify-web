import { prisma } from '../prisma.js'
import { ApiError } from '../middleware/error.middleware.js'
import type { AuthUser } from './auth.service.js'

const ownerSelect = { id: true, name: true } as const

const propertyInclude = {
  owner: { select: ownerSelect },
  images: { orderBy: { displayOrder: 'asc' as const } },
} as const

export async function listFavorites(user: AuthUser) {
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      property: { include: propertyInclude },
    },
  })
  return favorites
}

export async function addFavorite(user: AuthUser, propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, status: true },
  })
  if (!property) {
    throw new ApiError(404, 'Property not found')
  }
  if (property.status !== 'active') {
    throw new ApiError(400, 'Only active properties can be favorited')
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_propertyId: { userId: user.id, propertyId } },
  })
  if (existing) {
    throw new ApiError(409, 'Property is already in your favorites')
  }

  return prisma.favorite.create({
    data: { userId: user.id, propertyId },
    include: { property: { include: propertyInclude } },
  })
}

export async function removeFavorite(user: AuthUser, propertyId: string) {
  const deleted = await prisma.favorite.deleteMany({
    where: { userId: user.id, propertyId },
  })
  if (deleted.count === 0) {
    throw new ApiError(404, 'Favorite not found')
  }
  return { removed: true }
}
