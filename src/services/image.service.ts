import { prisma } from '../prisma.js'
import { ApiError } from '../middleware/error.middleware.js'
import type { AuthUser } from './auth.service.js'
import {
  assertOwnerOrAdmin,
  getPropertyOr404,
} from './property.service.js'
import type {
  CreateImageInput,
  ReorderImagesInput,
} from '../validation/image.schema.js'

export async function addImage(
  user: AuthUser,
  propertyId: string,
  input: CreateImageInput,
) {
  const property = await getPropertyOr404(propertyId)
  assertOwnerOrAdmin(user, property.ownerId)

  return prisma.$transaction(async (tx) => {
    const existingCount = await tx.propertyImage.count({
      where: { propertyId },
    })
    const displayOrder = input.displayOrder ?? existingCount + 1

    if (displayOrder < 1 || displayOrder > existingCount + 1) {
      throw new ApiError(
        400,
        `displayOrder must be between 1 and ${existingCount + 1}`,
      )
    }

    await tx.propertyImage.updateMany({
      where: { propertyId, displayOrder: { gte: displayOrder } },
      data: { displayOrder: { increment: 1 } },
    })

    return tx.propertyImage.create({
      data: {
        propertyId,
        imageUrl: input.imageUrl,
        displayOrder,
      },
    })
  })
}

export async function listImages(propertyId: string) {
  await getPropertyOr404(propertyId)
  return prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: { displayOrder: 'asc' },
  })
}

export async function deleteImage(
  user: AuthUser,
  propertyId: string,
  imageId: string,
) {
  const property = await getPropertyOr404(propertyId)
  assertOwnerOrAdmin(user, property.ownerId)

  const image = await prisma.propertyImage.findFirst({
    where: { id: imageId, propertyId },
  })
  if (!image) {
    throw new ApiError(404, 'Image not found')
  }

  return prisma.$transaction(async (tx) => {
    await tx.propertyImage.delete({ where: { id: imageId } })

    const remaining = await tx.propertyImage.findMany({
      where: { propertyId },
      orderBy: { displayOrder: 'asc' },
    })
    for (let i = 0; i < remaining.length; i++) {
      const expectedOrder = i + 1
      if (remaining[i].displayOrder !== expectedOrder) {
        await tx.propertyImage.update({
          where: { id: remaining[i].id },
          data: { displayOrder: expectedOrder },
        })
      }
    }

    return tx.propertyImage.findMany({
      where: { propertyId },
      orderBy: { displayOrder: 'asc' },
    })
  })
}

export async function reorderImages(
  user: AuthUser,
  propertyId: string,
  input: ReorderImagesInput,
) {
  const property = await getPropertyOr404(propertyId)
  assertOwnerOrAdmin(user, property.ownerId)

  const existing = await prisma.propertyImage.findMany({
    where: { propertyId },
    select: { id: true },
  })
  const existingIds = new Set(existing.map((image) => image.id))
  const incoming = input.imageIds
  const uniqueIncoming = new Set(incoming)

  const isExactPermutation =
    incoming.length === existingIds.size &&
    uniqueIncoming.size === incoming.length &&
    incoming.every((id) => existingIds.has(id))

  if (!isExactPermutation) {
    throw new ApiError(
      400,
      'imageIds must contain each of the property image ids exactly once',
    )
  }

  return prisma.$transaction(async (tx) => {
    for (let i = 0; i < incoming.length; i++) {
      await tx.propertyImage.update({
        where: { id: incoming[i] },
        data: { displayOrder: i + 1 },
      })
    }

    return tx.propertyImage.findMany({
      where: { propertyId },
      orderBy: { displayOrder: 'asc' },
    })
  })
}
