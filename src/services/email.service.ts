import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { env } from '../config/env.js'

const DEV_RESET_FILE = env.PASSWORD_RESET_DEV_FILE
  ? resolve(env.PASSWORD_RESET_DEV_FILE)
  : resolve(process.cwd(), 'tmp', 'password-reset-dev.log')

const LOCAL_PROVIDER_IDS = new Set(['', 'none', 'local'])

/** Normalized EMAIL_PROVIDER value ('' when unset). */
export function resolveEmailProviderId(): string {
  return (env.EMAIL_PROVIDER ?? '').trim().toLowerCase()
}

export function isLocalEmailProvider(): boolean {
  return LOCAL_PROVIDER_IDS.has(resolveEmailProviderId())
}

/**
 * Production password-reset configuration check.
 * Throws a clear server-side configuration error when reset cannot be sent.
 * No-op outside production so local development keeps the dev reset file.
 */
export function assertPasswordResetEmailConfigured(): void {
  if (env.NODE_ENV !== 'production') return

  if (isLocalEmailProvider()) {
    throw new Error(
      'Password reset configuration error: EMAIL_PROVIDER must be set to a real email provider when NODE_ENV=production (local/none is development-only).',
    )
  }

  if (!env.EMAIL_RESET_BASE_URL?.trim()) {
    throw new Error(
      'Password reset configuration error: EMAIL_RESET_BASE_URL must be set when NODE_ENV=production.',
    )
  }

  // Interface is ready; concrete providers are not wired yet — fail clearly
  // instead of pretending an email was sent.
  throw new Error(
    `Password reset configuration error: EMAIL_PROVIDER="${env.EMAIL_PROVIDER}" is not implemented yet. Wire a real provider (and EMAIL_FROM / EMAIL_API_KEY) before enabling password reset in production.`,
  )
}

function appBaseUrl(): string {
  const configured = env.EMAIL_RESET_BASE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Password reset configuration error: EMAIL_RESET_BASE_URL must be set when NODE_ENV=production.',
    )
  }
  return 'http://localhost:5173'
}

export function buildPasswordResetUrl(token: string): string {
  return `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`
}

/**
 * Local development: append the reset URL to a gitignored file so tests and
 * developers can complete the flow without a real email provider.
 * Never logs the token through console/app logs.
 */
export function writeDevPasswordResetLink(email: string, resetUrl: string): void {
  mkdirSync(dirname(DEV_RESET_FILE), { recursive: true })
  const line = JSON.stringify({
    email,
    resetUrl,
    at: new Date().toISOString(),
  })
  appendFileSync(DEV_RESET_FILE, `${line}\n`, 'utf8')
}

export function getDevPasswordResetFilePath(): string {
  return DEV_RESET_FILE
}

export async function deliverPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<void> {
  assertPasswordResetEmailConfigured()

  if (isLocalEmailProvider()) {
    writeDevPasswordResetLink(email, resetUrl)
    return
  }

  throw new Error(
    `EMAIL_PROVIDER="${env.EMAIL_PROVIDER}" is configured but email delivery is not implemented yet`,
  )
}
