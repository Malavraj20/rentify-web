import { z } from 'zod'

export const bookingIdSchema = z.string().trim().min(1, 'Booking id is required')

export const createBookingSchema = z.object({
  propertyId: z.string().trim().min(1, 'Property id is required'),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  time: z.string().trim().min(1, 'Time is required').max(50),
  note: z.string().trim().max(500, 'Note must be at most 500 characters').optional(),
})

export const updateBookingStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED']),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>
