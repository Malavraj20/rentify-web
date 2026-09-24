import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { readJson, writeJson } from '../utils/storage'
import {
  fetchBuyerPreferences,
  readToken,
  saveBuyerPreferences as saveBuyerPreferencesApi,
} from '../utils/preferencesApi'
import type { BuyerPreferences } from '../types'

const PREFS_KEY = 'rentify:buyerPreferences'

type QuestionKey = keyof BuyerPreferences

interface Question {
  key: QuestionKey
  prompt: string
  hint: string
  options: string[]
}

const questions: Question[] = [
  {
    key: 'budget',
    prompt: 'What is your preferred purchase budget?',
    hint: 'We use this to surface homes you can afford.',
    options: [
      'Under ₹25 Lakhs',
      '₹25–50 Lakhs',
      '₹50–75 Lakhs',
      '₹75 Lakhs–₹1 Crore',
      'Above ₹1 Crore',
    ],
  },
  {
    key: 'propertyType',
    prompt: 'What type of property are you looking to buy?',
    hint: 'Pick the size that fits your household.',
    options: ['1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'Any'],
  },
  {
    key: 'purpose',
    prompt: 'What will you primarily use the property for?',
    hint: 'Tell us how you plan to use the home.',
    options: [
      'My own residence',
      'Family residence',
      'Investment',
      'Rental income',
      'Vacation/second home',
      'Other',
    ],
  },
  {
    key: 'furnishing',
    prompt: 'What type of furnishing do you prefer?',
    hint: 'Choose how move-in ready the home should be.',
    options: [
      'Fully furnished',
      'Semi-furnished',
      'Unfurnished',
      'No preference',
    ],
  },
  {
    key: 'priority',
    prompt: 'What is most important to you when buying a property?',
    hint: 'Pick the factor that matters most in your search.',
    options: [
      'Lower purchase price',
      'Larger space',
      'Better location',
      'Modern amenities',
      'Investment potential',
      'No specific preference',
    ],
  },
]

export function readBuyerPreferences(userId: string): BuyerPreferences | null {
  const all = readJson<Record<string, BuyerPreferences>>(PREFS_KEY, {})
  const entry = all[userId]
  if (
    entry &&
    typeof entry === 'object' &&
    typeof entry.budget === 'string' &&
    typeof entry.propertyType === 'string' &&
    typeof entry.purpose === 'string' &&
    typeof entry.furnishing === 'string' &&
    typeof entry.priority === 'string'
  ) {
    return entry
  }
  return null
}

export function saveBuyerPreferences(
  userId: string,
  prefs: BuyerPreferences,
): void {
  const all = readJson<Record<string, BuyerPreferences>>(PREFS_KEY, {})
  all[userId] = prefs
  writeJson(PREFS_KEY, all)
}

const BuyerPreferencesPage = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, role } = useAuth()

  const existing = useMemo(
    () => (user ? readBuyerPreferences(user.id) : null),
    [user],
  )

  const [answers, setAnswers] = useState<BuyerPreferences>({
    budget: '',
    propertyType: '',
    purpose: '',
    furnishing: '',
    priority: '',
  })
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const hydratedForUser = useRef<string | null>(null)

  useEffect(() => {
    if (existing) setAnswers(existing)
  }, [existing])

  useEffect(() => {
    if (!user || !isAuthenticated) return
    if (hydratedForUser.current === user.id) return
    hydratedForUser.current = user.id
    let cancelled = false
    void (async () => {
      const token = readToken()
      const remote = await fetchBuyerPreferences(token)
      if (cancelled) return
      if (remote.ok) {
        if (remote.data) {
          setAnswers(remote.data)
          saveBuyerPreferences(user.id, remote.data)
        } else {
          const local = readBuyerPreferences(user.id)
          if (local) setAnswers(local)
        }
      } else {
        const local = readBuyerPreferences(user.id)
        if (local) setAnswers(local)
      }
      if (!cancelled) setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [user, isAuthenticated])

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-deepNavy">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-12 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-rentify-navy">
            Sign in to set your preferences
          </h1>
          <p className="mt-2 text-rentify-grayMuted">
            Answer a few questions so we can personalize properties for you.
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

  if (role !== null && role !== 'buyer') {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-deepNavy">
        <Header showBack onBack={() => navigate('/dashboard')} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-12 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-rentify-navy">
            This questionnaire is for buyers
          </h1>
          <p className="mt-2 text-rentify-grayMuted">
            Switch to the Buyer role from your profile to set purchase
            preferences.
          </p>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
          </div>
        </main>
      </div>
    )
  }

  const question = questions[step]
  const current = answers[question.key]
  const isLast = step === questions.length - 1
  const progress = Math.round(((step + (current ? 1 : 0)) / questions.length) * 100)

  const select = (option: string) => {
    setAnswers((prev) => ({ ...prev, [question.key]: option }))
  }

  const goBack = () => {
    if (step === 0) {
      navigate(existing ? '/dashboard' : '/')
      return
    }
    setStep((s) => s - 1)
  }

  const goNext = () => {
    if (!current || saving) return
    if (isLast) {
      setSaveError(null)
      setSaving(true)
      saveBuyerPreferences(user.id, answers)
      void (async () => {
        const token = readToken()
        const result = await saveBuyerPreferencesApi(token, answers)
        setSaving(false)
        if (!result.ok) {
          setSaveError(result.error)
          return
        }
        saveBuyerPreferences(user.id, result.data)
        navigate('/dashboard')
      })()
      return
    }
    setStep((s) => s + 1)
  }

  return (
    <div className="flex min-h-screen flex-col bg-rentify-deepNavy">
      <Header showBack onBack={goBack} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
          Question {step + 1} of {questions.length}
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-rentify-deepNavy sm:text-3xl">
          Tell us what you&apos;re looking for
        </h1>
        <p className="mt-1.5 text-sm text-rentify-grayMuted">
          Answer a few questions so we can personalize properties for you.
        </p>

        <div className="mt-5">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-rentify-grayLight"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Questionnaire progress"
          >
            <div
              className="h-full rounded-full bg-rentify-deepNavy transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <section
          aria-labelledby="pref-question"
          className="mt-6 rounded-3xl border border-rentify-grayLight bg-white p-6 shadow-sm sm:p-8"
        >
          <h2
            id="pref-question"
            className="font-display text-xl font-bold text-rentify-deepNavy"
          >
            {question.prompt}
          </h2>
          <p className="mt-1 text-sm text-rentify-grayMuted">{question.hint}</p>

          <div
            className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"
            role="radiogroup"
            aria-labelledby="pref-question"
          >
            {question.options.map((option) => {
              const selected = current === option
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => select(option)}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy ${
                    selected
                      ? 'border-rentify-deepNavy bg-rentify-purpleLight2 shadow-md ring-1 ring-rentify-deepNavy'
                      : 'border-rentify-grayLight bg-white hover:border-rentify-purpleLight hover:bg-rentify-purpleLight3'
                  }`}
                >
                  <span className="text-sm font-semibold text-rentify-deepNavy">
                    {option}
                  </span>
                  {selected && (
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rentify-deepNavy text-white"
                      aria-hidden
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={goBack}>
              {step === 0 ? (existing ? 'Back to dashboard' : 'Back') : 'Back'}
            </Button>
            <Button
              className="bg-rentify-deepNavy! hover:bg-rentify-lightNavy!"
              onClick={goNext}
              disabled={!current || saving}
            >
              {saving
                ? 'Saving…'
                : isLast
                  ? 'Save Preferences'
                  : 'Next'}
            </Button>
          </div>
          {saveError && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {saveError}
            </p>
          )}
        </section>

        <p className="mt-4 text-center text-xs text-rentify-grayMuted">
          {hydrated
            ? 'Preferences are saved to your account.'
            : 'Loading saved preferences…'}
        </p>
      </main>
    </div>
  )
}

export default BuyerPreferencesPage
