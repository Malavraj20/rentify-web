import React from 'react'
import { Badge, type BadgeProps } from './Badge'
import type { Property } from '../../types'
import { formatCurrency } from '../../utils/currency'
import { estimatedMonthlyCost, formatBedrooms } from '../../utils/property'
import { useAuth } from '../../context/AuthContext'

interface PropertyCardProps {
  property: Property
  onFavorite?: () => void
  onChat?: () => void
  onViewDetails?: () => void
  isFavorite?: boolean
  className?: string
}

const specIconClass = 'h-4 w-4 shrink-0 text-rentify-deepNavy'

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onFavorite,
  onChat,
  onViewDetails,
  isFavorite = false,
  className = '',
}) => {
  const { role, isAuthenticated } = useAuth()
  const showSalePrice =
    isAuthenticated && role === 'buyer'
  const badges: {
    label: string
    value: string | number
    variant: BadgeProps['variant']
  }[] = [
    { label: 'Match', value: `${property.matchScore}%`, variant: 'default' },
    { label: 'Health', value: `${property.healthScore}%`, variant: 'success' },
    {
      label: 'Risk',
      value:
        property.riskLevel.charAt(0).toUpperCase() + property.riskLevel.slice(1),
      variant:
        property.riskLevel === 'low'
          ? 'default'
          : property.riskLevel === 'medium'
            ? 'caution'
            : 'destructive',
    },
  ]

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-rentify-grayLight bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-rentify-purpleLight hover:shadow-lg ${
        property.riskLevel === 'high' ? 'ring-2 ring-rentify-cautionOrange/40' : ''
      } ${className}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-rentify-purpleLight2">
        <span
          className="absolute inset-0 flex items-center justify-center text-rentify-deepNavy"
          aria-hidden
        >
          <svg
            className="h-14 w-14"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
            />
          </svg>
        </span>
        <img
          src={property.imageUrl}
          alt={property.title}
          loading="lazy"
          decoding="async"
          className="relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/55 to-transparent"
          aria-hidden
        />
        {onViewDetails && (
          <button
            type="button"
            onClick={onViewDetails}
            aria-label={`View details for ${property.title}`}
            className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rentify-navy"
          />
        )}
        <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-rentify-navy shadow-sm backdrop-blur">
          {property.type}
        </span>
        {onFavorite && (
          <button
            type="button"
            onClick={onFavorite}
            aria-label={
              isFavorite
                ? `Remove ${property.title} from favorites`
                : `Add ${property.title} to favorites`
            }
            aria-pressed={isFavorite}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-rentify-deepNavy shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy"
          >
            <svg
              className="h-5 w-5"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-snug text-rentify-navy">
          {onViewDetails ? (
            <button
              type="button"
              onClick={onViewDetails}
              className="text-left transition-colors hover:text-rentify-lightNavy focus-visible:outline-none focus-visible:underline"
            >
              {property.title}
            </button>
          ) : (
            property.title
          )}
        </h3>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-rentify-grayMuted">
          <svg
            className={specIconClass}
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
          {property.location}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-rentify-grayMuted">
          <span className="inline-flex items-center gap-1.5">
            <svg
              className={specIconClass}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2 17v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5M2 17h20M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M2 17v2M22 17v2"
              />
            </svg>
            {formatBedrooms(property)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg
              className={specIconClass}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"
              />
            </svg>
            {property.bathrooms} bath
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg
              className={specIconClass}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"
              />
            </svg>
            {property.size} sqft
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg
              className={specIconClass}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z"
              />
            </svg>
            {property.commute} commute
          </span>
        </div>

        {property.amenities.length > 0 && (
          <ul
            className="mt-3 flex flex-wrap gap-1.5"
            aria-label={`Amenities for ${property.title}`}
          >
            {property.amenities.map((amenity) => (
              <li
                key={amenity}
                className="rounded-full border border-rentify-purpleLight bg-rentify-purpleLight3 px-2.5 py-0.5 text-[11px] font-medium text-rentify-navy"
              >
                {amenity}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {badges.map(({ label, value, variant }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-xl bg-rentify-whiteOff py-2"
            >
              <Badge size="sm" variant={variant}>
                {value}
              </Badge>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-3 border-t border-rentify-grayLight pt-4">
            <div>
              {showSalePrice ? (
                typeof property.sellingPrice === 'number' &&
                Number.isFinite(property.sellingPrice) &&
                property.sellingPrice > 0 ? (
                  <>
                    <p className="font-display text-2xl font-bold text-rentify-navy">
                      {formatCurrency(property.sellingPrice)}
                    </p>
                    <p className="mt-0.5 text-xs text-rentify-grayMuted">
                      Selling price · for sale
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-xl font-bold text-rentify-navy">
                      Not listed for sale
                    </p>
                    <p className="mt-0.5 text-xs text-rentify-grayMuted">
                      Rental listing only
                    </p>
                  </>
                )
              ) : (
                <>
                  <p className="font-display text-xl font-bold text-rentify-navy">
                    {formatCurrency(property.price)}
                    <span className="text-sm font-medium text-rentify-grayMuted">
                      /month
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-rentify-grayMuted">
                    Est. total {formatCurrency(estimatedMonthlyCost(property))}/month
                  </p>
                </>
              )}
            </div>
            {onChat && (
              <button
                type="button"
                onClick={onChat}
                aria-label={`Chat about ${property.title}`}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-rentify-navy/25 px-3.5 text-sm font-semibold text-rentify-navy transition-colors hover:border-rentify-navy hover:bg-rentify-purpleLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy focus-visible:ring-offset-2"
              >
                <svg
                  className="h-4 w-4 text-rentify-deepNavy"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
                Chat
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export { PropertyCard }
export type { PropertyCardProps, Property }
