import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export class ApiError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ message: err.message })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Invalid request body',
      errors: err.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    })
    return
  }

  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as SyntaxError & { status: unknown }).status === 400
  ) {
    res.status(400).json({ message: 'Invalid request body' })
    return
  }

  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
}
