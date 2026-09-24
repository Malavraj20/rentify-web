import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { SearchBar, type SearchBarFilters } from '../components/ui/SearchBar'
import {
  PropertyCard,
  type Property,
} from '../components/ui/PropertyCard'
import { Button } from '../components/ui/Button'
import { useFavorites } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'
import { apiRequest, extractErrorMessage } from '../utils/api'
import { mapApiProperty } from '../utils/property'
import type { ApiPropertyListResponse } from '../types'
import {
  filtersFromSearchParams,
  filtersToSearchParams,
  hasActiveFilters,
  type PropertyFilters,
} from '../utils/filterProperties'

const SEARCH_PAGE_LIMIT = 100

const mapFallback = {
  imageUrl: '',
  gallery: [] as string[],
  commute: '20 min',
}

function buildSearchQuery(filters: PropertyFilters): string {
  const params = new URLSearchParams()
  params.set('page', '1')
  params.set('limit', String(SEARCH_PAGE_LIMIT))
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

const SearchPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { role, isAuthenticated } = useAuth()
  const saleMode = isAuthenticated && role === 'buyer'
  const [barKey, setBarKey] = useState(0)
  const [results, setResults] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const initialFilters = useMemo(
    () => filtersFromSearchParams(searchParams),
    // Recompute only when the URL search string changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams.toString()],
  )

  const activeFilters = hasActiveFilters(initialFilters)

  useEffect(() => {
    let cancelled = false

    async function loadResults() {
      setLoading(true)
      setError(null)
      const query = buildSearchQuery(initialFilters)
      const result = await apiRequest<ApiPropertyListResponse>(
        'GET',
        `/api/properties?${query}`,
      )
      if (cancelled) return
      if (!result.ok || !result.data) {
        setResults([])
        setError(extractErrorMessage(result, 'Failed to load search results.'))
      } else {
        setResults(
          result.data.properties.map((api) => mapApiProperty(api, mapFallback)),
        )
      }
      setLoading(false)
    }

    void loadResults()
    return () => {
      cancelled = true
    }
  }, [initialFilters, retryKey])

  const handleSearch = useCallback(
    (_query: string, filters: SearchBarFilters) => {
      const next = filtersToSearchParams(filters)
      setSearchParams(next ? `?${next}` : '')
      setBarKey((key) => key + 1)
    },
    [setSearchParams],
  )

  const handleClearFilters = () => {
    setSearchParams('')
    setBarKey((key) => key + 1)
  }

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
            Property Search
          </h1>
          <p className="mt-2 text-rentify-grayMuted">
            {saleMode
              ? 'Filter listings across Vadodara by neighbourhood, selling price, BHK and property type.'
              : 'Filter listings across Vadodara by neighbourhood, rent, BHK and property type.'}
          </p>
        </div>

        <div className="mx-auto max-w-4xl">
          <SearchBar
            key={barKey}
            defaultFilters={initialFilters}
            onSearch={handleSearch}
          />
        </div>

        <div className="mt-8 mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-rentify-grayMuted" aria-live="polite">
            {loading
              ? 'Searching properties…'
              : results.length === 1
                ? '1 property found'
                : `${results.length} properties found`}
            {!loading && activeFilters && ' with current filters'}
          </p>
          {activeFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-sm font-semibold text-rentify-navy transition-colors hover:text-rentify-lightNavy"
            >
              Clear all filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-rentify-grayLight bg-white px-6 py-14 text-center shadow-sm">
            <span
              className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-rentify-purpleLight text-rentify-deepNavy"
              aria-hidden
            >
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-rentify-navy">
              Finding properties…
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-rentify-grayMuted">
              Applying your filters against the latest listings.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rentify-grayLight bg-white px-6 py-14 text-center shadow-sm">
            <span
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rentify-purpleLight text-rentify-deepNavy"
              aria-hidden
            >
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-rentify-navy">
              Could not load properties
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-rentify-grayMuted">
              {error}
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => setRetryKey((key) => key + 1)}>
                Try again
              </Button>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isFavorite={isFavorite(property.id)}
                onFavorite={() => toggleFavorite(property.id)}
                onViewDetails={() => navigate(`/properties/${property.id}`)}
                onChat={() => navigate(`/chat/${property.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-rentify-grayLight bg-white px-6 py-14 text-center shadow-sm">
            <span
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rentify-purpleLight text-rentify-deepNavy"
              aria-hidden
            >
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-rentify-navy">
              No properties match your filters
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-rentify-grayMuted">
              Try widening your {saleMode ? 'selling-price' : 'price'} range,
              removing the location term, or choosing a different property type.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={handleClearFilters}>Clear all filters</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default SearchPage
