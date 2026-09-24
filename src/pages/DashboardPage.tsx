import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { roleLabels } from '../data/users'
import { readRenterPreferences } from './RenterPreferencesPage'
import { readBuyerPreferences } from './BuyerPreferencesPage'
import { fetchPreferencesBundle, readToken } from '../utils/preferencesApi'
import { writeJson } from '../utils/storage'
import type { BuyerPreferences, RenterPreferences } from '../types'
import TenantDashboard from './dashboard/TenantDashboard'
import BuyerDashboard from './dashboard/BuyerDashboard'
import OwnerDashboard from './dashboard/OwnerDashboard'
import AdminDashboard from './dashboard/AdminDashboard'

function readLocalMap<T>(key: string): Record<string, T> {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, T>
  } catch {
    return {}
  }
}

function cacheRenterPrefs(userId: string, prefs: RenterPreferences | null) {
  if (!prefs) return
  const all = readLocalMap<RenterPreferences>('rentify:renterPreferences')
  all[userId] = prefs
  writeJson('rentify:renterPreferences', all)
}

function cacheBuyerPrefs(userId: string, prefs: BuyerPreferences | null) {
  if (!prefs) return
  const all = readLocalMap<BuyerPreferences>('rentify:buyerPreferences')
  all[userId] = prefs
  writeJson('rentify:buyerPreferences', all)
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user, role, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (role !== 'tenant' && role !== 'buyer') return

    if (role === 'tenant' && readRenterPreferences(user.id)) return
    if (role === 'buyer' && readBuyerPreferences(user.id)) return

    let cancelled = false
    void (async () => {
      const token = readToken()
      const remote = await fetchPreferencesBundle(token)
      if (cancelled) return
      const has =
        remote.ok &&
        (role === 'tenant'
          ? Boolean(remote.data.renter)
          : Boolean(remote.data.buyer))
      if (has) {
        if (remote.ok) {
          if (role === 'tenant') cacheRenterPrefs(user.id, remote.data.renter)
          if (role === 'buyer') cacheBuyerPrefs(user.id, remote.data.buyer)
        }
        return
      }
      navigate(role === 'tenant' ? '/preferences' : '/buyer/preferences', {
        replace: true,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user, role, navigate])

  const subtitle =
    role === 'owner'
      ? 'Your listings, tenants, viewings and rental income'
      : role === 'admin'
        ? 'Platform users, properties and agreements at a glance'
        : role === 'buyer'
          ? 'Your shortlist, buyer insights and recently viewed homes'
          : 'Your profile, insights, saved properties, bookings and agreements'

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
              {role ? `${roleLabels[role]} Dashboard` : 'Dashboard'}
            </h1>
            <p className="mt-2 text-rentify-grayMuted">
              {isAuthenticated && user ? `Welcome back, ${user.name}. ` : ''}
              {subtitle}
            </p>
          </div>
          {isAuthenticated && role === 'tenant' && (
            <Button variant="secondary" onClick={() => navigate('/search')}>
              Find more properties
            </Button>
          )}
        </div>

        {!isAuthenticated || !user ? (
          <div className="mt-8 rounded-2xl border border-rentify-grayLight bg-white px-6 py-14 text-center shadow-sm">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-rentify-navy">
              Sign in to open your dashboard
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-rentify-grayMuted">
              Choose a role — Tenant, Buyer or Property Owner — and get a
              role-specific dashboard with your data.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button onClick={() => navigate('/auth')}>Sign In</Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/auth?mode=signup')}
              >
                Create account
              </Button>
            </div>
          </div>
        ) : role === 'owner' ? (
          <div className="mt-8">
            <OwnerDashboard user={user} />
          </div>
        ) : role === 'admin' ? (
          <div className="mt-8">
            <AdminDashboard user={user} />
          </div>
        ) : role === 'buyer' ? (
          <div className="mt-8">
            <BuyerDashboard user={user} />
          </div>
        ) : (
          <div className="mt-8">
            <TenantDashboard user={user} />
          </div>
        )}
      </main>
    </div>
  )
}

export default DashboardPage
