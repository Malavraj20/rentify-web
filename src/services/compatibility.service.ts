import { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { ApiError } from '../middleware/error.middleware.js'
import type { AuthUser } from './auth.service.js'

export const COMPATIBILITY_MODEL_VERSION = 'deterministic-v1'

export const DEFAULT_WEIGHTS = {
  budget: 0.4,
  commute: 0.35,
  lifestyle: 0.25,
} as const

export interface CompatibilityFactor {
  name: 'Budget Fit' | 'Commute' | 'Lifestyle Fit'
  value: number
  weight: number
}

export interface CompatibilityResult {
  property_id: string
  tenant_id: string
  score: number
  factors: CompatibilityFactor[]
  computed_at: string
}

interface PropertyForScoring {
  id: string
  price: number
  type: string
  bedrooms: number
  furnishing: string
  amenities: string[]
  location: string
  city: string
  commute: string | null
  available: boolean
  status: string
}

interface RenterPrefsForScoring {
  budget: string
  propertyType: string
  occupants: string
  pets: string
  furnishing: string
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function roundFactor(n: number): number {
  return Math.round(clamp01(n) * 1000) / 1000
}

/** Parse wizard budget labels into a monthly rent range in rupees. */
export function parseBudgetRange(label: string): {
  min: number
  max: number
} {
  const text = label.replace(/[₹,\s]/g, '')
  const under = text.match(/^Under(\d+)$/i)
  if (under) return { min: 0, max: Number(under[1]) }

  const above = text.match(/^Above(\d+)$/i)
  if (above) return { min: Number(above[1]), max: Number.POSITIVE_INFINITY }

  const range = text.match(/^(\d+)[-–—](\d+)$/)
  if (range) return { min: Number(range[1]), max: Number(range[2]) }

  const single = text.match(/^(\d+)$/)
  if (single) return { min: Number(single[1]), max: Number(single[1]) }

  return { min: 0, max: Number.POSITIVE_INFINITY }
}

export function scoreBudgetFit(prefBudget: string, price: number): number {
  const { min, max } = parseBudgetRange(prefBudget)
  if (price >= min && price <= max) return 1

  if (price > max && Number.isFinite(max) && max > 0) {
    const over = (price - max) / max
    return roundFactor(1 - over)
  }

  if (price < min && min > 0) {
    const under = (min - price) / min
    return roundFactor(1 - under)
  }

  return 0.5
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function scoreCommute(
  preferredLocation: string | null | undefined,
  property: Pick<PropertyForScoring, 'location' | 'city' | 'commute'>,
): number {
  const preferred = preferredLocation ? normalize(preferredLocation) : ''
  if (preferred) {
    const loc = normalize(property.location)
    const city = normalize(property.city)
    if (loc === preferred || city === preferred) return 1
    if (loc.includes(preferred) || city.includes(preferred) || preferred.includes(city)) {
      return 0.85
    }
  }

  if (property.commute && property.commute.trim().length > 0) {
    const minutes = property.commute.match(/(\d+)\s*(min|minute)/i)
    if (minutes) {
      const m = Number(minutes[1])
      if (m <= 15) return 1
      if (m <= 30) return 0.8
      if (m <= 45) return 0.6
      return 0.4
    }
    return 0.5
  }

  return 0.5
}

function scorePropertyType(prefType: string, property: PropertyForScoring): number {
  const pref = normalize(prefType)
  if (pref === 'any' || pref === '') return 1

  const bhk = pref.match(/(\d+)\s*bhk/i)
  if (bhk) {
    const n = Number(bhk[1])
    if (property.bedrooms === n) return 1
    if (Math.abs(property.bedrooms - n) === 1) return 0.6
    return 0.2
  }

  if (normalize(property.type) === pref) return 1
  if (normalize(property.type).includes(pref) || pref.includes(normalize(property.type))) {
    return 0.8
  }
  return 0.4
}

function scoreFurnishing(pref: string, property: string): number {
  const p = normalize(pref)
  const prop = normalize(property)
  if (p === 'no preference' || p === '') return 1
  if (p === prop) return 1
  const partial =
    (p.includes('semi') && prop.includes('semi')) ||
    (p.includes('fully') && (prop.includes('full') || prop.includes('furnished') && !prop.includes('semi') && !prop.includes('un'))) ||
    (p.includes('unfurnished') && prop.includes('unfurnished'))
  if (partial) return 0.8
  return 0.3
}

function scorePets(pref: string, amenities: string[]): number {
  const p = normalize(pref)
  const petAmenity = amenities.some((a) => {
    const n = normalize(a)
    return n.includes('pet') || n.includes('dog') || n.includes('cat')
  })

  if (p.startsWith('yes')) return petAmenity ? 1 : 0.3
  if (p === 'no pets') return 1
  return petAmenity ? 0.8 : 0.6
}

function scoreOccupants(pref: string, bedrooms: number): number {
  const p = normalize(pref)
  if (p === 'just me' || p === 'me and my partner') {
    return bedrooms <= 2 ? 1 : 0.7
  }
  if (p === 'family' || p === 'friends/roommates') {
    return bedrooms >= 2 ? 1 : 0.6
  }
  return 0.8
}

export function scoreLifestyleFit(
  prefs: RenterPrefsForScoring,
  property: PropertyForScoring,
): number {
  const parts = [
    scorePropertyType(prefs.propertyType, property),
    scoreFurnishing(prefs.furnishing, property.furnishing),
    scorePets(prefs.pets, property.amenities ?? []),
    scoreOccupants(prefs.occupants, property.bedrooms),
  ]
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length
  return roundFactor(avg)
}

export function computeCompatibility(input: {
  property: PropertyForScoring
  prefs: RenterPrefsForScoring
  preferredLocation?: string | null
}): { score: number; factors: CompatibilityFactor[] } {
  const budgetValue = roundFactor(
    scoreBudgetFit(input.prefs.budget, input.property.price),
  )
  const commuteValue = roundFactor(
    scoreCommute(input.preferredLocation, input.property),
  )
  const lifestyleValue = scoreLifestyleFit(input.prefs, input.property)

  const factors: CompatibilityFactor[] = [
    { name: 'Budget Fit', value: budgetValue, weight: DEFAULT_WEIGHTS.budget },
    { name: 'Commute', value: commuteValue, weight: DEFAULT_WEIGHTS.commute },
    {
      name: 'Lifestyle Fit',
      value: lifestyleValue,
      weight: DEFAULT_WEIGHTS.lifestyle,
    },
  ]

  const weighted =
    budgetValue * DEFAULT_WEIGHTS.budget +
    commuteValue * DEFAULT_WEIGHTS.commute +
    lifestyleValue * DEFAULT_WEIGHTS.lifestyle

  const score = Math.min(100, Math.max(0, Math.round(weighted * 100)))
  return { score, factors }
}

export async function getCompatibility(
  user: AuthUser,
  propertyId: string,
): Promise<CompatibilityResult> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      price: true,
      type: true,
      bedrooms: true,
      furnishing: true,
      amenities: true,
      location: true,
      city: true,
      commute: true,
      available: true,
      status: true,
    },
  })

  if (!property || property.status !== 'active' || !property.available) {
    throw new ApiError(404, 'Property not found')
  }

  const [prefs, tenant] = await Promise.all([
    prisma.renterPreferences.findUnique({ where: { userId: user.id } }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { preferredLocation: true },
    }),
  ])

  if (!prefs) {
    throw new ApiError(
      404,
      'Renter preferences not found. Complete your preferences to calculate compatibility scores.',
    )
  }

  const { score, factors } = computeCompatibility({
    property,
    prefs: {
      budget: prefs.budget,
      propertyType: prefs.propertyType,
      occupants: prefs.occupants,
      pets: prefs.pets,
      furnishing: prefs.furnishing,
    },
    preferredLocation: tenant?.preferredLocation ?? null,
  })

  const now = new Date()
  const row = await prisma.compatibilityScore.upsert({
    where: {
      propertyId_tenantId: {
        propertyId: property.id,
        tenantId: user.id,
      },
    },
    create: {
      propertyId: property.id,
      tenantId: user.id,
      score,
      factors: factors as unknown as Prisma.InputJsonValue,
      modelVersion: COMPATIBILITY_MODEL_VERSION,
      computedAt: now,
    },
    update: {
      score,
      factors: factors as unknown as Prisma.InputJsonValue,
      modelVersion: COMPATIBILITY_MODEL_VERSION,
      computedAt: now,
    },
  })

  return {
    property_id: row.propertyId,
    tenant_id: row.tenantId,
    score: row.score,
    factors: factors.map((f) => ({
      name: f.name,
      value: f.value,
      weight: f.weight,
    })),
    computed_at: row.computedAt.toISOString(),
  }
}
