import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useProperties } from '../context/PropertiesContext'
import { useBookings } from '../context/BookingsContext'
import { useAuth } from '../context/AuthContext'
import type { Booking, BookingStatus } from '../types'

const statusVariant: Record<
  BookingStatus,
  'default' | 'success' | 'caution' | 'destructive'
> = {
  Requested: 'caution',
  Confirmed: 'default',
  Completed: 'success',
  Cancelled: 'destructive',
  Rejected: 'destructive',
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const BookingsPage = () => {
  const navigate = useNavigate()
  const { bookings, updateBookingStatus, cancelBooking } = useBookings()
  const { user, role, isAuthenticated } = useAuth()
  const { getPropertyById } = useProperties()

  const visibleBookings = useMemo(() => {
    if (!isAuthenticated || !user) return bookings
    if (role === 'owner') {
      return bookings.filter((booking) => booking.ownerId === user.id)
    }
    if (role === 'admin') return bookings
    return bookings.filter(
      (booking) =>
        booking.tenantId === user.id || booking.tenantName === user.name,
    )
  }, [bookings, isAuthenticated, role, user])

  const canAct = (booking: Booking) => {
    if (!isAuthenticated || !user) return false
    if (role === 'admin') return false
    if (role === 'owner') return booking.ownerId === user.id
    return booking.tenantId === user.id || booking.tenantName === user.name
  }

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
              My Bookings
            </h1>
            <p className="mt-2 text-rentify-grayMuted">
              Property viewings with owner, date, time and status.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/search')}>
            Find more properties
          </Button>
        </div>

        {!isAuthenticated ? (
          <div className="mt-7 rounded-2xl border border-rentify-grayLight bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="font-display text-lg font-semibold text-rentify-navy">
              Sign in to see your bookings
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-rentify-grayMuted">
              Bookings are tied to your Rentify account. Sign in to request and
              track viewings.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => navigate('/auth')}>Sign In</Button>
            </div>
          </div>
        ) : visibleBookings.length > 0 ? (
          <div className="mt-7 space-y-4">
            {visibleBookings.map((booking) => {
              const property = getPropertyById(booking.propertyId)
              return (
                <article
                  key={booking.id}
                  className="flex flex-col gap-4 rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:flex-row sm:items-center"
                >
                  <div
                    className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-rentify-purpleLight2 sm:h-20 sm:w-32"
                    aria-hidden
                  >
                    {property && (
                      <img
                        src={property.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-semibold text-rentify-navy">
                        {property ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/properties/${property.id}`)
                            }
                            className="text-left transition-colors hover:text-rentify-lightNavy focus-visible:outline-none focus-visible:underline"
                          >
                            {property.title}
                          </button>
                        ) : (
                          'Property unavailable'
                        )}
                      </h2>
                      <Badge variant={statusVariant[booking.status]}>
                        {booking.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-rentify-grayMuted">
                      {property
                        ? `${property.location}, Vadodara`
                        : 'Listing removed'}{' '}
                      · {formatDate(booking.date)} at {booking.time}
                    </p>
                    <p className="mt-0.5 text-sm text-rentify-grayMuted">
                      Tenant: <strong className="font-medium">{booking.tenantName}</strong>{' '}
                      · Owner: <strong className="font-medium">{booking.ownerName}</strong>
                    </p>
                    {booking.note && (
                      <p className="mt-1 text-xs italic text-rentify-grayMuted">
                        “{booking.note}”
                      </p>
                    )}
                  </div>

                  {canAct(booking) &&
                    (booking.status === 'Requested' ||
                      booking.status === 'Confirmed') && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {booking.status === 'Requested' && role === 'owner' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                void updateBookingStatus(
                                  booking.id,
                                  'Confirmed',
                                ).catch((err) => {
                                  window.alert(
                                    err instanceof Error
                                      ? err.message
                                      : 'Could not confirm booking.',
                                  )
                                })
                              }}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                void updateBookingStatus(
                                  booking.id,
                                  'Rejected',
                                ).catch((err) => {
                                  window.alert(
                                    err instanceof Error
                                      ? err.message
                                      : 'Could not reject booking.',
                                  )
                                })
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {booking.status === 'Confirmed' && role === 'owner' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              void updateBookingStatus(
                                booking.id,
                                'Completed',
                              ).catch((err) => {
                                window.alert(
                                  err instanceof Error
                                    ? err.message
                                    : 'Could not complete booking.',
                                )
                              })
                            }}
                          >
                            Mark completed
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void cancelBooking(booking.id).catch((err) => {
                              window.alert(
                                err instanceof Error
                                  ? err.message
                                  : 'Could not cancel booking.',
                              )
                            })
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-rentify-grayLight bg-white px-6 py-14 text-center shadow-sm">
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
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-rentify-navy">
              No bookings yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-rentify-grayMuted">
              Open any property and tap “Request Viewing” to schedule a visit
              with the owner.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => navigate('/search')}>
                Browse properties
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default BookingsPage
