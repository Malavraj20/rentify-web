import { useState } from 'react'
import { Button } from '../ui/Button'
import type { RentalPreferences } from '../../types'

type QuestionKey = keyof RentalPreferences

interface Question {
  key: QuestionKey
  prompt: string
  hint: string
  options: string[]
}

const questions: Question[] = [
  {
    key: 'tenantType',
    prompt: 'Who can rent this property?',
    hint: 'A concrete rental condition shown on this listing.',
    options: [
      'Single person',
      'Couple',
      'Family',
      'Students/roommates',
      'Working professionals',
      'Anyone',
    ],
  },
  {
    key: 'petPolicy',
    prompt: 'Are pets allowed?',
    hint: 'Set the pet policy for this property.',
    options: ['Yes, all pets', 'Yes, with restrictions', 'No pets'],
  },
  {
    key: 'tenancyDuration',
    prompt: 'Preferred tenancy duration',
    hint: 'How long tenants should plan to stay.',
    options: ['Long-term', 'Short-term', 'Either'],
  },
  {
    key: 'occupancy',
    prompt: 'Preferred occupancy',
    hint: 'Who will be living at the property day to day.',
    options: ['Single occupant', 'Multiple occupants', 'Family', 'Any'],
  },
]

export const emptyRentalPreferences: RentalPreferences = {
  tenantType: '',
  petPolicy: '',
  tenancyDuration: '',
  occupancy: '',
}

export function isRentalPreferencesComplete(prefs: RentalPreferences): boolean {
  return questions.every((question) => Boolean(prefs[question.key]))
}

interface RentalPreferencesWizardProps {
  value: RentalPreferences
  onChange: (value: RentalPreferences) => void
  onBack: () => void
  onContinue: () => void
}

const RentalPreferencesWizard = ({
  value,
  onChange,
  onBack,
  onContinue,
}: RentalPreferencesWizardProps) => {
  const [step, setStep] = useState(0)

  const question = questions[step]
  const current = value[question.key]
  const isLast = step === questions.length - 1
  const progress = Math.round(
    ((step + (current ? 1 : 0)) / questions.length) * 100,
  )

  const select = (option: string) => {
    onChange({ ...value, [question.key]: option })
  }

  const goBack = () => {
    if (step === 0) {
      onBack()
      return
    }
    setStep((s) => s - 1)
  }

  const goNext = () => {
    if (!current) return
    if (isLast) {
      onContinue()
      return
    }
    setStep((s) => s + 1)
  }

  return (
    <section
      aria-labelledby="rental-pref-question"
      className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
        Question {step + 1} of {questions.length}
      </p>
      <h2 className="mt-2 font-display text-lg font-semibold text-rentify-navy sm:text-xl">
        Rental Preferences &amp; Property Rules
      </h2>
      <p className="mt-1 text-sm text-rentify-grayMuted">
        Tell renters about the rental conditions for this property.
      </p>

      <div className="mt-4">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-rentify-grayLight"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Rental preferences progress"
        >
          <div
            className="h-full rounded-full bg-rentify-deepNavy transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5">
        <h3
          id="rental-pref-question"
          className="font-display text-base font-bold text-rentify-deepNavy sm:text-lg"
        >
          {question.prompt}
        </h3>
        <p className="mt-1 text-sm text-rentify-grayMuted">{question.hint}</p>

        <div
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-labelledby="rental-pref-question"
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
            Back
          </Button>
          <Button onClick={goNext} disabled={!current}>
            {isLast ? 'Continue' : 'Next'}
          </Button>
        </div>
      </div>
    </section>
  )
}

export { RentalPreferencesWizard }
