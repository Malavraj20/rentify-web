import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Footer } from '../components/common/Footer'
import { SearchBar } from '../components/ui/SearchBar'
import { PropertyCard } from '../components/ui/PropertyCard'
import { Button } from '../components/ui/Button'
import { useProperties } from '../context/PropertiesContext'
import { useFavorites } from '../context/FavoritesContext'
import { filtersToSearchParams } from '../utils/filterProperties'
import { formatCurrency } from '../utils/currency'

const benefits = [
  {
    title: 'Compatibility scores',
    body: 'Every listing is scored against your budget, lifestyle and commute so you shortlist smarter.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    ),
  },
  {
    title: 'True monthly cost estimates',
    body: 'Rent + maintenance + utilities in ₹ — see the real monthly number before you visit.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    title: 'Owner chat & agreements',
    body: 'Message the real property owner and raise a demo rent agreement — all in one place.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
      />
    ),
  },
]

const steps = [
  {
    step: '1',
    title: 'Search',
    body: 'Filter Vadodara homes by neighbourhood, rent range, BHK and property type.',
  },
  {
    step: '2',
    title: 'Connect',
    body: 'Save favourites, book a viewing and chat directly with the property owner.',
  },
  {
    step: '3',
    title: 'Agree',
    body: 'Create a demo rent agreement, upload signatures and activate it when both sides sign.',
  },
]

const LandingPage = () => {
  const navigate = useNavigate()
  const { properties } = useProperties()
  const { isFavorite, toggleFavorite } = useFavorites()

  const featured = properties
    .filter((property) => property.status !== 'draft')
    .slice(0, 3)

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-linear-to-b from-rentify-purpleLight3 via-rentify-purpleLight2/70 to-rentify-whiteOff">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-24 h-72 w-72 rounded-full bg-rentify-purpleLight blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 top-40 h-64 w-64 rounded-full bg-rentify-purpleLight2 blur-3xl"
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 md:pt-16">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="text-center lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-rentify-purpleLight bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-rentify-deepNavy shadow-sm">
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
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                  Smart rentals in Vadodara
                </span>
                <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-rentify-deepNavy sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
                  Find Your Perfect Home with{' '}
                  <span className="relative isolate inline-block whitespace-nowrap">
                    Rentify
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-full bg-rentify-purpleLight"
                    />
                  </span>
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-rentify-grayMuted sm:text-lg lg:mx-0">
                  Search verified Vadodara rentals, compare true monthly costs
                  in ₹, chat with real owners and sign demo rent agreements —
                  all in one place.
                </p>
                <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                  <Button
                    size="lg"
                    onClick={() => {
                      document
                        .getElementById('home-search')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    aria-label="Find a property"
                  >
                    Find a Property
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
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => navigate('/search')}
                    aria-label="Explore rentals"
                  >
                    Explore Rentals
                  </Button>
                </div>
              </div>

              {/* Hero visual */}
              <div className="relative hidden lg:block" aria-hidden>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <img
                      src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&h=340&fit=crop"
                      alt=""
                      className="h-40 w-full rounded-2xl object-cover shadow-lg ring-1 ring-black/5"
                    />
                    <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-black/5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                        Avg. 2 BHK rent
                      </p>
                      <p className="mt-1 font-display text-2xl font-bold text-rentify-deepNavy">
                        {formatCurrency(22500)}
                        <span className="text-sm font-medium text-rentify-grayMuted">
                          /month
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-black/5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                        Match score
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-rentify-grayLight">
                        <div className="h-full w-[92%] rounded-full bg-rentify-successGreen" />
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-rentify-deepNavy">
                        92% compatibility
                      </p>
                    </div>
                    <img
                      src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=340&fit=crop"
                      alt=""
                      className="h-40 w-full rounded-2xl object-cover shadow-lg ring-1 ring-black/5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search section */}
        <section
          id="home-search"
          aria-labelledby="home-search-heading"
          className="mx-auto -mt-2 max-w-4xl px-4 pt-2 sm:px-6"
        >
          <h2 id="home-search-heading" className="sr-only">
            Search rentals
          </h2>
          <SearchBar
            onSearch={(_query, filters) => {
              const qs = filtersToSearchParams(filters)
              navigate(qs ? `/search?${qs}` : '/search')
            }}
          />
        </section>

        {/* Featured properties */}
        <section
          aria-labelledby="featured-heading"
          className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 md:pb-16"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="featured-heading"
                className="font-display text-2xl font-bold tracking-tight text-rentify-deepNavy sm:text-3xl"
              >
                Featured Properties
              </h2>
              <p className="mt-1.5 text-rentify-grayMuted">
                Handpicked Vadodara listings with match, health and cost scores
              </p>
            </div>
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-rentify-deepNavy transition-colors hover:text-rentify-lightNavy"
            >
              View all
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
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {featured.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                isFavorite={isFavorite(prop.id)}
                onFavorite={() => toggleFavorite(prop.id)}
                onViewDetails={() => navigate(`/properties/${prop.id}`)}
                onChat={() => navigate(`/chat/${prop.id}`)}
              />
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section
          aria-labelledby="benefits-heading"
          className="bg-white py-12 md:py-16"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="benefits-heading"
                className="font-display text-2xl font-bold tracking-tight text-rentify-deepNavy sm:text-3xl"
              >
                Why renters choose Rentify
              </h2>
              <p className="mt-2 text-rentify-grayMuted">
                Everything you need to decide on a Vadodara home with
                confidence
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-rentify-grayLight bg-rentify-whiteOff p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-rentify-deepNavy text-white"
                    aria-hidden
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {benefit.icon}
                    </svg>
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-rentify-deepNavy">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-rentify-grayMuted">
                    {benefit.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          aria-labelledby="how-heading"
          className="mx-auto max-w-6xl px-4 py-12 md:py-16 sm:px-6"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="how-heading"
              className="font-display text-2xl font-bold tracking-tight text-rentify-deepNavy sm:text-3xl"
            >
              How Rentify Works
            </h2>
            <p className="mt-2 text-rentify-grayMuted">
              Three simple steps from search to signed agreement
            </p>
          </div>
          <ol className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {steps.map((item) => (
              <li
                key={item.step}
                className="relative rounded-2xl border border-rentify-grayLight bg-white p-6 shadow-sm"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-rentify-purpleLight font-display text-lg font-bold text-rentify-deepNavy"
                  aria-hidden
                >
                  {item.step}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-rentify-deepNavy">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-rentify-grayMuted">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-rentify-deepNavy via-rentify-deepNavy2 to-rentify-deepIndigo px-6 py-10 text-center shadow-lg sm:px-10 md:py-12">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to Find Your Next Home?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-white/75">
              Browse every Vadodara listing with match scores, health reports and
              true ₹ cost estimates in one place.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/search')}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-rentify-deepNavy shadow-sm transition-all hover:bg-white/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Browse All Properties
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth?mode=signup')}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/40 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Create Free Account
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-rentify-deepNavy text-white"
                aria-hidden
              >
                <svg
                  className="h-4.5 w-4.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10.5L12 3l9 7.5M5 9.75V21h14V9.75M9 21v-6h6v6"
                  />
                </svg>
              </span>
              <span className="font-display text-lg font-bold text-rentify-deepNavy">
                Rentify
              </span>
            </div>
            <p className="mt-3 leading-relaxed text-rentify-grayMuted">
              Your rental decision platform for smarter, stress-free moves in
              Vadodara.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-rentify-deepNavy">
              Explore
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="transition-colors hover:text-rentify-deepNavy">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/search" className="transition-colors hover:text-rentify-deepNavy">
                  Search
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="transition-colors hover:text-rentify-deepNavy">
                  Favorites
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="transition-colors hover:text-rentify-deepNavy">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/bookings" className="transition-colors hover:text-rentify-deepNavy">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link to="/agreements" className="transition-colors hover:text-rentify-deepNavy">
                  Agreements
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-rentify-deepNavy">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/search" className="transition-colors hover:text-rentify-deepNavy">
                  Find a Home
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="transition-colors hover:text-rentify-deepNavy">
                  Saved Properties
                </Link>
              </li>
              <li>
                <Link to="/chat" className="transition-colors hover:text-rentify-deepNavy">
                  Chat
                </Link>
              </li>
              <li>
                <Link to="/properties/1" className="transition-colors hover:text-rentify-deepNavy">
                  Sample Listing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-rentify-deepNavy">
              For Owners
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/owner/properties/new" className="transition-colors hover:text-rentify-deepNavy">
                  List a Property
                </Link>
              </li>
              <li>
                <Link to="/auth?mode=signup" className="transition-colors hover:text-rentify-deepNavy">
                  Owner Sign Up
                </Link>
              </li>
              <li>
                <Link to="/agreements" className="transition-colors hover:text-rentify-deepNavy">
                  Rent Agreements
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-rentify-deepNavy">
              Locations
            </h4>
            <ul className="space-y-2">
              {['Alkapuri', 'Gotri', 'Akota', 'Manjalpur', 'Sayajigunj'].map(
                (area) => (
                  <li key={area}>
                    <Link
                      to={`/search?location=${encodeURIComponent(area)}`}
                      className="transition-colors hover:text-rentify-deepNavy"
                    >
                      Homes in {area}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-rentify-grayLight pt-6 sm:flex-row">
          <p>2026 Rentify · Vadodara, Gujarat, India. All rights reserved.</p>
        </div>
      </Footer>
    </div>
  )
}

export default LandingPage
