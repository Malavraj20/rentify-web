import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { ApiError } from '../middleware/error.middleware.js'
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from '../services/favorite.service.js'
import { favoritePropertyIdSchema } from '../validation/favorite.schema.js'

export const favoriteRouter = Router()

favoriteRouter.get('/', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const favorites = await listFavorites(user)
  res.status(200).json({ favorites })
})

favoriteRouter.post('/:propertyId', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const propertyId = favoritePropertyIdSchema.parse(req.params.propertyId)
  const favorite = await addFavorite(user, propertyId)
  res.status(201).json({ message: 'Property added to favorites', favorite })
})

favoriteRouter.delete('/:propertyId', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const propertyId = favoritePropertyIdSchema.parse(req.params.propertyId)
  await removeFavorite(user, propertyId)
  res.status(200).json({ message: 'Property removed from favorites' })
})
