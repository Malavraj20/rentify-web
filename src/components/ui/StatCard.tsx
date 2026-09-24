import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: ReactNode
}

const StatCard = ({ label, value, hint, icon }: StatCardProps) => (
  <div className="flex h-full flex-col rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rentify-purpleLight text-rentify-deepNavy"
        aria-hidden
      >
        {icon ?? (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12h4l3-9 4 18 3-9h4"
            />
          </svg>
        )}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
        {label}
      </span>
    </div>
    <p className="mt-4 font-display text-3xl font-bold tracking-tight text-rentify-navy">
      {value}
    </p>
    {hint && <p className="mt-1 text-sm text-rentify-grayMuted">{hint}</p>}
  </div>
)

export { StatCard }
export type { StatCardProps }
