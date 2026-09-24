import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { roleLabels } from '../data/users'
import { formatCurrency } from '../utils/currency'
import { readRenterPreferences } from './RenterPreferencesPage'
import { readBuyerPreferences } from './BuyerPreferencesPage'
import { fetchPreferencesBundle, readToken } from '../utils/preferencesApi'
import type { Role } from '../types'

const roleOptions: Role[] = ['tenant', 'buyer', 'owner', 'admin']

const roleHints: Record<Role, string> = {
  tenant: 'Browse, favourite, book viewings and raise rent agreements.',
  buyer: 'Shortlist properties to purchase — no rental agreements.',
  owner: 'List properties, manage viewings and approve agreements.',
  admin: 'Platform overview across users, properties and agreements.',
}

const ProfilePage = () => {
  const navigate = useNavigate()
  const { user, role, isAuthenticated, updateProfile, setRole, signOut } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [nextRole, setNextRole] = useState<Role>(role ?? 'tenant')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [hasRenterPrefs, setHasRenterPrefs] = useState<boolean | null>(null)
  const [hasBuyerPrefs, setHasBuyerPrefs] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user || !isAuthenticated) {
      setHasRenterPrefs(null)
      setHasBuyerPrefs(null)
      return
    }
    const localRenter = readRenterPreferences(user.id)
    const localBuyer = readBuyerPreferences(user.id)
    if (localRenter) setHasRenterPrefs(true)
    if (localBuyer) setHasBuyerPrefs(true)
    let cancelled = false
    void (async () => {
      const token = readToken()
      const remote = await fetchPreferencesBundle(token)
      if (cancelled) return
      if (remote.ok) {
        if (remote.data.renter) setHasRenterPrefs(true)
        else setHasRenterPrefs(Boolean(localRenter))
        if (remote.data.buyer) setHasBuyerPrefs(true)
        else setHasBuyerPrefs(Boolean(localBuyer))
      } else {
        setHasRenterPrefs(Boolean(localRenter))
        setHasBuyerPrefs(Boolean(localBuyer))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, isAuthenticated])

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-12 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-rentify-navy">
            Sign in to view your profile
          </h1>
          <p className="mt-2 text-rentify-grayMuted">
            Your name, phone and role live on your profile page.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Go home
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  const handleSaveDetails = (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setError('')
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters.')
      return
    }
    updateProfile({ name: trimmedName, phone: phone.trim() || undefined })
    setMessage('Profile details saved.')
  }

  const handleRoleSave = () => {
    setMessage('')
    setError('')
    if (nextRole === user.role) {
      setMessage('Role is already up to date.')
      return
    }
    if (nextRole === 'admin') {
      setError('Admin role is reserved for Rentify staff accounts.')
      return
    }
    setRole(nextRole)
    setMessage(`Role updated to ${roleLabels[nextRole]}.`)
  }

  const handleSignOut = () => {
    signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header showBack onBack={() => navigate('/dashboard')} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        <div className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center gap-4">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full bg-rentify-deepNavy text-xl font-bold text-white"
              aria-hidden
            >
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
                {user.name}
              </h1>
              <p className="mt-1 text-rentify-grayMuted">{user.email}</p>
              {user.phone && (
                <p className="text-sm text-rentify-grayMuted">{user.phone}</p>
              )}
            </div>
            <Badge variant={role === 'owner' ? 'success' : role === 'admin' ? 'caution' : 'default'} size="lg">
              {roleLabels[user.role]}
            </Badge>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-rentify-whiteOff px-4 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Member since
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                {user.createdAt
                  ? new Date(`${user.createdAt}T00:00:00`).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Today'}
              </dd>
            </div>
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
                Budget
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                {formatCurrency(user.budget ?? 20000)}
                {user.role === 'buyer' ? '' : '/month'}
              </dd>
            </div>
          </dl>
        </div>

        <form
          onSubmit={handleSaveDetails}
          className="mt-5 rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="font-display text-lg font-semibold text-rentify-navy">
            Profile details
          </h2>
          <p className="mt-1 text-sm text-rentify-grayMuted">
            Update your contact details — changes save to your account.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-rentify-navy">
                Full name
              </label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-medium text-rentify-navy">
                Phone
              </label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                autoComplete="tel"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium text-rentify-navy">
                Email
              </label>
              <Input id="profile-email" value={user.email} readOnly />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit">Save details</Button>
          </div>
        </form>

        <section className="mt-5 rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-lg font-semibold text-rentify-navy">
            Account role
          </h2>
          <p className="mt-1 text-sm text-rentify-grayMuted">
            Switch how Rentify treats you — dashboards and navigation update
            immediately. Admin is staff-only.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {roleOptions.map((option) => {
              const selected = nextRole === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setNextRole(option)}
                  aria-pressed={selected}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy ${
                    selected
                      ? 'border-rentify-navy bg-rentify-purpleLight2 shadow-sm'
                      : 'border-rentify-grayLight bg-white hover:border-rentify-purpleLight'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-rentify-navy">
                      {roleLabels[option]}
                    </span>
                    {user.role === option && <Badge variant="success" size="sm">Current</Badge>}
                  </span>
                  <span className="mt-1 block text-xs text-rentify-grayMuted">
                    {roleHints[option]}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleRoleSave} variant={nextRole === user.role ? 'outline' : 'primary'}>
              Update role
            </Button>
          </div>
        </section>

        {user.role === 'tenant' && (
          <section className="mt-5 rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-semibold text-rentify-navy">
              Rental preferences
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              {hasRenterPrefs
                ? 'Your questionnaire answers are saved. Update them anytime.'
                : "You haven't answered the preference questionnaire yet."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate('/preferences')}>
                {hasRenterPrefs
                  ? 'Update Preferences'
                  : 'Complete Questionnaire'}
              </Button>
            </div>
          </section>
        )}

        {user.role === 'buyer' && (
          <section className="mt-5 rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-semibold text-rentify-navy">
              Purchase preferences
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              {hasBuyerPrefs
                ? 'Your questionnaire answers are saved. Update them anytime.'
                : "You haven't answered the preference questionnaire yet."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => navigate('/buyer/preferences')}
              >
                {hasBuyerPrefs
                  ? 'Update Preferences'
                  : 'Complete Questionnaire'}
              </Button>
            </div>
          </section>
        )}

        <section className="mt-5 rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-lg font-semibold text-rentify-navy">
            Session
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
              Open dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/search')}>
              Browse properties
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </section>

        {error && (
          <p className="mt-4 text-sm font-medium text-red-500" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p
            className="mt-4 rounded-xl bg-rentify-purpleLight3 px-3.5 py-2.5 text-sm font-medium text-rentify-navy"
            role="status"
          >
            {message}
          </p>
        )}
      </main>
    </div>
  )
}

export default ProfilePage
