import { prisma } from '../prisma.js'
import { MIN_PROPERTY_IMAGES } from '../constants.js'
import { ApiError } from '../middleware/error.middleware.js'
import type { AuthUser } from './auth.service.js'
import type {
  CreatePropertyInput,
  PropertyQueryInput,
  UpdatePropertyInput,
} from '../validation/property.schema.js'
import type { Prisma } from '@prisma/client'

const ownerSelect = { id: true, name: true } as const

const propertyInclude = {
  owner: { select: ownerSelect },
  images: { orderBy: { displayOrder: 'asc' as const } },
} as const

function assertLiveListingHasMinImages(
  status: 'draft' | 'active' | undefined,
  imageCount: number,
): void {
  const resolved = status ?? 'draft'
  if (resolved === 'active' && imageCount < MIN_PROPERTY_IMAGES) {
    throw new ApiError(
      400,
      `A listing must include at least ${MIN_PROPERTY_IMAGES} images before it can go live`,
    )
  }
}

export function assertOwnerOrAdmin(user: AuthUser, ownerId: string): void {
  if (user.role !== 'ADMIN' && user.id !== ownerId) {
    throw new ApiError(
      403,
      'You do not have permission to modify this property',
    )
  }
}

export async function getPropertyOr404(id: string) {
  const property = await prisma.property.findUnique({ where: { id } })
  if (!property) {
    throw new ApiError(404, 'Property not found')
  }
  return property
}

export async function createProperty(
  user: AuthUser,
  input: CreatePropertyInput,
) {
  const { images = [], status = 'draft', ...propertyFields } = input
  assertLiveListingHasMinImages(status, images.length)

  return prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        ...propertyFields,
        amenities: propertyFields.amenities ?? [],
        available: propertyFields.available ?? true,
        ownerId: user.id,
        status,
        images: {
          create: images.map((imageUrl, index) => ({
            imageUrl,
            displayOrder: index + 1,
          })),
        },
      },
      include: propertyInclude,
    })
    return property
  })
}

function buildPublicPropertyWhere(query: PropertyQueryInput): Prisma.PropertyWhereInput {
  const and: Prisma.PropertyWhereInput[] = [{ status: 'active' }]

  if (query.search) {
    const term = query.search
    and.push({
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { state: { contains: term, mode: 'insensitive' } },
      ],
    })
  }

  if (query.location) {
    const term = query.location
    and.push({
      OR: [
        { location: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
      ],
    })
  }

  if (query.city) {
    and.push({ city: { contains: query.city, mode: 'insensitive' } })
  }

  if (query.listingFor === 'rent') {
    and.push({ listingFor: { in: ['rent', 'both'] } })
  } else if (query.listingFor === 'sale') {
    and.push({ listingFor: { in: ['sale', 'both'] } })
  } else if (query.listingFor === 'both') {
    and.push({ listingFor: 'both' })
  }

  if (query.type) {
    and.push({ type: { equals: query.type, mode: 'insensitive' } })
  }

  const useSellingPriceForRange = query.listingFor === 'sale'

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const range: Prisma.IntFilter<'Property'> | Prisma.IntNullableFilter<'Property'> = {}
    if (query.minPrice !== undefined) range.gte = query.minPrice
    if (query.maxPrice !== undefined) range.lte = query.maxPrice
    if (useSellingPriceForRange) {
      and.push({ sellingPrice: range as Prisma.IntNullableFilter<'Property'> })
    } else {
      and.push({ price: range as Prisma.IntFilter<'Property'> })
    }
  }

  if (query.minSellingPrice !== undefined || query.maxSellingPrice !== undefined) {
    const range: Prisma.IntNullableFilter<'Property'> = {}
    if (query.minSellingPrice !== undefined) range.gte = query.minSellingPrice
    if (query.maxSellingPrice !== undefined) range.lte = query.maxSellingPrice
    and.push({ sellingPrice: range })
  }

  if (query.bedrooms !== undefined) {
    if (query.bedrooms === 0) {
      and.push({ bedrooms: 0 })
    } else {
      and.push({ bedrooms: { gte: query.bedrooms } })
    }
  }

  if (query.bathrooms !== undefined) {
    and.push({ bathrooms: { gte: query.bathrooms } })
  }

  if (query.furnishing) {
    and.push({ furnishing: { equals: query.furnishing, mode: 'insensitive' } })
  }

  if (query.available !== undefined) {
    and.push({ available: query.available })
  }

  return { AND: and }
}

export async function listProperties(query: PropertyQueryInput) {
  const { page, limit } = query
  const where = buildPublicPropertyWhere(query)
  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: propertyInclude,
    }),
  ])

  return {
    properties,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}

export async function getPropertyById(id: string) {
  const property = await prisma.property.findUnique({
    where: { id },
    include: propertyInclude,
  })
  if (!property || property.status !== 'active') {
    throw new ApiError(404, 'Property not found')
  }
  return property
}

export async function listMyProperties(user: AuthUser) {
  const where = user.role === 'ADMIN' ? {} : { ownerId: user.id }
  return prisma.property.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: propertyInclude,
  })
}

export async function updateProperty(
  user: AuthUser,
  id: string,
  input: UpdatePropertyInput,
) {
  const property = await getPropertyOr404(id)
  assertOwnerOrAdmin(user, property.ownerId)

  const { images, status, ...fields } = input

  if (images !== undefined) {
    assertLiveListingHasMinImages(status ?? property.status, images.length)
  } else if (status === 'active') {
    const count = await prisma.propertyImage.count({
      where: { propertyId: id },
    })
    assertLiveListingHasMinImages('active', count)
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id },
      data: {
        ...fields,
        ...(status !== undefined ? { status } : {}),
      },
    })

    if (images !== undefined) {
      await tx.propertyImage.deleteMany({ where: { propertyId: id } })
      if (images.length > 0) {
        await tx.propertyImage.createMany({
          data: images.map((imageUrl, index) => ({
            propertyId: id,
            imageUrl,
            displayOrder: index + 1,
          })),
        })
      }
    }

    return tx.property.findUnique({
      where: { id },
      include: propertyInclude,
    })
  })

  if (!result) {
    throw new ApiError(404, 'Property not found')
  }
  return result
}

export async function deleteProperty(user: AuthUser, id: string) {
  const property = await getPropertyOr404(id)
  assertOwnerOrAdmin(user, property.ownerId)

  await prisma.property.delete({ where: { id } })
}

export async function publishProperty(user: AuthUser, id: string) {
  const property = await prisma.property.findUnique({
    where: { id },
    include: propertyInclude,
  })
  if (!property) {
    throw new ApiError(404, 'Property not found')
  }
  assertOwnerOrAdmin(user, property.ownerId)

  if (property.status === 'active') {
    return { property, alreadyPublished: true }
  }

  const imageCount = await prisma.propertyImage.count({
    where: { propertyId: id },
  })

  if (imageCount < MIN_PROPERTY_IMAGES) {
    throw new ApiError(
      400,
      `Property must have at least ${MIN_PROPERTY_IMAGES} images before publishing (currently has ${imageCount})`,
    )
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { status: 'active' },
    include: propertyInclude,
  })

  return { property: updated, alreadyPublished: false }
}
