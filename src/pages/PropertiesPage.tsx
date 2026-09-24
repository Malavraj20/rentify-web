import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { PropertyCard } from '../components/ui/PropertyCard'
import { StatCard } from '../components/ui/StatCard'
import { useAuth } from '../context/AuthContext'
import { useProperties } from '../context/PropertiesContext'
import { useAgreements } from '../context/AgreementsContext'
import { useFavorites } from '../context/FavoritesContext'
import { formatCurrency } from '../utils/currency'
import {
  agreementStatusVariant,
  isAgreementActive,
  isAgreementInProgress,
} from '../utils/agreementStatus'
import type { Property } from '../types'

const PropertiesPage = () => {
  const navigate = useNavigate()
  const { user, role, isAuthenticated } = useAuth()
  const { properties, getPropertiesByOwner, deleteProperty } = useProperties()
  const { agreements } = useAgreements()
  const { isFavorite, toggleFavorite } = useFavorites()

  const isOwnerView = isAuthenticated && role === 'owner' && user !== null

  const visibleProperties: Property[] = useMemo(() => {
    if (isOwnerView && user) {
      return getPropertiesByOwner(user.id)
    }
    return properties.filter((property) => property.status !== 'draft' || isOwnerView || role === 'admin')
  }, [isOwnerView, role, user, properties, getPropertiesByOwner])

  const ownerStats = useMemo(() => {
    if (!isOwnerView) return null
    const list = visibleProperties
    const views = list.reduce((sum, p) => sum + p.views, 0)
    const interested = list.reduce((sum, p) => sum + p.interestedTenants.length, 0)
    const activeListings = list.filter((p) => p.status === 'active').length
    const draftListings = list.filter((p) => p.status === 'draft').length
    const active = agreements.filter(
      (a) => a.ownerId === user?.id && isAgreementActive(a.status),
    ).length
    const pending = agreements.filter(
      (a) => a.ownerId === user?.id && isAgreementInProgress(a.status),
    ).length
    const totalRent = list.reduce((sum, p) => sum + p.price, 0)
    return {
      count: list.length,
      views,
      interested,
      active,
      pending,
      totalRent,
      activeListings,
      draftListings,
    }
  }, [isOwnerView, visibleProperties, agreements, user])

  const title = isOwnerView
    ? 'My Properties'
    : role === 'admin'
      ? 'All Properties'
      : 'Properties'

  const subtitle = isOwnerView
    ? 'Manage your Vadodara listings — rent, views, interest and agreements'
    : role === 'admin'
      ? 'Every listing on the Rentify platform'
      : 'Browse all Vadodara listings on Rentify'

  const handleDelete = async (property: Property) => {
    if (!isOwnerView || !user || property.ownerId !== user.id) return
    const confirmed = window.confirm(
      `Delete "${property.title}"? This cannot be undone.`,
    )
    if (!confirmed) return
    try {
      await deleteProperty(property.id)
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Could not delete the property.',
      )
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-rentify-grayMuted">
              {subtitle} · {visibleProperties.length}{' '}
              {visibleProperties.length === 1 ? 'listing' : 'listings'}
            </p>
          </div>
          <div className="flex gap-2">
            {isOwnerView && (
              <>
                <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                  Owner dashboard
                </Button>
                <Button onClick={() => navigate('/owner/properties/new')}>
                  Add property
                </Button>
              </>
            )}
            {!isOwnerView && (
              <Button onClick={() => navigate('/search')}>Open search</Button>
            )}
          </div>
        </div>

        {isOwnerView && ownerStats && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Listed properties"
              value={ownerStats.count}
              hint={`${ownerStats.activeListings} active · ${ownerStats.draftListings} draft`}
            />
            <StatCard
              label="Property views"
              value={ownerStats.views.toLocaleString('en-IN')}
              hint="Total listing views"
            />
            <StatCard
              label="Interested tenants"
              value={ownerStats.interested}
              hint="Across your listings"
            />
            <StatCard
              label="Expected rent"
              value={`${formatCurrency(ownerStats.totalRent)}/mo`}
              hint={`${ownerStats.active} active · ${ownerStats.pending} in progress`}
            />
          </div>
        )}

        {visibleProperties.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-rentify-grayLight bg-white px-6 py-14 text-center shadow-sm">
            <h2 className="font-display text-lg font-semibold text-rentify-navy">
              {isOwnerView ? 'No properties under this account yet' : 'No properties yet'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-rentify-grayMuted">
              {isOwnerView
                ? 'Add your first Vadodara listing to start receiving inquiries.'
                : 'No properties have been listed yet. Check back soon.'}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              {isOwnerView ? (
                <>
                  <Button onClick={() => navigate('/owner/properties/new')}>
                    Add property
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/auth')}>
                    Switch account
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate('/auth')}>Switch account</Button>
              )}
            </div>
          </div>
        ) : isOwnerView ? (
          <div className="mt-7 space-y-4">
            {visibleProperties.map((property) => {
              const agreement = agreements.find(
                (a) => a.propertyId === property.id && a.ownerId === user?.id,
              )
              return (
                <article
                  key={property.id}
                  className="flex flex-col gap-4 rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:flex-row sm:items-center"
                >
                  <div
                    className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-rentify-purpleLight2 sm:h-24 sm:w-36"
                    aria-hidden
                  >
                    <img
                      src={property.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-semibold text-rentify-navy">
                        <button
                          type="button"
                          onClick={() => navigate(`/properties/${property.id}`)}
                          className="text-left transition-colors hover:text-rentify-lightNavy focus-visible:underline"
                        >
                          {property.title}
                        </button>
                      </h2>
                      <Badge
                        variant={property.status === 'draft' ? 'default' : 'success'}
                      >
                        {property.status === 'draft' ? 'Draft' : 'Active'}
                      </Badge>
                      <Badge variant={agreementStatusVariant(agreement?.status)}>
                        {agreement?.status ?? 'No agreement'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-rentify-grayMuted">
                      {property.address} · {formatCurrency(property.price)}/month
                      · {property.views.toLocaleString('en-IN')} views ·{' '}
                      {property.interestedTenants.length} interested tenants
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/chat/${property.id}`)}
                    >
                      Chat
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/properties/${property.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/owner/properties/${property.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(property)}>
                      Delete
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProperties.map((property) => (
              <div key={property.id}>
                <PropertyCard
                  property={property}
                  isFavorite={isFavorite(property.id)}
                  onFavorite={() => toggleFavorite(property.id)}
                  onViewDetails={() => navigate(`/properties/${property.id}`)}
                  onChat={() => navigate(`/chat/${property.id}`)}
                />
                <p className="mt-2 px-1 text-xs text-rentify-grayMuted">
                  Owner: {property.ownerName ?? 'Property Owner'}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default PropertiesPage
