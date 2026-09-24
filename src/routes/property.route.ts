import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { ApiError } from '../middleware/error.middleware.js'
import { getCompatibility } from '../services/compatibility.service.js'
import {
  addImage,
  deleteImage,
  listImages,
  reorderImages,
} from '../services/image.service.js'
import {
  createProperty,
  deleteProperty,
  getPropertyById,
  listMyProperties,
  listProperties,
  publishProperty,
  updateProperty,
} from '../services/property.service.js'
import {
  createImageSchema,
  imageIdSchema,
  reorderImagesSchema,
} from '../validation/image.schema.js'
import {
  createPropertySchema,
  propertyIdSchema,
  propertyQuerySchema,
  updatePropertySchema,
} from '../validation/property.schema.js'

export const propertyRouter = Router()

propertyRouter.post(
  '/',
  requireAuth,
  requireRole('OWNER'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const input = createPropertySchema.parse(req.body)
    const property = await createProperty(user, input)
    res.status(201).json({ message: 'Property created successfully', property })
  },
)

propertyRouter.get('/', async (req, res) => {
  const query = propertyQuerySchema.parse(req.query)
  const result = await listProperties(query)
  res.status(200).json(result)
})

propertyRouter.get(
  '/my',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const properties = await listMyProperties(user)
    res.status(200).json({ properties })
  },
)

propertyRouter.get('/:id', async (req, res) => {
  const id = propertyIdSchema.parse(req.params.id)
  const property = await getPropertyById(id)
  res.status(200).json({ property })
})

propertyRouter.get('/:id/compatibility', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const id = propertyIdSchema.parse(req.params.id)
  const compatibility = await getCompatibility(user, id)
  res.status(200).json(compatibility)
})

propertyRouter.patch(
  '/:id',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const id = propertyIdSchema.parse(req.params.id)
    const input = updatePropertySchema.parse(req.body)
    const property = await updateProperty(user, id, input)
    res.status(200).json({ message: 'Property updated successfully', property })
  },
)

propertyRouter.delete(
  '/:id',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const id = propertyIdSchema.parse(req.params.id)
    await deleteProperty(user, id)
    res.status(200).json({ message: 'Property deleted successfully' })
  },
)

propertyRouter.post(
  '/:id/publish',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const id = propertyIdSchema.parse(req.params.id)
    const { property, alreadyPublished } = await publishProperty(user, id)
    res.status(200).json({
      message: alreadyPublished
        ? 'Property is already active'
        : 'Property published successfully',
      property,
    })
  },
)

propertyRouter.post(
  '/:id/images',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const id = propertyIdSchema.parse(req.params.id)
    const input = createImageSchema.parse(req.body)
    const image = await addImage(user, id, input)
    res.status(201).json({ message: 'Image added successfully', image })
  },
)

propertyRouter.get('/:id/images', async (req, res) => {
  const id = propertyIdSchema.parse(req.params.id)
  const images = await listImages(id)
  res.status(200).json({ images })
})

propertyRouter.patch(
  '/:id/images/order',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const id = propertyIdSchema.parse(req.params.id)
    const input = reorderImagesSchema.parse(req.body)
    const images = await reorderImages(user, id, input)
    res.status(200).json({ message: 'Images reordered successfully', images })
  },
)

propertyRouter.delete(
  '/:id/images/:imageId',
  requireAuth,
  requireRole('OWNER', 'ADMIN'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const id = propertyIdSchema.parse(req.params.id)
    const imageId = imageIdSchema.parse(req.params.imageId)
    const images = await deleteImage(user, id, imageId)
    res.status(200).json({ message: 'Image deleted successfully', images })
  },
)
