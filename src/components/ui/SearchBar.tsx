import React, { ChangeEvent, useEffect, useState } from 'react'
import { Input } from './Input'
import { Button } from './Button'
import { vadodaraNeighborhoods, propertyTypes } from '../../data/properties'
import { useAuth } from '../../context/AuthContext'

interface FilterOption {
  value: string
  label: string
}

interface SearchBarFilters {
  minPrice?: number
  maxPrice?: number
  minSellingPrice?: number
  maxSellingPrice?: number
  minBedrooms?: number
  maxBedrooms?: number
  location?: string
  propertyType?: string
}

interface SearchBarProps {
  onSearch?: (query: string, filters: SearchBarFilters) => void
  onFilterChange?: (filters: SearchBarFilters) => void
  defaultFilters?: SearchBarFilters
}

const selectClasses =
  'block w-full appearance-none rounded-xl border border-rentify-borderDefault bg-white px-4 py-2.5 pr-10 text-base text-rentify-navy shadow-sm transition-colors hover:border-rentify-lightNavy focus:border-rentify-navy focus:outline-none focus:ring-2 focus:ring-rentify-purpleLight'

const labelClasses = 'mb-1.5 block text-sm font-medium text-rentify-navy'

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rentify-deepNavy"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onFilterChange,
  defaultFilters,
}) => {
  const { role, isAuthenticated } = useAuth()
  const saleMode = isAuthenticated && role === 'buyer'

  const [minPrice, setMinPrice] = useState(
    defaultFilters?.minPrice ? String(defaultFilters.minPrice) : '',
  )
  const [maxPrice, setMaxPrice] = useState(
    defaultFilters?.maxPrice ? String(defaultFilters.maxPrice) : '',
  )
  const [minSellingPrice, setMinSellingPrice] = useState(
    defaultFilters?.minSellingPrice ? String(defaultFilters.minSellingPrice) : '',
  )
  const [maxSellingPrice, setMaxSellingPrice] = useState(
    defaultFilters?.maxSellingPrice ? String(defaultFilters.maxSellingPrice) : '',
  )
  const [minBedrooms, setMinBedrooms] = useState(
    defaultFilters?.minBedrooms !== undefined
      ? String(defaultFilters.minBedrooms)
      : '',
  )
  const [location, setLocation] = useState(defaultFilters?.location ?? '')
  const [propertyType, setPropertyType] = useState(
    defaultFilters?.propertyType ?? '',
  )

  const buildFilters = (): SearchBarFilters => {
    if (saleMode) {
      return {
        minSellingPrice: minSellingPrice ? parseFloat(minSellingPrice) : undefined,
        maxSellingPrice: maxSellingPrice ? parseFloat(maxSellingPrice) : undefined,
        minBedrooms:
          minBedrooms === '' ? undefined : parseInt(minBedrooms, 10),
        location,
        propertyType,
      }
    }
    return {
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minBedrooms:
        minBedrooms === '' ? undefined : parseInt(minBedrooms, 10),
      location,
      propertyType,
    }
  }

  useEffect(() => {
    onFilterChange?.(buildFilters())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    minPrice,
    maxPrice,
    minSellingPrice,
    maxSellingPrice,
    minBedrooms,
    location,
    propertyType,
    saleMode,
    onFilterChange,
  ])

  return (
    <div className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-lg sm:p-6">
      <div className="mb-5">
        <h2 className="font-display text-lg font-semibold text-rentify-navy">
          {saleMode ? 'Search homes for sale' : 'Search rentals'}
        </h2>
        <p className="mt-0.5 text-sm text-rentify-grayMuted">
          {saleMode
            ? 'Filter by Vadodara neighbourhood, selling price, BHK and property type'
            : 'Filter by Vadodara neighbourhood, rent, BHK and property type'}
        </p>
      </div>

      {/* Location */}
      <div className="mb-4">
        <label htmlFor="rentify-location" className={labelClasses}>
          Location / Neighborhood
        </label>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-rentify-deepNavy"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          <Input
            id="rentify-location"
            list="rentify-neighborhoods"
            placeholder="e.g., Alkapuri, Gotri, Akota, Manjalpur"
            value={location}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setLocation(e.target.value)
            }
            className="pl-10"
            autoComplete="off"
          />
          <datalist id="rentify-neighborhoods">
            {vadodaraNeighborhoods.map((area) => (
              <option key={area} value={area} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Filters */}
      {(onSearch || onFilterChange) && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {saleMode ? (
              <>
                <div>
                  <label htmlFor="rentify-min-selling-price" className={labelClasses}>
                    Min selling price
                  </label>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-rentify-grayMuted"
                      aria-hidden
                    >
                      ₹
                    </span>
                    <Input
                      id="rentify-min-selling-price"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={100000}
                      placeholder="3000000"
                      value={minSellingPrice}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setMinSellingPrice(e.target.value)
                      }
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="rentify-max-selling-price" className={labelClasses}>
                    Max selling price
                  </label>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-rentify-grayMuted"
                      aria-hidden
                    >
                      ₹
                    </span>
                    <Input
                      id="rentify-max-selling-price"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={100000}
                      placeholder="10000000"
                      value={maxSellingPrice}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setMaxSellingPrice(e.target.value)
                      }
                      className="pl-8"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="rentify-min-price" className={labelClasses}>
                    Min rent
                  </label>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-rentify-grayMuted"
                      aria-hidden
                    >
                      ₹
                    </span>
                    <Input
                      id="rentify-min-price"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={500}
                      placeholder="8000"
                      value={minPrice}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setMinPrice(e.target.value)
                      }
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="rentify-max-price" className={labelClasses}>
                    Max rent
                  </label>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-rentify-grayMuted"
                      aria-hidden
                    >
                      ₹
                    </span>
                    <Input
                      id="rentify-max-price"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={500}
                      placeholder="50000"
                      value={maxPrice}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setMaxPrice(e.target.value)
                      }
                      className="pl-8"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="rentify-bedrooms" className={labelClasses}>
                Bedrooms (BHK)
              </label>
              <div className="relative">
                <select
                  id="rentify-bedrooms"
                  value={minBedrooms}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setMinBedrooms(e.target.value)
                  }
                  className={selectClasses}
                >
                  <option value="">Any</option>
                  <option value="0">Studio</option>
                  <option value="1">1 BHK</option>
                  <option value="2">2 BHK</option>
                  <option value="3">3+ BHK</option>
                </select>
                <SelectChevron />
              </div>
            </div>

            <div>
              <label htmlFor="rentify-property-type" className={labelClasses}>
                Property Type
              </label>
              <div className="relative">
                <select
                  id="rentify-property-type"
                  value={propertyType}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setPropertyType(e.target.value)
                  }
                  className={selectClasses}
                >
                  <option value="">Any type</option>
                  {propertyTypes.map((type) => (
                    <option key={type} value={type.toLowerCase()}>
                      {type}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </div>
            </div>
          </div>
        </>
      )}

      {onSearch && (
        <div className="mt-5 flex justify-end border-t border-rentify-grayLight pt-4">
          <Button
            onClick={() => onSearch(location, buildFilters())}
            className="w-full sm:w-auto"
            aria-label="Search properties"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            Search
          </Button>
        </div>
      )}
    </div>
  )
}

export { SearchBar }
export type { SearchBarProps, SearchBarFilters, FilterOption }
