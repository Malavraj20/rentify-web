import { rateLimit } from 'express-rate-limit'
import type { Router } from 'express'
import { env } from '../config/env.js'

const WINDOW_MS = 15 * 60 * 1000

function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}

/**
 * Scoped auth rate limiter. Development/test stays effectively unlimited so
 * integration suites are not throttled; production uses tight brute-force limits.
 */
export function authRateLimit(maxInProduction: number) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: isProduction() ? maxInProduction : 10_000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      message: 'Too many requests. Please try again later.',
    },
  })
}

export function applyAuthRateLimits(authRouter: Router): void {
  authRouter.use('/login', authRateLimit(10))
  authRouter.use('/forgot-password', authRateLimit(5))
  authRouter.use('/reset-password', authRateLimit(5))
}
