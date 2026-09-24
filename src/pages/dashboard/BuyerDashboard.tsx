import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ScoreMetricCard } from '../../components/ui/ScoreMetricCard'
import { StatCard } from '../../components/ui/StatCard'
import { PropertyCard } from '../../components/ui/PropertyCard'
import { BookingModal } from '../../components/features/BookingModal'
import { useFavorites } from '../../context/FavoritesContext'
import { useRecentlyViewed } from '../../context/RecentlyViewedContext'
import { useProperties } from '../../context/PropertiesContext'
import { useAuth } from '../../context/AuthContext'
import { useBookings } from '../../context/BookingsContext'
import { formatCurrency } from '../../utils/currency'
import { readBuyerPreferences, saveBuyerPreferences as saveBuyerPreferencesLocal } from '../BuyerPreferencesPage'
import { fetchBuyerPreferences, readToken } from '../../utils/preferencesApi'
import type { AuthUser, Property } from '../../types'

function average(values: number[], fallback: number): number {
  if (values.length === 0) return fallback
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function forSalePrice(property: Property): number | null {
  return typeof property.sellingPrice === 'number' && property.sellingPrice > 0
    ? property.sellingPrice
    : null
}

const BuyerDashboard = ({ user }: { user: AuthUser }) => {
  const navigate = useNavigate()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const { recentlyViewed } = useRecentlyViewed()
  const { properties, getPropertyById } = useProperties()
  const { isAuthenticated } = useAuth()
  const { addBooking } = useBookings()
  const [siteVisit, setSiteVisit] = useState<Property | null>(null)
  const [notice, setNotice] = useState('')

  const favoriteProperties = useMemo(
    () => properties.filter((property) => favorites.includes(property.id)),
    [properties, favorites],
  )

  const recentProperties = useMemo(
    () =>
      recentlyViewed
        .map((id) => getPropertyById(id))
        .filter((property): property is NonNullable<typeof property> => Boolean(property)),
    [recentlyViewed, getPropertyById],
  )

  const saleListings = useMemo(
    () => properties.filter((property) => forSalePrice(property) !== null),
    [properties],
  )

  const insights = useMemo(() => {
    const source = favoriteProperties.length > 0 ? favoriteProperties : saleListings
    return {
      avgSell: average(source.map((p) => forSalePrice(p)).filter((v): v is number => v !== null), 0),
      forSaleCount: source.filter((p) => forSalePrice(p) !== null).length,
      match: average(source.map((p) => p.matchScore), 0),
      health: average(source.map((p) => p.healthScore), 0),
    }
  }, [favoriteProperties, saleListings])

  const budget = user.budget ?? 4500000
  const [savedPreferences, setSavedPreferences] = useState(() =>
    readBuyerPreferences(user.id),
  )

  useEffect(() => {
    const local = readBuyerPreferences(user.id)
    if (local) setSavedPreferences(local)
    let cancelled = false
    void (async () => {
      const token = readToken()
      const remote = await fetchBuyerPreferences(token)
      if (cancelled) return
      if (remote.ok && remote.data) {
        setSavedPreferences(remote.data)
        saveBuyerPreferencesLocal(user.id, remote.data)
      } else if (!local) {
        setSavedPreferences(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user.id])

  const handleContactOwner = (property: Property) => {
    if (!isAuthenticated) {
      navigate('/auth')
      return
    }
    navigate(`/chat/${property.id}`)
  }

  const handleRequestSiteVisit = (property: Property) => {
    if (!isAuthenticated) {
      navigate('/auth')
      return
    }
    setNotice('')
    setSiteVisit(property)
  }

  const handleRequestPurchase = (property: Property) => {
    if (!isAuthenticated) {
      navigate('/auth')
      return
    }
    setNotice(
      `Purchase interest noted for “${property.title}”. No payment is taken in this demo — contact the owner to proceed.`,
    )
    navigate(`/chat/${property.id}`)
  }

  const renderActions = (property: Property) => (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={() => navigate(`/properties/${property.id}`)}>
        View Property
      </Button>
      <Button size="sm" variant="outline" onClick={() => handleContactOwner(property)}>
        Contact Owner
      </Button>
      <Button size="sm" variant="outline" onClick={() => handleRequestSiteVisit(property)}>
        Request Site Visit
      </Button>
      <Button size="sm" variant="ghost" onClick={() => handleRequestPurchase(property)}>
        Request Purchase
      </Button>
    </div>
  )

  return (
    <div className="space-y-10">
      <section
        aria-labelledby="buyer-profile"
        className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-rentify-navy text-lg font-bold text-white"
            aria-hidden
          >
            {user.name
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="buyer-profile" className="font-display text-xl font-bold text-rentify-navy">
              {user.name}
            </h2>
            <p className="text-sm text-rentify-grayMuted">{user.email}</p>
          </div>
          <Badge variant="default" size="lg">
            Buyer
          </Badge>
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-rentify-whiteOff px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
              Preferred area
            </dt>
            <dd className="mt-1 text-sm font-semibold text-rentify-navy">
              {user.preferredLocation ?? 'Gotri'}, Vadodara
            </dd>
          </div>
          <div className="rounded-xl bg-rentify-whiteOff px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
              Purchase budget
            </dt>
            <dd className="mt-1 text-sm font-semibold text-rentify-navy">
              up to {formatCurrency(budget)}
            </dd>
          </div>
          <div className="rounded-xl bg-rentify-whiteOff px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
              Shortlist
            </dt>
            <dd className="mt-1 text-sm font-semibold text-rentify-navy">
              {favoriteProperties.length} saved · {insights.forSaleCount} for sale
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/buyer/preferences')}
          >
            {savedPreferences ? 'Update Preferences' : 'Complete Questionnaire'}
          </Button>
        </div>
      </section>

      <section aria-labelledby="buyer-insights">
        <h2 id="buyer-insights" className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl">
          Buyer Insights
        </h2>
        <p className="mt-1 text-sm text-rentify-grayMuted">
          {favoriteProperties.length > 0
            ? `Based on your ${favoriteProperties.length} saved ${
                favoriteProperties.length === 1 ? 'property' : 'properties'
              }`
            : 'Based on all Vadodara listings for sale — save properties to personalize'}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Avg. selling price"
            value={formatCurrency(insights.avgSell)}
            hint="Across homes available to buy"
          />
          <StatCard
            label="Homes for sale"
            value={insights.forSaleCount}
            hint="Listings with a selling price"
          />
          <ScoreMetricCard
            title="Compatibility"
            score={insights.match}
            subtitle="Budget, lifestyle & commute fit"
            variant="compatibility"
          />
          <ScoreMetricCard
            title="Property health"
            score={insights.health}
            subtitle="Maintenance, safety & condition"
            variant="health"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigate('/search')}>
            Open search
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navigate('/favorites')}>
            Open favorites
          </Button>
        </div>
      </section>

      {notice && (
        <p
          className="rounded-xl bg-rentify-purpleLight3 px-4 py-3 text-sm font-medium text-rentify-navy"
          role="status"
        >
          {notice}
        </p>
      )}

      <section aria-labelledby="buyer-saved">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="buyer-saved" className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl">
              Saved Properties
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              {favoriteProperties.length} saved for purchase review
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/favorites')}
            className="text-sm font-semibold text-rentify-navy transition-colors hover:text-rentify-lightNavy"
          >
            View all favorites
          </button>
        </div>
        {favoriteProperties.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {favoriteProperties.map((property) => (
              <div key={property.id} className="flex h-full flex-col">
                <PropertyCard
                  property={property}
                  isFavorite={isFavorite(property.id)}
                  onFavorite={() => toggleFavorite(property.id)}
                  onViewDetails={() => navigate(`/properties/${property.id}`)}
                  onChat={() => navigate(`/chat/${property.id}`)}
                  className="flex-1"
                />
                {renderActions(property)}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-rentify-grayLight bg-white px-5 py-10 text-center text-sm text-rentify-grayMuted">
            No saved properties yet — tap the heart on any listing.
            <div className="mt-4">
              <Button size="sm" onClick={() => navigate('/search')}>
                Browse properties
              </Button>
            </div>
          </div>
        )}
      </section>

      {recentProperties.length > 0 && (
        <section aria-labelledby="buyer-recent">
          <h2 id="buyer-recent" className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl">
            Recently Viewed
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {recentProperties.map((property) => (
              <div key={property.id} className="flex h-full flex-col">
                <PropertyCard
                  property={property}
                  isFavorite={isFavorite(property.id)}
                  onFavorite={() => toggleFavorite(property.id)}
                  onViewDetails={() => navigate(`/properties/${property.id}`)}
                  onChat={() => navigate(`/chat/${property.id}`)}
                  className="flex-1"
                />
                {renderActions(property)}
              </div>
            ))}
          </div>
        </section>
      )}

      {siteVisit && (
        <BookingModal
          isOpen
          onClose={() => setSiteVisit(null)}
          property={siteVisit}
          tenantName={user.name}
          ownerName={siteVisit.ownerName ?? 'Property Owner'}
          onSubmit={async ({ date, time, note }) => {
            await addBooking({
              propertyId: siteVisit.id,
              date,
              time,
              note,
            })
            setSiteVisit(null)
            setNotice('Site visit request saved. Track it under Bookings.')
            navigate('/bookings')
          }}
        />
      )}
    </div>
  )
}

export default BuyerDashboard
