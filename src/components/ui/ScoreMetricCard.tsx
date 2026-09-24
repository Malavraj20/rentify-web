import React from 'react'
import { Badge, type BadgeProps } from './Badge'
import { formatCurrency } from '../../utils/currency'

interface ScoreMetricCardProps {
  title: string
  score: number
  subtitle?: string
  variant?: 'compatibility' | 'health' | 'risk' | 'cost'
  showBadge?: boolean
}

const icons: Record<
  'compatibility' | 'health' | 'risk' | 'cost',
  React.ReactNode
> = {
  compatibility: (
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
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    </svg>
  ),
  health: (
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
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  ),
  risk: (
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
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  ),
  cost: (
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
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
}

const fillColors: Record<
  'compatibility' | 'health' | 'risk' | 'cost',
  string
> = {
  compatibility: 'bg-rentify-navy',
  health: 'bg-rentify-successGreen',
  risk: 'bg-rentify-cautionOrange',
  cost: 'bg-rentify-infoBlue',
}

const ScoreMetricCard: React.FC<ScoreMetricCardProps> = ({
  title,
  score,
  subtitle,
  variant = 'compatibility',
  showBadge = true,
}) => {
  const badgeVariant: Record<
    'compatibility' | 'health' | 'risk' | 'cost',
    BadgeProps['variant']
  > = {
    compatibility: 'default',
    health: 'success',
    risk: 'caution',
    cost: 'default',
  }

  const isCost = variant === 'cost'
  const displayValue = isCost ? formatCurrency(score) : String(score)
  const unit = isCost ? '/month' : '%'
  const progress = isCost ? null : Math.max(0, Math.min(100, score))

  const statusLabel = isCost
    ? 'Estimate'
    : score >= 85
      ? 'Excellent'
      : score >= 70
        ? 'Good'
        : 'Fair'

  return (
    <div className="flex h-full flex-col rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rentify-purpleLight text-rentify-deepNavy"
            aria-hidden
          >
            {icons[variant]}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
            {title}
          </span>
        </div>
        {showBadge && (
          <Badge size="sm" variant={badgeVariant[variant]}>
            {statusLabel}
          </Badge>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <p className="font-display text-3xl font-bold tracking-tight text-rentify-navy">
          {displayValue}
        </p>
        <span className="text-sm font-medium text-rentify-grayMuted">
          {unit}
        </span>
      </div>

      {subtitle && (
        <p className="mt-1.5 text-sm leading-relaxed text-rentify-grayMuted">
          {subtitle}
        </p>
      )}

      {progress !== null && (
        <div className="mt-auto pt-4">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-rentify-grayLight"
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={title}
          >
            <div
              className={`h-full rounded-full ${fillColors[variant]} transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export { ScoreMetricCard }
export type { ScoreMetricCardProps }
