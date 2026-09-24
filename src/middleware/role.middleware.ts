import type { NextFunction, Request, Response } from 'express'
import type { ApiRole } from '../validation/auth.schema.js'
import { ApiError } from './error.middleware.js'

export function requireRole(
  ...roles: ApiRole[]
): (req: Request, _res: Response, next: NextFunction) => void {
  const requiredRoles = roles.map(
    (role) => role.toUpperCase() as ApiRole,
  )

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'))
      return
    }

    if (!requiredRoles.includes(req.user.role)) {
      next(
        new ApiError(403, 'You do not have permission to access this resource'),
      )
      return
    }

    next()
  }
}
