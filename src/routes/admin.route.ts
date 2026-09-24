import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { listAdminUsers } from '../services/admin.service.js'
import { adminUsersQuerySchema } from '../validation/auth.schema.js'

export const adminRouter = Router()

adminRouter.get(
  '/users',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    const query = adminUsersQuerySchema.parse(req.query)
    const result = await listAdminUsers(query)
    res.status(200).json(result)
  },
)
