import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { roleLabels } from '../../data/users'
import type { Role } from '../../types'

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  title?: string
  showBack?: boolean
  onBack?: () => void
}

interface NavItem {
  to: string
  label: string
}

const homeItem: NavItem = { to: '/', label: 'Home' }

const guestNav: NavItem[] = [homeItem, { to: '/search', label: 'Search' }]

const tenantNav: NavItem[] = [
  homeItem,
  { to: '/search', label: 'Search' },
  { to: '/favorites', label: 'Favorites' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/agreements', label: 'Agreements' },
  { to: '/chat', label: 'Chat' },
]

const buyerNav: NavItem[] = [
  homeItem,
  { to: '/search', label: 'Search' },
  { to: '/favorites', label: 'Favorites' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/chat', label: 'Chat' },
]

const ownerNav: NavItem[] = [
  homeItem,
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/owner/properties', label: 'Properties' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/agreements', label: 'Agreements' },
  { to: '/chat', label: 'Chat' },
]

const adminNav: NavItem[] = [
  homeItem,
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/properties', label: 'Properties' },
  { to: '/agreements', label: 'Agreements' },
]

function navForRole(role: Role | null): NavItem[] {
  if (role === 'owner') return ownerNav
  if (role === 'admin') return adminNav
  if (role === 'buyer') return buyerNav
  if (role === 'tenant') return tenantNav
  return guestNav
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

const Header: React.FC<HeaderProps> = ({
  title = 'Rentify',
  showBack = false,
  onBack,
  className = '',
  ...props
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, role, isAuthenticated, signOut } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const navItems = navForRole(role)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const isNavItemActive = (to: string) => {
    if (to === '/' && pathname === '/') return true
    if (to !== '/' && pathname === to) return true
    if (to === '/search' && pathname.startsWith('/properties/')) return true
    if (to === '/owner/properties' && pathname.startsWith('/owner/properties')) return true
    if (to === '/properties' && pathname.startsWith('/properties/')) return true
    if (to === '/agreements' && pathname.startsWith('/agreements')) return true
    if (to === '/chat' && pathname.startsWith('/chat')) return true
    if (to === '/admin/users' && pathname === '/users') return true
    return false
  }

  const handleSignOut = () => {
    setMenuOpen(false)
    signOut()
    navigate('/', { replace: true })
  }

  const goToAuth = (mode?: string) => {
    setMenuOpen(false)
    navigate(mode ? `/auth?mode=${mode}` : '/auth')
  }

  const activeLinkClass = (active: boolean, dark: boolean) =>
    active
      ? dark
        ? 'bg-white/15 text-white'
        : 'bg-rentify-deepNavy text-white'
      : dark
        ? 'text-white/75 hover:bg-white/10 hover:text-white'
        : 'text-rentify-grayMuted hover:bg-rentify-purpleLight2 hover:text-rentify-deepNavy'

  const authActions = (dark: boolean, layout: string) => (
    <div className={layout}>
      {isAuthenticated && user ? (
        <>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              navigate('/profile')
            }}
            className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              dark
                ? 'border-white/25 bg-white/10 hover:bg-white/20'
                : 'border-rentify-grayLight bg-white hover:border-rentify-purpleLight'
            }`}
            aria-label="Open profile"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                dark ? 'bg-white text-rentify-deepNavy' : 'bg-rentify-deepNavy text-white'
              }`}
              aria-hidden
            >
              {initials(user.name)}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span
                className={`max-w-[120px] truncate text-sm font-semibold ${
                  dark ? 'text-white' : 'text-rentify-deepNavy'
                }`}
              >
                {user.name}
              </span>
              <span
                className={`text-[11px] font-medium ${
                  dark ? 'text-white/70' : 'text-rentify-grayMuted'
                }`}
              >
                {roleLabels[user.role]}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className={`inline-flex h-9 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              dark
                ? 'border-white/30 text-white hover:bg-white/10'
                : 'border-rentify-navy/30 text-rentify-navy hover:bg-rentify-purpleLight'
            }`}
          >
            Sign Out
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => goToAuth()}
            className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
              dark
                ? 'text-white hover:bg-white/10 focus-visible:ring-white/60'
                : 'text-rentify-navy hover:bg-rentify-purpleLight2 focus-visible:ring-rentify-navy'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => goToAuth('signup')}
            className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98] ${
              dark
                ? 'bg-white text-rentify-deepNavy hover:bg-white/90 focus-visible:ring-white/60'
                : 'bg-rentify-deepNavy text-white hover:bg-rentify-deepNavy2 focus-visible:ring-rentify-navy'
            }`}
          >
            Get Started
          </button>
        </>
      )}
    </div>
  )

  return (
    <header
      className={`sticky top-0 z-40 border-b border-black/20 bg-linear-to-r from-rentify-deepNavy via-rentify-deepNavy2 to-rentify-deepIndigo shadow-md ${className}`}
      {...props}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {showBack && onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="mr-1 flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </button>
          )}
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25"
              aria-hidden
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10.5L12 3l9 7.5M5 9.75V21h14V9.75M9 21v-6h6v6"
                />
              </svg>
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-white">
              {title}
            </span>
          </Link>
        </div>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active = isNavItemActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${activeLinkClass(active, true)}`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {authActions(true, 'flex items-center gap-2')}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      )}
      {menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-sm flex-col overflow-y-auto bg-linear-to-b from-rentify-deepNavy to-rentify-deepNavy2 px-5 pb-8 pt-5 shadow-2xl lg:hidden"
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold text-white">{title}</span>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav aria-label="Mobile" className="mt-5 flex flex-col gap-1">
            {navItems.map((item) => {
              const active = isNavItemActive(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-xl px-4 py-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${activeLinkClass(active, true)}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-5 border-t border-white/15 pt-5">
            {authActions(true, 'flex flex-col gap-2.5 [&_button]:w-full')}
          </div>
        </div>
      )}
    </header>
  )
}

export { Header }
export type { HeaderProps }
