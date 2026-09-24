import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { StatCard } from '../../components/ui/StatCard'
import { useBookings } from '../../context/BookingsContext'
import { useAgreements } from '../../context/AgreementsContext'
import { useProperties } from '../../context/PropertiesContext'
import { formatCurrency } from '../../utils/currency'
import {
  agreementStatusVariant,
  isAgreementActive,
} from '../../utils/agreementStatus'
import type { AuthUser } from '../../types'

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const OwnerDashboard = ({ user }: { user: AuthUser }) => {
  const navigate = useNavigate()
  const { bookings } = useBookings()
  const { agreements, approveAgreement } = useAgreements()
  const { properties, getPropertyById } = useProperties()

  const myProperties = useMemo(
    () => properties.filter((property) => property.ownerId === user.id),
    [properties, user.id],
  )

  const myAgreements = useMemo(
    () => agreements.filter((agreement) => agreement.ownerId === user.id),
    [agreements, user.id],
  )

  const myBookings = useMemo(
    () =>
      bookings
        .filter((booking) => booking.ownerId === user.id)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [bookings, user.id],
  )

  const activeCount = myProperties.filter((p) => p.status === 'active').length
  const draftCount = myProperties.filter((p) => p.status === 'draft').length

  const totalViews = myProperties.reduce((sum, p) => sum + p.views, 0)
  const interestedCount = myProperties.reduce(
    (sum, p) => sum + p.interestedTenants.length,
    0,
  )
  const activeAgreements = myAgreements.filter((a) =>
    isAgreementActive(a.status),
  )
  const monthlyIncome = activeAgreements.reduce(
    (sum, a) => sum + a.monthlyRent,
    0,
  )
  const expectedIncome = myProperties.reduce((sum, p) => sum + p.price, 0)
  const pendingAgreements = myAgreements.filter(
    (a) => a.status === 'Pending',
  )

  const interestedTenants = useMemo(() => {
    const rows: { name: string; propertyTitle: string; propertyId: string }[] = []
    for (const property of myProperties) {
      for (const name of property.interestedTenants) {
        rows.push({
          name,
          propertyTitle: property.title,
          propertyId: property.id,
        })
      }
    }
    return rows
  }, [myProperties])

  const hasPortfolio = myProperties.length > 0
  const ownerListings = myProperties

  return (
    <div className="space-y-10">
      {/* Profile */}
      <section
        aria-labelledby="owner-profile"
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
            <h2
              id="owner-profile"
              className="font-display text-xl font-bold text-rentify-navy"
            >
              {user.name}
            </h2>
            <p className="text-sm text-rentify-grayMuted">{user.email}</p>
          </div>
          <Badge variant="success" size="lg">
            Property Owner
          </Badge>
        </div>
      </section>

      {/* Statistics */}
      <section aria-labelledby="owner-stats">
        <h2
          id="owner-stats"
          className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
        >
          Property Statistics
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Listed properties"
            value={myProperties.length}
            hint={`${activeCount} active · ${draftCount} draft`}
          />
          <StatCard
            label="Property views"
            value={totalViews.toLocaleString('en-IN')}
            hint="Total listing views"
          />
          <StatCard
            label="Interested tenants"
            value={interestedCount}
            hint="Across your listings"
          />
          <StatCard
            label="Active agreements"
            value={activeAgreements.length}
            hint={`${pendingAgreements.length} awaiting your approval`}
          />
        </div>
      </section>

      {/* Rental income */}
      <section aria-labelledby="owner-income">
        <h2
          id="owner-income"
          className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
        >
          Rental Income
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
              Monthly income (active)
            </p>
            <p className="mt-3 font-display text-3xl font-bold tracking-tight text-rentify-navy">
              {formatCurrency(monthlyIncome)}
              <span className="text-base font-medium text-rentify-grayMuted">
                /month
              </span>
            </p>
            <p className="mt-1.5 text-sm text-rentify-grayMuted">
              From {activeAgreements.length} active{' '}
              {activeAgreements.length === 1 ? 'agreement' : 'agreements'}
            </p>
          </div>
          <div className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
              Expected income (all listings)
            </p>
            <p className="mt-3 font-display text-3xl font-bold tracking-tight text-rentify-navy">
              {formatCurrency(expectedIncome)}
              <span className="text-base font-medium text-rentify-grayMuted">
                /month
              </span>
            </p>
            <p className="mt-1.5 text-sm text-rentify-grayMuted">
              If every listed property is rented out
            </p>
          </div>
        </div>
      </section>

      {/* Properties */}
      <section aria-labelledby="owner-properties">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="owner-properties"
              className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
            >
              My Properties
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              Location, rent, views, interest and agreement status
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/properties')}>
            Manage properties
          </Button>
        </div>

        {ownerListings.length > 0 || hasPortfolio ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-rentify-grayLight bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-rentify-grayLight bg-rentify-whiteOff text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                    <th scope="col" className="px-4 py-3">
                      Property
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Location
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Rent
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Views
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Interested
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Agreement
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(ownerListings.length > 0 ? ownerListings : myProperties).map((property) => {
                    const agreement = myAgreements.find(
                      (a) => a.propertyId === property.id,
                    )
                    return (
                      <tr
                        key={property.id}
                        className="border-b border-rentify-grayLight transition-colors last:border-0 hover:bg-rentify-purpleLight3"
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/properties/${property.id}`)}
                            className="font-medium text-rentify-navy transition-colors hover:text-rentify-lightNavy focus-visible:outline-none focus-visible:underline"
                          >
                            {property.title}
                          </button>
                          <span className="block text-xs text-rentify-grayMuted">
                            {property.type} · {property.furnishing}
                          </span>
                          {property.rentalPreferences &&
                            property.listingFor !== 'sale' && (
                              <span className="mt-1 inline-block">
                                <Badge variant="success" size="sm">
                                  Rental Preferences Set
                                </Badge>
                              </span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              property.status === 'draft' ? 'default' : 'success'
                            }
                          >
                            {property.status === 'draft' ? 'DRAFT' : 'ACTIVE'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-rentify-grayMuted">
                          {property.location}
                        </td>
                        <td className="px-4 py-3 font-medium text-rentify-navy">
                          {formatCurrency(property.price)}
                        </td>
                        <td className="px-4 py-3 text-rentify-grayMuted">
                          {property.views.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-rentify-grayMuted">
                          {property.interestedTenants.length}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={agreementStatusVariant(agreement?.status)}>
                            {agreement?.status ?? 'No agreement'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-rentify-grayLight bg-white px-5 py-10 text-center text-sm text-rentify-grayMuted">
            <p className="font-display text-base font-semibold text-rentify-navy">
              No properties listed under this account yet
            </p>
            <p className="mx-auto mt-1.5 max-w-md">
              List your first property to see a full portfolio with views,
              tenants and income.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" onClick={() => navigate('/auth')}>
                Switch account
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/search')}
              >
                Browse platform listings
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Interested tenants */}
      <section aria-labelledby="owner-tenants">
        <h2
          id="owner-tenants"
          className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
        >
          Interested Tenants
        </h2>
        {interestedTenants.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {interestedTenants.map((row) => (
              <div
                key={`${row.name}-${row.propertyId}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-rentify-grayLight bg-white px-4 py-3.5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-rentify-navy">
                    {row.name}
                  </p>
                  <p className="truncate text-sm text-rentify-grayMuted">
                    Interested in {row.propertyTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/chat/${row.propertyId}`)}
                  className="shrink-0 text-sm font-semibold text-rentify-navy transition-colors hover:text-rentify-lightNavy"
                >
                  Message
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-rentify-grayLight bg-white px-5 py-8 text-center text-sm text-rentify-grayMuted">
            No tenant interest recorded yet.
          </div>
        )}
      </section>

      {/* Viewings */}
      <section aria-labelledby="owner-viewings">
        <h2
          id="owner-viewings"
          className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
        >
          Viewing Requests
        </h2>
        {myBookings.length > 0 ? (
          <div className="mt-4 space-y-3">
            {myBookings.slice(0, 5).map((booking) => (
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
                    {booking.tenantName} · {formatDate(booking.date)} at{' '}
                    {booking.time}
                  </p>
                </div>
                <Badge
                  variant={
                    booking.status === 'Confirmed' ||
                    booking.status === 'Completed'
                      ? 'success'
                      : booking.status === 'Requested'
                        ? 'caution'
                        : 'destructive'
                  }
                >
                  {booking.status}
                </Badge>
              </div>
            ))}
            <button
              type="button"
              onClick={() => navigate('/bookings')}
              className="text-sm font-semibold text-rentify-navy transition-colors hover:text-rentify-lightNavy"
            >
              Manage all viewings
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-rentify-grayLight bg-white px-5 py-8 text-center text-sm text-rentify-grayMuted">
            No viewing requests yet.
          </div>
        )}
      </section>

      {/* Agreements */}
      <section aria-labelledby="owner-agreements">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="owner-agreements"
              className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
            >
              Agreements
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              Approve pending agreements and track active ones
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
            {myAgreements.map((agreement) => (
              <div
                key={agreement.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rentify-grayLight bg-white px-4 py-3.5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-rentify-navy">
                    {getPropertyById(agreement.propertyId)?.title ??
                      'Property unavailable'}
                  </p>
                  <p className="text-sm text-rentify-grayMuted">
                    {agreement.tenantName} ·{' '}
                    {formatCurrency(agreement.monthlyRent)}/month ·{' '}
                    {formatDate(agreement.startDate)} →{' '}
                    {formatDate(agreement.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={agreementStatusVariant(agreement.status)}>
                    {agreement.status}
                  </Badge>
                  {agreement.status === 'Pending' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        void approveAgreement(agreement.id).catch((err) => {
                          window.alert(
                            err instanceof Error
                              ? err.message
                              : 'Could not approve agreement.',
                          )
                        })
                      }}
                    >
                      Approve
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/agreements/${agreement.id}`)}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-rentify-grayLight bg-white px-5 py-8 text-center text-sm text-rentify-grayMuted">
            No agreements for your properties yet.
          </div>
        )}
      </section>
    </div>
  )
}

export default OwnerDashboard
