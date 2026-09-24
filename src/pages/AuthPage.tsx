import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { roleLabels } from '../data/users'
import { readRenterPreferences } from './RenterPreferencesPage'
import { readBuyerPreferences } from './BuyerPreferencesPage'
import { fetchPreferencesBundle, readToken } from '../utils/preferencesApi'
import type { Role } from '../types'

type Mode = 'signin' | 'signup'
type Step = 'credentials' | 'role' | 'forgot'

const selectableRoles: { value: Role; icon: ReactNode; blurb: string; points: string[] }[] = [
  {
    value: 'tenant',
    blurb: 'Find rental homes, save favourites, book viewings',
    points: [
      'Find rental properties',
      'Save favourites',
      'Book / view viewings',
      'Chat with property owner',
      'Manage agreements',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
        />
      </svg>
    ),
  },
  {
    value: 'buyer',
    blurb: 'Browse properties to buy, shortlist and contact owners',
    points: [
      'Browse properties',
      'View property details',
      'Save properties',
      'Contact owner',
      'Buyer-specific dashboard',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
    ),
  },
  {
    value: 'owner',
    blurb: 'List properties, manage tenants, bookings & income',
    points: [
      'Add / manage properties',
      'View inquiries',
      'Chat with interested users',
      'Manage bookings',
      'Manage agreements',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10.5L12 3l9 7.5M5 9.75V21h14V9.75M9 21v-6h6v6"
        />
      </svg>
    ),
  },
]

const AuthPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const {
    isAuthenticated,
    user,
    authReady,
    signIn,
    signUp,
    setRole,
    requestPasswordReset,
  } = useAuth()

  const stateFrom = (location.state as { from?: string } | null)?.from
  const from =
    stateFrom && stateFrom !== '/auth' && !stateFrom.startsWith('/auth?')
      ? stateFrom
      : null

  const paramMode: Mode =
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  const [mode, setMode] = useState<Mode>(paramMode)
  const [lastParamMode, setLastParamMode] = useState<Mode>(paramMode)

  if (paramMode !== lastParamMode) {
    setLastParamMode(paramMode)
    setMode(paramMode)
  }

  const [step, setStep] = useState<Step>('credentials')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role>('tenant')
  const [error, setError] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotNotice, setForgotNotice] = useState('')
  const formAuthDoneRef = useRef(false)

  useEffect(() => {
    if (!authReady || !isAuthenticated || !user) return
    if (user.role === 'admin') {
      navigate(from ?? '/dashboard', { replace: true })
      return
    }
    // A restored (token-verified) session keeps Step 1 visible in signup mode.
    // In-page sign-up/sign-in marks formAuthDoneRef so Step 2 opens after success.
    if (paramMode === 'signup' && !formAuthDoneRef.current) {
      return
    }
    setStep('role')
    setSelectedRole(user.role)
  }, [authReady, isAuthenticated, user, navigate, from, paramMode])

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
  }

  const openForgotPassword = () => {
    setForgotEmail(email.trim())
    setForgotError('')
    setForgotNotice('')
    setStep('forgot')
  }

  const closeForgotPassword = () => {
    setForgotError('')
    setForgotNotice('')
    setStep('credentials')
  }

  const handleForgotSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await requestPasswordReset(forgotEmail)
    if (result.error) {
      setForgotNotice('')
      setForgotError(result.error)
      return
    }
    setForgotError('')
    setForgotNotice(result.notice ?? '')
  }

  const handleCredentialsSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'signin') {
      const result = await signIn(email, password)
      if (result.error) {
        setError(result.error)
        return
      }
      formAuthDoneRef.current = true
      setError('')
      return
    }
    const result = await signUp({ name, email, password })
    if (result.error) {
      setError(result.error)
      return
    }
    formAuthDoneRef.current = true
    setError('')
    setSelectedRole('tenant')
  }

  const handleRoleContinue = () => {
    setRole(selectedRole)
    if (selectedRole === 'tenant' && user) {
      const local = readRenterPreferences(user.id)
      if (local) {
        navigate(from ?? '/dashboard', { replace: true })
        return
      }
      void (async () => {
        const token = readToken()
        const remote = await fetchPreferencesBundle(token)
        if (remote.ok && remote.data.renter) {
          navigate(from ?? '/dashboard', { replace: true })
          return
        }
        navigate('/preferences', { replace: true })
      })()
      return
    }
    if (selectedRole === 'buyer' && user) {
      const local = readBuyerPreferences(user.id)
      if (local) {
        navigate(from ?? '/dashboard', { replace: true })
        return
      }
      void (async () => {
        const token = readToken()
        const remote = await fetchPreferencesBundle(token)
        if (remote.ok && remote.data.buyer) {
          navigate(from ?? '/dashboard', { replace: true })
          return
        }
        navigate('/buyer/preferences', { replace: true })
      })()
      return
    }
    navigate(from ?? '/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-rentify-deepNavy">
      <Header />

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-stretch gap-8 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-12">
        {/* Brand panel */}
        <section
          aria-labelledby="auth-brand-heading"
          className="relative overflow-hidden rounded-3xl border border-rentify-purpleLight bg-linear-to-br from-rentify-purpleLight3 via-rentify-purpleLight2 to-rentify-purpleLight p-8 shadow-sm sm:p-10"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/60 blur-3xl"
          />
          <span className="inline-flex items-center gap-2 rounded-full border border-rentify-purpleLight bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-rentify-deepNavy shadow-sm">
            Vadodara’s rental platform
          </span>
          <h2
            id="auth-brand-heading"
            className="mt-5 font-display text-3xl font-bold tracking-tight text-rentify-deepNavy sm:text-4xl"
          >
            One account. Every role.
          </h2>
          <p className="mt-3 max-w-md leading-relaxed text-rentify-grayMuted">
            Sign in first, then pick how you use Rentify — Renter, Buyer or
            Property Owner. Admin access stays protected for platform
            operators.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Save favourites & get compatibility scores',
              'Chat with real property owners or Rentify support',
              'Book viewings and raise rent agreements',
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-2.5 text-sm font-medium text-rentify-deepNavy"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-rentify-successGreen"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {point}
              </li>
            ))}
          </ul>

        </section>

        {/* Form / role panel */}
        <section
          aria-labelledby="auth-form-heading"
          className="rounded-3xl border border-rentify-grayLight bg-white p-6 shadow-sm sm:p-8"
        >
          {step === 'credentials' ? (
            <>
              <div
                className="flex rounded-full bg-rentify-whiteOff p-1"
                role="tablist"
                aria-label="Authentication mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  onClick={() => switchMode('signin')}
                  className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy ${
                    mode === 'signin'
                      ? 'bg-rentify-deepNavy text-white shadow-sm'
                      : 'text-rentify-grayMuted hover:text-rentify-deepNavy'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => switchMode('signup')}
                  className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy ${
                    mode === 'signup'
                      ? 'bg-rentify-deepNavy text-white shadow-sm'
                      : 'text-rentify-grayMuted hover:text-rentify-deepNavy'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <h1
                id="auth-form-heading"
                className="mt-6 font-display text-2xl font-bold tracking-tight text-rentify-deepNavy"
              >
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="mt-1.5 text-sm text-rentify-grayMuted">
                {mode === 'signin'
                  ? 'Sign in first — you will choose your role on the next step.'
                  : 'Enter your details — you will choose your role on the next step.'}
              </p>

              <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-5" noValidate>
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="mb-1.5 block text-sm font-medium text-rentify-deepNavy"
                    >
                      Full Name
                    </label>
                    <Input
                      id="auth-name"
                      placeholder="Ananya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="mb-1.5 block text-sm font-medium text-rentify-deepNavy"
                  >
                    Email
                  </label>
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="mb-1.5 block text-sm font-medium text-rentify-deepNavy"
                  >
                    Password
                  </label>
                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
                  />
                  {mode === 'signin' && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        id="auth-forgot-password"
                        onClick={openForgotPassword}
                        className="text-sm font-semibold text-rentify-deepNavy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <p
                    className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-rentify-deepNavy! hover:bg-rentify-lightNavy!"
                  size="lg"
                >
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-rentify-grayMuted">
                {mode === 'signin' ? (
                  <>
                    New to Rentify?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="font-semibold text-rentify-deepNavy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="font-semibold text-rentify-deepNavy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </>
          ) : step === 'forgot' ? (
            /* FORGOT PASSWORD */
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Password recovery
              </p>
              <h1
                id="auth-form-heading"
                className="mt-2 font-display text-2xl font-bold tracking-tight text-rentify-deepNavy"
              >
                Forgot your password?
              </h1>
              <p className="mt-1.5 text-sm text-rentify-grayMuted">
                Enter the email associated with your Rentify account. If an
                account exists, we&apos;ll provide instructions to reset your
                password.
              </p>

              <form
                onSubmit={handleForgotSubmit}
                className="mt-6 space-y-5"
                noValidate
              >
                <div>
                  <label
                    htmlFor="auth-forgot-email"
                    className="mb-1.5 block text-sm font-medium text-rentify-deepNavy"
                  >
                    Email
                  </label>
                  <Input
                    id="auth-forgot-email"
                    type="email"
                    placeholder="you@example.in"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                {forgotError && (
                  <p
                    className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600"
                    role="alert"
                  >
                    {forgotError}
                  </p>
                )}
                {forgotNotice && (
                  <p
                    className="rounded-xl bg-rentify-purpleLight3 px-3.5 py-2.5 text-sm font-medium text-rentify-deepNavy"
                    role="status"
                  >
                    {forgotNotice}
                  </p>
                )}

                <Button type="submit" className="w-full" size="lg">
                  Send Reset Link
                </Button>
              </form>

              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  id="auth-back-to-signin"
                  onClick={closeForgotPassword}
                  className="text-sm font-semibold text-rentify-deepNavy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </>
          ) : (
            /* STEP 2 — role selection */
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Step 2 of 2 · Choose your role
              </p>
              <h1
                id="auth-form-heading"
                className="mt-2 font-display text-2xl font-bold tracking-tight text-rentify-deepNavy"
              >
                How will you use Rentify?
              </h1>
              <p className="mt-1.5 text-sm text-rentify-grayMuted">
                Pick a role to continue. You can switch roles later from your
                profile.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {selectableRoles.map((option) => {
                  const selected = selectedRole === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSelectedRole(option.value)}
                      className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy ${
                        selected
                          ? 'border-rentify-deepNavy bg-rentify-purpleLight2 shadow-md ring-1 ring-rentify-deepNavy'
                          : 'border-rentify-grayLight bg-white hover:border-rentify-purpleLight hover:bg-rentify-purpleLight3'
                      }`}
                    >
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                          selected
                            ? 'bg-rentify-deepNavy text-white'
                            : 'bg-rentify-purpleLight text-rentify-deepNavy'
                        }`}
                        aria-hidden
                      >
                        {option.icon}
                      </span>
                      <span className="text-sm font-semibold text-rentify-deepNavy">
                        {roleLabels[option.value]}
                      </span>
                      <span className="text-xs leading-snug text-rentify-grayMuted">
                        {option.blurb}
                      </span>
                      <ul className="mt-1 space-y-1">
                        {option.points.map((point) => (
                          <li
                            key={point}
                            className="flex items-start gap-1.5 text-[11px] leading-snug text-rentify-grayMuted"
                          >
                            <svg
                              className="mt-0.5 h-3 w-3 shrink-0 text-rentify-successGreen"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                            {point}
                          </li>
                        ))}
                      </ul>
                      {selected && (
                        <span className="mt-auto inline-flex items-center gap-1 rounded-full bg-rentify-deepNavy px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                          Selected
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 rounded-xl border border-rentify-grayLight bg-rentify-whiteOff px-4 py-3 text-xs text-rentify-grayMuted">
                Admin access is reserved for platform operators — it is not a
                public registration option.
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="ghost"
                  className="sm:flex-1"
                  onClick={() => setStep('credentials')}
                >
                  Back
                </Button>
                <Button
                  className="sm:flex-[2] bg-rentify-deepNavy! hover:bg-rentify-deepNavy2!"
                  size="lg"
                  onClick={handleRoleContinue}
                >
                  Continue as {roleLabels[selectedRole]}
                </Button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default AuthPage
