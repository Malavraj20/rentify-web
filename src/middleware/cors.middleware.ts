import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'

function isLocalDevOrigin(origin: string): boolean {
  if (env.NODE_ENV !== 'development') return false
  try {
    const url = new URL(origin)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    )
  } catch {
    return false
  }
}

function isOriginAllowed(origin: string): boolean {
  if (env.CORS_ALLOWED_ORIGINS.includes(origin)) return true
  return isLocalDevOrigin(origin)
}

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.headers.origin
  if (typeof origin === 'string' && origin.length > 0 && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    )
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization',
    )
    res.setHeader('Access-Control-Max-Age', '86400')
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  next()
}
