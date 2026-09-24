import type { BookingStatus } from '@prisma/client'
import { prisma } from '../prisma.js'
import { ApiError } from '../middleware/error.middleware.js'
import type { AuthUser } from './auth.service.js'
import type {
  CreateBookingInput,
  UpdateBookingStatusInput,
} from '../validation/booking.schema.js'

const tenantSelect = { id: true, name: true } as const
const ownerSelect = { id: true, name: true } as const

const bookingInclude = {
  tenant: { select: tenantSelect },
  property: {
    select: {
      id: true,
      title: true,
      location: true,
      ownerId: true,
      owner: { select: ownerSelect },
    },
  },
} as const

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['PENDING', 'APPROVED']

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function serializeBooking(booking: {
  id: string
  date: Date
  time: string
  note: string | null
  status: BookingStatus
  createdAt: Date
  tenant: { id: string; name: string }
  property: {
    id: string
    title: string
    location: string
    ownerId: string
    owner: { id: string; name: string }
  }
}) {
  return {
    id: booking.id,
    date: toDateOnly(booking.date),
    time: booking.time,
    note: booking.note ?? undefined,
    status: booking.status,
    createdAt: toDateOnly(booking.createdAt),
    tenant: booking.tenant,
    property: booking.property,
    propertyId: booking.property.id,
    tenantId: booking.tenant.id,
    ownerId: booking.property.ownerId,
    ownerName: booking.property.owner.name,
    tenantName: booking.tenant.name,
  }
}

export async function listBookings(user: AuthUser) {
  const where =
    user.role === 'ADMIN'
      ? {}
      : user.role === 'OWNER'
        ? { property: { ownerId: user.id } }
        : { tenantId: user.id }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: bookingInclude,
  })
  return bookings.map(serializeBooking)
}

export async function createBooking(user: AuthUser, input: CreateBookingInput) {
  if (user.role !== 'TENANT' && user.role !== 'BUYER') {
    throw new ApiError(403, 'Only tenants and buyers can request bookings')
  }

  const property = await prisma.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true, status: true, ownerId: true },
  })
  if (!property) {
    throw new ApiError(404, 'Property not found')
  }
  if (property.status !== 'active') {
    throw new ApiError(400, 'Only active properties can be booked')
  }
  if (property.ownerId === user.id) {
    throw new ApiError(400, 'You cannot book your own property')
  }

  const duplicate = await prisma.booking.findFirst({
    where: {
      tenantId: user.id,
      propertyId: property.id,
      status: { in: ACTIVE_BOOKING_STATUSES },
    },
    select: { id: true },
  })
  if (duplicate) {
    throw new ApiError(
      409,
      'You already have an active booking request for this property',
    )
  }

  const dateOnly = new Date(`${input.date}T00:00:00.000Z`)
  if (Number.isNaN(dateOnly.getTime())) {
    throw new ApiError(400, 'Invalid booking date')
  }

  const booking = await prisma.booking.create({
    data: {
      propertyId: property.id,
      tenantId: user.id,
      date: dateOnly,
      time: input.time,
      note: input.note,
      status: 'PENDING',
    },
    include: bookingInclude,
  })
  return serializeBooking(booking)
}

async function getBookingOr404(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  })
  if (!booking) {
    throw new ApiError(404, 'Booking not found')
  }
  return booking
}

function assertCanTransition(
  user: AuthUser,
  booking: {
    tenantId: string
    property: { ownerId: string }
    status: BookingStatus
  },
  next: UpdateBookingStatusInput['status'],
): void {
  const isTenant = user.id === booking.tenantId
  const isOwner = user.role === 'ADMIN' || user.id === booking.property.ownerId

  if (next === 'CANCELLED') {
    if (!isTenant) {
      throw new ApiError(403, 'Only the requester can cancel this booking')
    }
    if (booking.status !== 'PENDING' && booking.status !== 'APPROVED') {
      throw new ApiError(400, 'Only pending or approved bookings can be cancelled')
    }
    return
  }

  if (next === 'APPROVED' || next === 'REJECTED' || next === 'COMPLETED') {
    if (!isOwner) {
      throw new ApiError(
        403,
        'Only the property owner can update this booking status',
      )
    }
    if (next === 'APPROVED' || next === 'REJECTED') {
      if (booking.status !== 'PENDING') {
        throw new ApiError(400, 'Only pending bookings can be approved or rejected')
      }
      return
    }
    if (next === 'COMPLETED') {
      if (booking.status !== 'APPROVED') {
        throw new ApiError(400, 'Only approved bookings can be completed')
      }
      return
    }
  }

  throw new ApiError(400, 'Invalid status transition')
}

export async function updateBookingStatus(
  user: AuthUser,
  id: string,
  input: UpdateBookingStatusInput,
) {
  const booking = await getBookingOr404(id)
  assertCanTransition(user, booking, input.status)

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: input.status },
    include: bookingInclude,
  })
  return serializeBooking(updated)
}

export async function deleteBooking(user: AuthUser, id: string) {
  const booking = await getBookingOr404(id)
  const isTenant = user.id === booking.tenantId
  const isOwner = user.role === 'ADMIN' || user.id === booking.property.ownerId

  if (!isTenant && !isOwner) {
    throw new ApiError(403, 'You do not have permission to delete this booking')
  }
  if (booking.status !== 'PENDING') {
    throw new ApiError(400, 'Only pending bookings can be deleted')
  }

  await prisma.booking.delete({ where: { id } })
}
