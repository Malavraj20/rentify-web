import { prisma } from '../prisma.js'
import type { AuthUser } from './auth.service.js'
import type {
  BuyerPreferencesInput,
  RenterPreferencesInput,
} from '../validation/preference.schema.js'

function mapRenter(row: {
  budget: string
  propertyType: string
  occupants: string
  pets: string
  furnishing: string
}): RenterPreferencesInput {
  return {
    budget: row.budget,
    propertyType: row.propertyType,
    occupants: row.occupants,
    pets: row.pets,
    furnishing: row.furnishing,
  }
}

function mapBuyer(row: {
  budget: string
  propertyType: string
  purpose: string
  furnishing: string
  priority: string
}): BuyerPreferencesInput {
  return {
    budget: row.budget,
    propertyType: row.propertyType,
    purpose: row.purpose,
    furnishing: row.furnishing,
    priority: row.priority,
  }
}

export async function getPreferences(user: AuthUser) {
  const [renter, buyer] = await Promise.all([
    prisma.renterPreferences.findUnique({ where: { userId: user.id } }),
    prisma.buyerPreferences.findUnique({ where: { userId: user.id } }),
  ])

  return {
    renter: renter ? mapRenter(renter) : null,
    buyer: buyer ? mapBuyer(buyer) : null,
  }
}

export async function getRenterPreferences(user: AuthUser) {
  const row = await prisma.renterPreferences.findUnique({
    where: { userId: user.id },
  })
  return row ? mapRenter(row) : null
}

export async function getBuyerPreferences(user: AuthUser) {
  const row = await prisma.buyerPreferences.findUnique({
    where: { userId: user.id },
  })
  return row ? mapBuyer(row) : null
}

export async function putRenterPreferences(
  user: AuthUser,
  input: RenterPreferencesInput,
) {
  const row = await prisma.renterPreferences.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...input },
    update: input,
  })
  return mapRenter(row)
}

export async function putBuyerPreferences(
  user: AuthUser,
  input: BuyerPreferencesInput,
) {
  const row = await prisma.buyerPreferences.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...input },
    update: input,
  })
  return mapBuyer(row)
}
