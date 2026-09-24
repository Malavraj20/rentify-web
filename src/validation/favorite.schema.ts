import { z } from 'zod'

export const favoritePropertyIdSchema = z
  .string()
  .trim()
  .min(1, 'Property id is required')

export type FavoritePropertyIdInput = z.infer<typeof favoritePropertyIdSchema>
