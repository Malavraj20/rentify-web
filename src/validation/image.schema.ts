import { z } from 'zod'

export function isValidImageUrl(value: string): boolean {
  if (value.startsWith('data:image/')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const imageIdSchema = z.string().trim().min(1, 'Image id is required')

export const createImageSchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .min(1, 'imageUrl is required')
    .max(2048, 'imageUrl must be at most 2048 characters')
    .refine(
      isValidImageUrl,
      'imageUrl must be a valid http(s) URL or image data URL',
    ),
  displayOrder: z
    .number()
    .int('displayOrder must be an integer')
    .min(1, 'displayOrder must be at least 1')
    .optional(),
})

export const reorderImagesSchema = z.object({
  imageIds: z
    .array(z.string().trim().min(1, 'Image id must not be empty'))
    .min(1, 'imageIds must not be empty'),
})

export type CreateImageInput = z.infer<typeof createImageSchema>
export type ReorderImagesInput = z.infer<typeof reorderImagesSchema>
