import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ScoreMetricCard } from '../components/ui/ScoreMetricCard'
import { BookingModal } from '../components/features/BookingModal'
import { PropertyLocationMap } from '../components/features/PropertyLocationMap'
import { getOwnerById } from '../data/users'
import { useProperties } from '../context/PropertiesContext'
import { useFavorites } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'
import { useBookings } from '../context/BookingsContext'
import { useRecentlyViewed } from '../context/RecentlyViewedContext'
import { formatCurrency } from '../utils/currency'
import { apiRequest } from '../utils/api'
import type { ApiPropertyDetailResponse, Property } from '../types'
import {
  estimatedMonthlyCost,
  formatBedrooms,
  formatPetPolicy,
  getPropertyImages,
  mapApiProperty,
} from '../utils/property'

const mapFallback = {
  imageUrl: '',
  gallery: [] as string[],
  commute: '20 min',
}

type DetailFetchState =
  | { status: 'loading' }
  | { status: 'done'; apiProperty: Property | null; apiStatus: number; ownerName?: string }

const PropertyDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { getPropertyById } = useProperties()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { user, isAuthenticated } = useAuth()
  const { addBooking } = useBookings()
  const { markViewed } = useRecentlyViewed()
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingNotice, setBookingNotice] = useState('')
  const [activeImage, setActiveImage] = useState(0)
  const [detail, setDetail] = useState<DetailFetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function loadDetail() {
      if (!id) {
        setDetail({ status: 'done', apiProperty: null, apiStatus: 404 })
        return
      }
      setDetail({ status: 'loading' })
      const result = await apiRequest<ApiPropertyDetailResponse>(
        'GET',
        `/api/properties/${id}`,
      )
      if (cancelled) return
      setActiveImage(0)
      if (result.ok && result.data?.property) {
        setDetail({
          status: 'done',
          apiProperty: mapApiProperty(result.data.property, mapFallback),
          apiStatus: result.status,
          ownerName: result.data.property.owner?.name,
        })
      } else {
        setDetail({
          status: 'done',
          apiProperty: null,
          apiStatus: result.status,
        })
      }
    }

    void loadDetail()
    return () => {
      cancelled = true
    }
  }, [id])

  const contextProperty = id ? getPropertyById(id) : undefined
  const canViewContextDraft =
    contextProperty?.status === 'draft' &&
    isAuthenticated &&
    user !== null &&
    (user.role === 'admin' ||
      (user.role === 'owner' && contextProperty.ownerId === user.id))
  const contextFallbackActive =
    detail.status === 'done' &&
    detail.apiProperty === null &&
    detail.apiStatus === 0 &&
    contextProperty !== undefined &&
    contextProperty.status !== 'draft'

  const property: Property | undefined =
    detail.status === 'loading'
      ? undefined
      : (detail.apiProperty ??
        (canViewContextDraft || contextFallbackActive
          ? contextProperty
          : undefined))

  const ownerNameFromApi =
    detail.status === 'done' ? detail.ownerName : undefined
  const owner = property
    ? ownerNameFromApi
      ? { ...getOwnerById(property.ownerId), name: ownerNameFromApi }
      : getOwnerById(property.ownerId)
    : undefined
  const ownerDisplayName = ownerNameFromApi ?? owner?.name
  const propertyImages = property ? getPropertyImages(property) : []

  useEffect(() => {
    if (property) markViewed(property.id)
  }, [property, markViewed])

  if (detail.status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
        <Header showBack onBack={() => navigate(-1)} />
        <main
          className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-12 text-center sm:px-6"
          aria-live="polite"
        >
          <p className="text-rentify-grayMuted">Loading property…</p>
        </main>
      </div>
    )
  }

  let riskBadge = null
  if (property) {
    if (property.riskLevel === 'low') {
      riskBadge = <Badge variant="default">Low risk</Badge>
    } else if (property.riskLevel === 'medium') {
      riskBadge = <Badge variant="caution">Medium risk</Badge>
    } else {
      riskBadge = <Badge variant="destructive">High risk</Badge>
    }
  }

  if (!property) {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-12 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-rentify-navy sm:text-3xl">
            Property not found
          </h1>
          <p className="mt-2 text-rentify-grayMuted">
            This listing may have been removed or the link is incorrect.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate('/search')}>
              Back to search
            </Button>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Go home
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const favorite = isFavorite(property.id)
  const activePhotoIndex =
    activeImage < propertyImages.length ? activeImage : 0
  const estMonthly = estimatedMonthlyCost(property)
  const isBuyer = isAuthenticated && user?.role === 'buyer'
  const forSale =
    isBuyer &&
    typeof property.sellingPrice === 'number' &&
    Number.isFinite(property.sellingPrice) &&
    property.sellingPrice > 0
  const riskScore =
    property.riskLevel === 'low' ? 15 : property.riskLevel === 'medium' ? 50 : 85

  const specItems = [
    { label: 'Type', value: property.type },
    { label: 'Bedrooms', value: formatBedrooms(property) },
    { label: 'Bathrooms', value: String(property.bathrooms) },
    { label: 'Area', value: `${property.size} sqft` },
    { label: 'Furnishing', value: property.furnishing },
    { label: 'Commute', value: property.commute },
    ...(forSale
      ? [
          {
            label: 'Selling price',
            value: formatCurrency(property.sellingPrice ?? 0),
          },
        ]
      : isBuyer
        ? [{ label: 'Sale status', value: 'Not listed for sale' }]
        : [
            { label: 'Deposit', value: formatCurrency(property.securityDeposit) },
            {
              label: 'Maintenance',
              value: `${formatCurrency(property.maintenance)}/mo`,
            },
          ]),
  ]

  const rentalRules =
    property.listingFor !== 'sale' && property.rentalPreferences
      ? [
          {
            label: 'Preferred tenant',
            value: property.rentalPreferences.tenantType,
          },
          {
            label: 'Pets',
            value: formatPetPolicy(property.rentalPreferences.petPolicy),
          },
          {
            label: 'Tenancy',
            value: property.rentalPreferences.tenancyDuration,
          },
          {
            label: 'Occupancy',
            value: property.rentalPreferences.occupancy,
          },
        ].filter((row) => Boolean(row.value))
      : []

  const handleRequestViewing = () => {
    if (!isAuthenticated || !user) {
      navigate('/auth', {
        state: { from: `${location.pathname}${location.search}` },
      })
      return
    }
    if (user.role === 'admin') {
      setBookingNotice('Admin accounts cannot request viewings.')
      return
    }
    setBookingNotice('')
    setBookingOpen(true)
  }

  const handleStartAgreement = () => {
    if (!isAuthenticated || !user) {
      navigate('/auth', {
        state: { from: `${location.pathname}${location.search}` },
      })
      return
    }
    if (user.role === 'owner') {
      setBookingNotice('Owner accounts cannot raise tenancy agreements for their own property.')
      return
    }
    navigate(`/agreements/new?property=${property.id}`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header showBack onBack={() => navigate(-1)} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-rentify-grayLight bg-white shadow-sm">
          <div className="relative aspect-[16/9] bg-rentify-purpleLight2 sm:aspect-[21/9]">
            <span
              className="absolute inset-0 flex items-center justify-center text-rentify-deepNavy"
              aria-hidden
            >
              <svg
                className="h-16 w-16"
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
              src={propertyImages[activePhotoIndex] ?? property.imageUrl}
              alt={property.title}
              className="relative h-full w-full bg-rentify-purpleLight2 object-contain object-center"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-rentify-navy shadow-sm backdrop-blur">
              {property.type}
            </span>
            <span
              className={`absolute right-4 top-4 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold shadow-sm backdrop-blur ${
                property.available
                  ? 'bg-rentify-successGreen text-white'
                  : 'bg-white/90 text-rentify-navy'
              }`}
            >
              {property.available
                ? `Available from ${new Date(property.availableFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'Coming soon'}
            </span>
          </div>

          {propertyImages.length > 1 && (
            <div
              className="flex gap-2 overflow-x-auto border-b border-rentify-grayLight bg-rentify-whiteOff px-4 py-3"
              aria-label="Property photo gallery"
            >
              {propertyImages.map((src, index) => (
                <button
                  key={`${src.slice(0, 64)}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View photo ${index + 1} of ${propertyImages.length}`}
                  aria-current={index === activePhotoIndex}
                  className={`shrink-0 overflow-hidden rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy ${
                    index === activePhotoIndex
                      ? 'ring-2 ring-rentify-deepNavy'
                      : 'ring-1 ring-rentify-grayLight hover:ring-rentify-purpleLight'
                  }`}
                >
                  <img
                    src={src}
                    alt=""
                    className="h-16 w-24 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
                  {property.title}
                </h1>
                <p className="mt-1.5 flex items-center gap-1.5 text-rentify-grayMuted">
                  <svg
                    className="h-4 w-4 shrink-0 text-rentify-deepNavy"
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
                  {property.address}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-bold text-rentify-navy">
                  {forSale ? (
                    formatCurrency(property.sellingPrice ?? 0)
                  ) : isBuyer ? (
                    'Not listed for sale'
                  ) : (
                    <>
                      {formatCurrency(property.price)}
                      <span className="text-base font-medium text-rentify-grayMuted">
                        /month
                      </span>
                    </>
                  )}
                </p>
                {forSale ? (
                  <p className="mt-0.5 text-sm text-rentify-grayMuted">
                    Selling price · Vadodara
                  </p>
                ) : isBuyer ? (
                  <p className="mt-0.5 text-sm text-rentify-grayMuted">
                    Rental listing only
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-rentify-grayMuted">
                    Est. total {formatCurrency(estMonthly)}/month
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="default">{property.matchScore}% match</Badge>
              <Badge variant="success">{property.healthScore}% health</Badge>
              {riskBadge}
              <Badge variant="default">{property.furnishing}</Badge>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rentify-whiteOff px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-rentify-navy text-sm font-bold text-white"
                  aria-hidden
                >
                  {(ownerDisplayName ?? 'PO')
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <div>
                  <p className="text-sm font-semibold text-rentify-navy">
                    {ownerDisplayName ?? 'Property Owner'}
                  </p>
                  <p className="text-xs text-rentify-grayMuted">
                    Property Owner · {owner?.phone ?? 'Contact via chat'}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/chat/${property.id}`)}
              >
                Chat with {ownerDisplayName ?? 'Owner'}
              </Button>
            </div>

            {property.description && (
              <p className="mt-5 leading-relaxed text-rentify-grayMuted">
                {property.description}
              </p>
            )}

            <PropertyLocationMap
              latitude={property.latitude}
              longitude={property.longitude}
            />

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {specItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-rentify-whiteOff px-3 py-3 text-center"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            {property.amenities.length > 0 && (
              <section className="mt-6" aria-labelledby="amenities-heading">
                <h2
                  id="amenities-heading"
                  className="font-display text-base font-semibold text-rentify-navy"
                >
                  Amenities
                </h2>
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {property.amenities.map((amenity) => (
                    <li
                      key={amenity}
                      className="rounded-full border border-rentify-purpleLight bg-rentify-purpleLight3 px-3 py-1 text-sm font-medium text-rentify-navy"
                    >
                      {amenity}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {rentalRules.length > 0 && (
              <section
                className="mt-6 rounded-2xl bg-rentify-whiteOff px-4 py-4"
                aria-labelledby="rental-rules-heading"
              >
                <h2
                  id="rental-rules-heading"
                  className="font-display text-base font-semibold text-rentify-navy"
                >
                  Rental Preferences &amp; Property Rules
                </h2>
                <ul className="mt-2.5 space-y-1.5">
                  {rentalRules.map((row) => (
                    <li
                      key={row.label}
                      className="flex flex-wrap items-baseline gap-1.5 text-sm"
                    >
                      <span className="font-semibold text-rentify-navy">
                        {row.label}:
                      </span>
                      <span className="text-rentify-grayMuted">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {bookingNotice && (
              <p
                className="mt-5 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600"
                role="alert"
              >
                {bookingNotice}
              </p>
            )}

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Button size="lg" onClick={() => navigate(`/chat/${property.id}`)}>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
                Chat with Owner
              </Button>
              <Button
                size="lg"
                variant={favorite ? 'secondary' : 'outline'}
                onClick={() => toggleFavorite(property.id)}
                aria-pressed={favorite}
              >
                <svg
                  className="h-5 w-5 text-rentify-deepNavy"
                  fill={favorite ? 'currentColor' : 'none'}
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
                {favorite ? 'Saved Property' : 'Save Property'}
              </Button>
              {!isBuyer && (
                <Button size="lg" onClick={handleStartAgreement}>
                  Start Rent Agreement
                </Button>
              )}
              <Button size="lg" variant="secondary" onClick={handleRequestViewing}>
                {isBuyer ? 'Request Site Visit' : 'Request Viewing'}
              </Button>
              <Button size="lg" variant="ghost" onClick={() => navigate('/search')}>
                Back to Search
              </Button>
            </div>
          </div>
        </div>

        <section
          aria-labelledby="property-insights-heading"
          className="mt-8"
        >
          <h2
            id="property-insights-heading"
            className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
          >
            Rentify insights
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <ScoreMetricCard
              title="Compatibility Score"
              score={property.matchScore}
              subtitle="Based on your budget, lifestyle & commute"
              variant="compatibility"
            />
            <ScoreMetricCard
              title="Property Health"
              score={property.healthScore}
              subtitle="Cleanliness, maintenance & safety"
              variant="health"
            />
            {forSale ? (
              <ScoreMetricCard
                title="Risk Level"
                score={riskScore}
                subtitle="Based on condition & listing history"
                variant="risk"
              />
            ) : (
              <ScoreMetricCard
                title="Est. Cost"
                score={estMonthly}
                subtitle="Rent + maintenance + utilities"
                variant="cost"
              />
            )}
          </div>
        </section>

        {!forSale && (
          <section
            aria-labelledby="cost-breakdown-heading"
            className="mt-8"
          >
            <h2
              id="cost-breakdown-heading"
              className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
            >
              Cost breakdown
            </h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-rentify-grayLight bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <tbody>
                  {[
                    {
                      label: 'Monthly rent',
                      value: formatCurrency(property.price),
                    },
                    {
                      label: 'Maintenance',
                      value: `${formatCurrency(property.maintenance)}/month`,
                    },
                    {
                      label: 'Estimated utilities',
                      value: `${formatCurrency(Math.round(property.size * 4))}/month`,
                    },
                    {
                      label: 'Security deposit (one-time)',
                      value: formatCurrency(property.securityDeposit),
                    },
                    {
                      label: 'Estimated monthly total',
                      value: `${formatCurrency(estMonthly)}/month`,
                      strong: true,
                    },
                  ].map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-rentify-grayLight last:border-0"
                    >
                      <th
                        scope="row"
                        className="px-4 py-3 text-left font-medium text-rentify-grayMuted"
                      >
                        {row.label}
                      </th>
                      <td
                        className={`px-4 py-3 text-right ${
                          row.strong
                            ? 'font-display text-base font-bold text-rentify-navy'
                            : 'font-medium text-rentify-navy'
                        }`}
                      >
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        property={property}
        tenantName={user?.name ?? 'Guest'}
        ownerName={ownerDisplayName ?? 'Property Owner'}
        onSubmit={async ({ date, time, note }) => {
          await addBooking({
            propertyId: property.id,
            date,
            time,
            note,
          })
          setBookingOpen(false)
          setBookingNotice('')
          navigate('/bookings')
        }}
      />
    </div>
  )
}

export default PropertyDetailsPage
