import type {
  ApiPropertyPayload,
  Property,
  RentalPreferences,
} from '../types'

export function estimatedMonthlyCost(property: Property): number {
  const utilities = Math.round(property.size * 4)
  return property.price + property.maintenance + utilities
}

export function formatBedrooms(property: Property): string {
  return property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} BHK`
}

export function formatPetPolicy(value: string): string {
  if (value === 'Yes, all pets') return 'Allowed — all pets'
  if (value === 'Yes, with restrictions') return 'Allowed with restrictions'
  if (value === 'No pets') return 'Not allowed'
  return value
}

export function getPropertyImages(property: Property): string[] {
  if (property.gallery && property.gallery.length > 0) return property.gallery
  return property.imageUrl ? [property.imageUrl] : []
}

function todayPlusDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function mapApiProperty(
  api: ApiPropertyPayload,
  fallback?: {
    imageUrl?: string
    gallery?: string[]
    commute?: string
    rentalPreferences?: RentalPreferences
  },
): Property {
  const gallery = (api.images ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((image) => image.imageUrl)
  const resolvedGallery =
    gallery.length > 0 ? gallery : (fallback?.gallery ?? [])

  return {
    id: api.id,
    title: api.title,
    type: api.type,
    price: api.price,
    sellingPrice:
      typeof api.sellingPrice === 'number' ? api.sellingPrice : undefined,
    listingFor: api.listingFor ?? 'rent',
    location: api.location,
    address: api.address,
    city: api.city,
    state: api.state ?? undefined,
    pincode: api.pincode ?? undefined,
    bedrooms: api.bedrooms,
    bathrooms: api.bathrooms,
    size: api.size,
    commute: api.commute ?? fallback?.commute ?? '20 min',
    matchScore: api.matchScore ?? 80,
    healthScore: api.healthScore ?? 85,
    riskLevel: api.riskLevel ?? 'low',
    amenities: api.amenities ?? [],
    imageUrl: resolvedGallery[0] ?? fallback?.imageUrl ?? '',
    gallery: resolvedGallery,
    description: api.description,
    ownerId: api.ownerId,
    ownerName: api.owner?.name,
    securityDeposit: api.securityDeposit,
    maintenance: api.maintenance,
    otherCharges:
      typeof api.otherCharges === 'number' ? api.otherCharges : undefined,
    available: api.available,
    availableFrom: api.availableFrom
      ? api.availableFrom.slice(0, 10)
      : todayPlusDays(7),
    views: api.views,
    interestedTenants: [],
    furnishing: api.furnishing,
    status: api.status ?? 'draft',
    floor: api.floor ?? undefined,
    totalFloors: api.totalFloors ?? undefined,
    parking: api.parking ?? undefined,
    latitude: typeof api.latitude === 'number' ? api.latitude : undefined,
    longitude: typeof api.longitude === 'number' ? api.longitude : undefined,
    rentalPreferences: fallback?.rentalPreferences,
  }
}
