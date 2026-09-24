import type { Property } from '../types'

export interface PropertyFilters {
  location?: string
  minPrice?: number
  maxPrice?: number
  minSellingPrice?: number
  maxSellingPrice?: number
  minBedrooms?: number
  propertyType?: string
}

function positive(value: number | undefined): number | undefined {
  return value !== undefined && value > 0 && Number.isFinite(value)
    ? value
    : undefined
}

export function filterProperties(
  properties: Property[],
  filters: PropertyFilters,
): Property[] {
  const location = filters.location?.trim().toLowerCase() ?? ''
  const minPrice = positive(filters.minPrice)
  const maxPrice = positive(filters.maxPrice)
  const minSellingPrice = positive(filters.minSellingPrice)
  const maxSellingPrice = positive(filters.maxSellingPrice)
  const minBedrooms = filters.minBedrooms ?? undefined
  const propertyType = filters.propertyType?.trim().toLowerCase() ?? ''
  const sellingFilterActive = minSellingPrice !== undefined || maxSellingPrice !== undefined

  return properties.filter((property) => {
    if (location) {
      const matchesLocation =
        property.location.toLowerCase().includes(location) ||
        property.address.toLowerCase().includes(location) ||
        property.city.toLowerCase().includes(location) ||
        property.title.toLowerCase().includes(location)
      if (!matchesLocation) return false
    }

    if (minPrice !== undefined && property.price < minPrice) return false
    if (maxPrice !== undefined && property.price > maxPrice) return false

    if (sellingFilterActive) {
      const selling =
        typeof property.sellingPrice === 'number' &&
        Number.isFinite(property.sellingPrice) &&
        property.sellingPrice > 0
          ? property.sellingPrice
          : null
      if (selling === null) return false
      if (minSellingPrice !== undefined && selling < minSellingPrice) return false
      if (maxSellingPrice !== undefined && selling > maxSellingPrice) return false
    }

    if (minBedrooms !== undefined) {
      // Value 0 ("Studio" option) means studios only; otherwise treat as minimum
      if (minBedrooms === 0) {
        if (property.bedrooms !== 0) return false
      } else if (property.bedrooms < minBedrooms) {
        return false
      }
    }

    if (propertyType && property.type.toLowerCase() !== propertyType) {
      return false
    }

    return true
  })
}

export function hasActiveFilters(filters: PropertyFilters): boolean {
  return Boolean(
    filters.location?.trim() ||
      (filters.minPrice && filters.minPrice > 0) ||
      (filters.maxPrice && filters.maxPrice > 0) ||
      (filters.minSellingPrice && filters.minSellingPrice > 0) ||
      (filters.maxSellingPrice && filters.maxSellingPrice > 0) ||
      filters.minBedrooms !== undefined ||
      filters.propertyType,
  )
}

export function filtersToSearchParams(filters: PropertyFilters): string {
  const params = new URLSearchParams()
  if (filters.location?.trim()) params.set('location', filters.location.trim())
  if (filters.minPrice && filters.minPrice > 0)
    params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice && filters.maxPrice > 0)
    params.set('maxPrice', String(filters.maxPrice))
  if (filters.minSellingPrice && filters.minSellingPrice > 0)
    params.set('minSellingPrice', String(filters.minSellingPrice))
  if (filters.maxSellingPrice && filters.maxSellingPrice > 0)
    params.set('maxSellingPrice', String(filters.maxSellingPrice))
  if (filters.minBedrooms !== undefined)
    params.set('bedrooms', String(filters.minBedrooms))
  if (filters.propertyType) params.set('type', filters.propertyType)
  return params.toString()
}

export function filtersFromSearchParams(params: URLSearchParams): PropertyFilters {
  const filters: PropertyFilters = {}
  const location = params.get('location')
  if (location) filters.location = location
  const minPrice = params.get('minPrice')
  if (minPrice && !Number.isNaN(Number(minPrice)))
    filters.minPrice = Number(minPrice)
  const maxPrice = params.get('maxPrice')
  if (maxPrice && !Number.isNaN(Number(maxPrice)))
    filters.maxPrice = Number(maxPrice)
  const minSelling = params.get('minSellingPrice')
  if (minSelling && !Number.isNaN(Number(minSelling)))
    filters.minSellingPrice = Number(minSelling)
  const maxSelling = params.get('maxSellingPrice')
  if (maxSelling && !Number.isNaN(Number(maxSelling)))
    filters.maxSellingPrice = Number(maxSelling)
  const bedrooms = params.get('bedrooms')
  if (bedrooms !== null && bedrooms !== '' && !Number.isNaN(Number(bedrooms)))
    filters.minBedrooms = Number(bedrooms)
  const type = params.get('type')
  if (type) filters.propertyType = type
  return filters
}
