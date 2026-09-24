import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Button } from '../components/ui/Button'
import { PropertyCard } from '../components/ui/PropertyCard'
import { useProperties } from '../context/PropertiesContext'
import { useFavorites } from '../context/FavoritesContext'

const FavoritesPage = () => {
  const navigate = useNavigate()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const { properties } = useProperties()

  const savedProperties = useMemo(
    () => properties.filter((property) => favorites.includes(property.id)),
    [properties, favorites],
  )

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
              My Favorites
            </h1>
            <p className="mt-2 text-rentify-grayMuted" aria-live="polite">
              {savedProperties.length === 0
                ? 'No saved properties yet'
                : `${savedProperties.length} saved ${
                    savedProperties.length === 1 ? 'property' : 'properties'
                  }`}
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/search')}>
            Browse more properties
          </Button>
        </div>

        {savedProperties.length > 0 ? (
          <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {savedProperties.map((property) => (
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
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-rentify-navy">
              No saved properties yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-rentify-grayMuted">
              Tap the heart on any listing to save it here. Favorites persist
              after refresh and are available from any page.
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

export default FavoritesPage
