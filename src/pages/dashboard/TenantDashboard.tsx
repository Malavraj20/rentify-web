import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ScoreMetricCard } from '../../components/ui/ScoreMetricCard'
import { StatCard } from '../../components/ui/StatCard'
import { PropertyCard } from '../../components/ui/PropertyCard'
import { useFavorites } from '../../context/FavoritesContext'
import { useBookings } from '../../context/BookingsContext'
import { useAgreements } from '../../context/AgreementsContext'
import { useRecentlyViewed } from '../../context/RecentlyViewedContext'
import { useProperties } from '../../context/PropertiesContext'
import { formatCurrency } from '../../utils/currency'
import { estimatedMonthlyCost } from '../../utils/property'
import {
  agreementStatusVariant,
  isAgreementActive,
  isAgreementInProgress,
} from '../../utils/agreementStatus'
import type { AuthUser } from '../../types'

function average(values: number[], fallback: number): number {
  if (values.length === 0) return fallback
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  )
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function bookingStatusVariant(
  status: string,
): 'default' | 'success' | 'caution' | 'destructive' {
  if (status === 'Confirmed' || status === 'Completed') return 'success'
  if (status === 'Requested') return 'caution'
  if (status === 'Rejected' || status === 'Cancelled') return 'destructive'
  return 'default'
}

const TenantDashboard = ({ user }: { user: AuthUser }) => {
  const navigate = useNavigate()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const { bookings } = useBookings()
  const { agreements } = useAgreements()
  const { recentlyViewed } = useRecentlyViewed()
  const { properties, getPropertyById } = useProperties()

  const favoriteProperties = useMemo(
    () => properties.filter((property) => favorites.includes(property.id)),
    [favorites, properties],
  )

  const recentProperties = useMemo(
    () =>
      recentlyViewed
        .map((id) => getPropertyById(id))
        .filter((property): property is NonNullable<typeof property> =>
          Boolean(property),
        ),
    [recentlyViewed, getPropertyById],
  )

  const myBookings = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            booking.tenantId === user.id || booking.tenantName === user.name,
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [bookings, user],
  )

  const myAgreements = useMemo(
    () =>
      agreements.filter(
        (agreement) =>
          agreement.tenantId === user.id || agreement.tenantName === user.name,
      ),
    [agreements, user],
  )

  const upcomingViewings = myBookings.filter(
    (booking) =>
      (booking.status === 'Confirmed' || booking.status === 'Requested') &&
      booking.date >= new Date().toISOString().slice(0, 10),
  )

  const insights = useMemo(() => {
    const source = favoriteProperties.length > 0 ? favoriteProperties : properties
    return {
      avgRent: average(source.map((p) => p.price), 0),
      avgCost: average(source.map((p) => estimatedMonthlyCost(p)), 0),
      match: average(source.map((p) => p.matchScore), 0),
      health: average(source.map((p) => p.healthScore), 0),
      highRisk: source.filter((p) => p.riskLevel === 'high').length,
      lowRisk: source.filter((p) => p.riskLevel === 'low').length,
    }
  }, [favoriteProperties])

  const activeAgreement = myAgreements.find((a) => isAgreementActive(a.status))
  const pendingAgreement = myAgreements.find((a) =>
    isAgreementInProgress(a.status),
  )
  const nextViewing = upcomingViewings[0]
  const nextPayment = activeAgreement
    ? `Day ${activeAgreement.paymentDueDay} · ${formatCurrency(activeAgreement.monthlyRent)}`
    : 'No active agreement'

  const budget = user.budget ?? 20000

  return (
    <div className="space-y-10">
      {/* Profile */}
      <section aria-labelledby="tenant-profile" className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rentify-navy text-lg font-bold text-white" aria-hidden>
            {user.name
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="tenant-profile" className="font-display text-xl font-bold text-rentify-navy">
              {user.name}
            </h2>
            <p className="text-sm text-rentify-grayMuted">{user.email}</p>
          </div>
          <Badge variant="default" size="lg">Tenant</Badge>
          <Button variant="outline" size="sm" onClick={() => navigate('/preferences')}>
            Update Preferences
          </Button>
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-rentify-whiteOff px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
              Preferred location
            </dt>
            <dd className="mt-1 text-sm font-semibold text-rentify-navy">
              {user.preferredLocation ?? 'Alkapuri'}, Vadodara
            </dd>
          </div>
          <div className="rounded-xl bg-rentify-whiteOff px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
              Rental budget
            </dt>
            <dd className="mt-1 text-sm font-semibold text-rentify-navy">
              {formatCurrency(budget)}/month
            </dd>
          </div>
          <div className="rounded-xl bg-rentify-whiteOff px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
              Preferred bedrooms
            </dt>
            <dd className="mt-1 text-sm font-semibold text-rentify-navy">
              {user.preferredBedrooms ?? 2} BHK
            </dd>
          </div>
        </dl>
      </section>

      {/* Insights */}
      <section aria-labelledby="tenant-insights">
        <h2 id="tenant-insights" className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl">
          Rental Insights
        </h2>
        <p className="mt-1 text-sm text-rentify-grayMuted">
          {favoriteProperties.length > 0
            ? `Based on your ${favoriteProperties.length} saved ${
                favoriteProperties.length === 1 ? 'property' : 'properties'
              }`
            : 'Based on all Vadodara listings — save properties to personalize'}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Average rent"
            value={`${formatCurrency(insights.avgRent)}/mo`}
            hint="Across your shortlist"
          />
          <StatCard
            label="Est. monthly total"
            value={`${formatCurrency(insights.avgCost)}/mo`}
            hint="Rent + maintenance + utilities"
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
        <div className="mt-4 rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Risk indicator
              </p>
              <p className="mt-1 font-display text-lg font-bold text-rentify-navy">
                {insights.lowRisk} low-risk ·{' '}
                <span
                  className={
                    insights.highRisk > 0 ? 'text-red-500' : 'text-rentify-successGreen'
                  }
                >
                  {insights.highRisk} high-risk
                </span>{' '}
                listings
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/search')}>
              Review listings
            </Button>
          </div>
        </div>
      </section>

      {/* Upcoming */}
      <section aria-labelledby="tenant-upcoming">
        <h2 id="tenant-upcoming" className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl">
          Upcoming
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
              Rent payment
            </p>
            <p className="mt-2 font-display text-lg font-bold text-rentify-navy">
              {nextPayment}
            </p>
            {activeAgreement && (
              <p className="mt-1 text-xs text-rentify-grayMuted">
                {getPropertyById(activeAgreement.propertyId)?.title}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
              Agreement expiry
            </p>
            <p className="mt-2 font-display text-lg font-bold text-rentify-navy">
              {activeAgreement ? formatDate(activeAgreement.endDate) : '—'}
            </p>
            <p className="mt-1 text-xs text-rentify-grayMuted">
              {activeAgreement
                ? `${activeAgreement.noticePeriodDays}-day notice period`
                : 'No active agreement'}
            </p>
          </div>
          <div className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
              Next viewing
            </p>
            <p className="mt-2 font-display text-lg font-bold text-rentify-navy">
              {nextViewing
                ? `${formatDate(nextViewing.date)} · ${nextViewing.time}`
                : 'None scheduled'}
            </p>
            <p className="mt-1 text-xs text-rentify-grayMuted">
              {nextViewing
                ? getPropertyById(nextViewing.propertyId)?.title
                : 'Request one from any property'}
            </p>
          </div>
        </div>
      </section>

      {/* Bookings */}
      <section aria-labelledby="tenant-bookings">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="tenant-bookings" className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl">
              Bookings
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              Upcoming viewings and booking status
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/bookings')}
            className="text-sm font-semibold text-rentify-navy transition-colors hover:text-rentify-lightNavy"
          >
            View all bookings
          </button>
        </div>
        {myBookings.length > 0 ? (
          <div className="mt-4 space-y-3">
            {myBookings.slice(0, 4).map((booking) => (
              <div
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rentify-grayLight bg-white px-4 py-3.5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-rentify-navy">
                    {getPropertyById(booking.propertyId)?.title ??
                      'Property unavailable'}
                  </p>
                  <p className="text-sm text-rentify-grayMuted">
                    {formatDate(booking.date)} at {booking.time} · Owner:{' '}
                    {booking.ownerName}
                  </p>
                </div>
                <Badge variant={bookingStatusVariant(booking.status)}>
                  {booking.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-rentify-grayLight bg-white px-5 py-8 text-center text-sm text-rentify-grayMuted">
            No bookings yet — open a property and request a viewing.
          </div>
        )}
      </section>

      {/* Agreements */}
      <section aria-labelledby="tenant-agreements">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="tenant-agreements" className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl">
              Agreements
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              Active and pending rent agreements
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/agreements')}
            className="text-sm font-semibold text-rentify-navy transition-colors hover:text-rentify-lightNavy"
          >
            View all agreements
          </button>
        </div>
        {myAgreements.length > 0 ? (
          <div className="mt-4 space-y-3">
            {myAgreements.slice(0, 4).map((agreement) => (
              <button
                key={agreement.id}
                type="button"
                onClick={() => navigate(`/agreements/${agreement.id}`)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-rentify-grayLight bg-white px-4 py-3.5 text-left shadow-sm transition-colors hover:border-rentify-purpleLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-rentify-navy">
                    {getPropertyById(agreement.propertyId)?.title ??
                      'Property unavailable'}
                  </p>
                  <p className="text-sm text-rentify-grayMuted">
                    {formatCurrency(agreement.monthlyRent)}/month ·{' '}
                    {formatDate(agreement.startDate)} →{' '}
                    {formatDate(agreement.endDate)} · Owner:{' '}
                    {agreement.ownerName}
                  </p>
                </div>
                <Badge variant={agreementStatusVariant(agreement.status)}>
                  {agreement.status}
                </Badge>
              </button>
            ))}
            {pendingAgreement && (
              <p className="text-xs text-rentify-grayMuted">
                In-progress agreements need information, documents, signatures
                or lawyer review before completion.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-rentify-grayLight bg-white px-5 py-8 text-center text-sm text-rentify-grayMuted">
            No agreements yet — start one from a property page.
          </div>
        )}
      </section>

      {/* Saved properties */}
      <section aria-labelledby="tenant-saved">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="tenant-saved" className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl">
              Saved Properties
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              {favoriteProperties.length} saved ·{' '}
              <button
                type="button"
                onClick={() => navigate('/favorites')}
                className="font-semibold text-rentify-navy hover:text-rentify-lightNavy"
              >
                Open favorites
              </button>
            </p>
          </div>
        </div>
        {favoriteProperties.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {favoriteProperties.map((property) => (
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

      {/* Recently viewed */}
      {recentProperties.length > 0 && (
        <section aria-labelledby="tenant-recent">
          <h2 id="tenant-recent" className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl">
            Recently Viewed
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {recentProperties.map((property) => (
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
        </section>
      )}
    </div>
  )
}

export default TenantDashboard
