import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import { ApiError } from '../middleware/error.middleware.js'
import {
  createBooking,
  deleteBooking,
  listBookings,
  updateBookingStatus,
} from '../services/booking.service.js'
import {
  bookingIdSchema,
  createBookingSchema,
  updateBookingStatusSchema,
} from '../validation/booking.schema.js'

export const bookingRouter = Router()

bookingRouter.get('/', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const bookings = await listBookings(user)
  res.status(200).json({ bookings })
})

bookingRouter.post(
  '/',
  requireAuth,
  requireRole('TENANT', 'BUYER'),
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const input = createBookingSchema.parse(req.body)
    const booking = await createBooking(user, input)
    res.status(201).json({ message: 'Booking request created', booking })
  },
)

bookingRouter.patch(
  '/:id/status',
  requireAuth,
  async (req, res) => {
    const user = req.user
    if (!user) throw new ApiError(401, 'Authentication required')
    const id = bookingIdSchema.parse(req.params.id)
    const input = updateBookingStatusSchema.parse(req.body)
    const booking = await updateBookingStatus(user, id, input)
    res.status(200).json({ message: 'Booking status updated', booking })
  },
)

bookingRouter.delete('/:id', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const id = bookingIdSchema.parse(req.params.id)
  await deleteBooking(user, id)
  res.status(200).json({ message: 'Booking deleted' })
})
