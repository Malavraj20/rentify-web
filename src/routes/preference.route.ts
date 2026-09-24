import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { ApiError } from '../middleware/error.middleware.js'
import {
  getBuyerPreferences,
  getPreferences,
  getRenterPreferences,
  putBuyerPreferences,
  putRenterPreferences,
} from '../services/preference.service.js'
import {
  buyerPreferencesSchema,
  renterPreferencesSchema,
} from '../validation/preference.schema.js'

export const preferenceRouter = Router()

preferenceRouter.get('/', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const preferences = await getPreferences(user)
  res.status(200).json(preferences)
})

preferenceRouter.get('/renter', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const preferences = await getRenterPreferences(user)
  res.status(200).json({ preferences })
})

preferenceRouter.put('/renter', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const input = renterPreferencesSchema.parse(req.body)
  const preferences = await putRenterPreferences(user, input)
  res.status(200).json({ preferences })
})

preferenceRouter.get('/buyer', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const preferences = await getBuyerPreferences(user)
  res.status(200).json({ preferences })
})

preferenceRouter.put('/buyer', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const input = buyerPreferencesSchema.parse(req.body)
  const preferences = await putBuyerPreferences(user, input)
  res.status(200).json({ preferences })
})
