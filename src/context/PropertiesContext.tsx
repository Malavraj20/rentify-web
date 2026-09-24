import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ApiPropertyPayload, Property } from '../types'
import { apiRequest, extractErrorMessage } from '../utils/api'
import { mapApiProperty } from '../utils/property'
import { properties as seedProperties } from '../data/properties'
import { readJson, uid, writeJson } from '../utils/storage'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'rentify:properties'
const TOKEN_STORAGE_KEY = 'rentify:token'

export type PropertyInput = Omit<
  Property,
  | 'id'
  | 'views'
  | 'interestedTenants'
  | 'matchScore'
  | 'healthScore'
  | 'riskLevel'
  | 'commute'
  | 'ownerId'
> & {
  commute?: string
}

interface PropertiesContextValue {
  properties: Property[]
  getPropertyById: (id: string) => Property | undefined
  getPropertiesByOwner: (ownerId: string) => Property[]
  addProperty: (ownerId: string, input: PropertyInput) => Property
  insertProperty: (property: Property) => Property
  updateProperty: (id: string, patch: Partial<Property>) => Property | undefined
  deleteProperty: (id: string) => Promise<void>
  refreshProperties: () => Promise<void>
}

const PropertiesContext = createContext<PropertiesContextValue | null>(null)

function readProperties(): Property[] {
  // Seed properties are browser-local only (offline UI fallback).
  // They are never POSTed to the API and never reach PostgreSQL.
  const stored = readJson<Property[] | null>(STORAGE_KEY, null)
  if (Array.isArray(stored) && stored.length > 0) {
    return stored.map((item) => {
      if (typeof item.sellingPrice === 'number') return item
      const seed = seedProperties.find((entry) => entry.id === item.id)
      if (seed && typeof seed.sellingPrice === 'number') {
        return { ...item, sellingPrice: seed.sellingPrice }
      }
      return item
    })
  }
  writeJson(STORAGE_KEY, seedProperties)
  return seedProperties
}

function readAuthToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

const mapFallback = {
  imageUrl: '',
  gallery: [] as string[],
  commute: '20 min',
}

async function fetchAllPublicProperties(): Promise<Property[] | null> {
  const all: Property[] = []
  let page = 1
  let totalPages = 1

  do {
    const result = await apiRequest<{
      properties: ApiPropertyPayload[]
      pagination: { totalPages: number }
    }>('GET', `/api/properties?page=${page}&limit=100`)

    if (!result.ok || !result.data) {
      if (page === 1) return null
      break
    }

    all.push(
      ...result.data.properties.map((api) => mapApiProperty(api, mapFallback)),
    )
    totalPages = result.data.pagination.totalPages
    page += 1
  } while (page <= totalPages)

  return all
}

async function fetchOwnerProperties(token: string): Promise<Property[] | null> {
  const result = await apiRequest<{ properties: ApiPropertyPayload[] }>(
    'GET',
    '/api/properties/my',
    undefined,
    token,
  )
  if (!result.ok || !result.data) return null
  return result.data.properties.map((api) => mapApiProperty(api, mapFallback))
}

const PropertiesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [properties, setProperties] = useState<Property[]>(readProperties)

  const loadFromApi = useCallback(async () => {
    const token = readAuthToken()
    const [publicResult, ownerResult] = await Promise.all([
      fetchAllPublicProperties(),
      token ? fetchOwnerProperties(token) : Promise.resolve(null),
    ])

    if (publicResult === null && ownerResult === null) return

    const publicProperties = publicResult ?? []
    const ownerProperties = ownerResult ?? []
    const ownerIds = new Set(ownerProperties.map((property) => property.id))
    const merged = [
      ...ownerProperties,
      ...publicProperties.filter((property) => !ownerIds.has(property.id)),
    ]
    setProperties(merged)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      const token = readAuthToken()
      const [publicResult, ownerResult] = await Promise.all([
        fetchAllPublicProperties(),
        token ? fetchOwnerProperties(token) : Promise.resolve(null),
      ])

      if (cancelled) return
      if (publicResult === null && ownerResult === null) return

      const publicProperties = publicResult ?? []
      const ownerProperties = ownerResult ?? []
      const ownerIds = new Set(ownerProperties.map((property) => property.id))
      const merged = [
        ...ownerProperties,
        ...publicProperties.filter((property) => !ownerIds.has(property.id)),
      ]
      setProperties(merged)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [userId])

  const refreshProperties = useCallback(async () => {
    await loadFromApi()
  }, [loadFromApi])

  useEffect(() => {
    writeJson(STORAGE_KEY, properties)
  }, [properties])

  const getPropertyById = useCallback(
    (id: string) => properties.find((property) => property.id === id),
    [properties],
  )

  const getPropertiesByOwner = useCallback(
    (ownerId: string) => properties.filter((property) => property.ownerId === ownerId),
    [properties],
  )

  const addProperty = useCallback((ownerId: string, input: PropertyInput) => {
    const property: Property = {
      id: uid('prop'),
      views: 0,
      interestedTenants: [],
      matchScore: 80,
      healthScore: 85,
      riskLevel: 'low',
      commute: input.commute ?? '20 min',
      ...input,
      ownerId,
    }
    setProperties((current) => [property, ...current])
    return property
  }, [])

  const insertProperty = useCallback((property: Property) => {
    setProperties((current) => {
      const index = current.findIndex((entry) => entry.id === property.id)
      if (index === -1) return [property, ...current]
      const next = [...current]
      next[index] = property
      return next
    })
    return property
  }, [])

  const updateProperty = useCallback(
    (id: string, patch: Partial<Property>) => {
      let updated: Property | undefined
      setProperties((current) =>
        current.map((property) => {
          if (property.id !== id) return property
          updated = { ...property, ...patch }
          return updated
        }),
      )
      return updated
    },
    [],
  )

  const deleteProperty = useCallback(async (id: string) => {
    const token = readAuthToken()
    if (!token) {
      throw new Error('Please sign in again before deleting this listing.')
    }
    const result = await apiRequest<{ message?: string }>(
      'DELETE',
      `/api/properties/${id}`,
      undefined,
      token,
    )
    if (!result.ok) {
      throw new Error(
        extractErrorMessage(result, 'Could not delete the property.'),
      )
    }
    setProperties((current) => current.filter((property) => property.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      properties,
      getPropertyById,
      getPropertiesByOwner,
      addProperty,
      insertProperty,
      updateProperty,
      deleteProperty,
      refreshProperties,
    }),
    [properties, getPropertyById, getPropertiesByOwner, addProperty, insertProperty, updateProperty, deleteProperty, refreshProperties],
  )

  return (
    <PropertiesContext.Provider value={value}>{children}</PropertiesContext.Provider>
  )
}

function useProperties(): PropertiesContextValue {
  const context = useContext(PropertiesContext)
  if (!context) {
    throw new Error('useProperties must be used within a PropertiesProvider')
  }
  return context
}

export { PropertiesProvider, useProperties }
export type { PropertiesContextValue }
