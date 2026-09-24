import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { ApiError } from '../middleware/error.middleware.js'
import { applyAuthRateLimits } from '../middleware/rateLimit.middleware.js'
import {
  login,
  register,
  requestPasswordReset,
  resetPassword,
  signToken,
  updateMe,
} from '../services/auth.service.js'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateMeSchema,
} from '../validation/auth.schema.js'

export const authRouter = Router()

applyAuthRateLimits(authRouter)

authRouter.post('/register', async (req, res) => {
  const input = registerSchema.parse(req.body)
  const user = await register(input)
  res.status(201).json({
    message: 'User registered successfully',
    user,
    token: signToken(user.id),
  })
})

authRouter.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body)
  const { token, user } = await login(input)
  res.status(200).json({ message: 'Login successful', token, user })
})

authRouter.post('/forgot-password', async (req, res) => {
  const input = forgotPasswordSchema.parse(req.body)
  const result = await requestPasswordReset(input)
  res.status(200).json({ message: result.message })
})

authRouter.post('/reset-password', async (req, res) => {
  const input = resetPasswordSchema.parse(req.body)
  const result = await resetPassword(input)
  res.status(200).json({ message: result.message })
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ user: req.user })
})

authRouter.patch('/me', requireAuth, async (req, res) => {
  const user = req.user
  if (!user) throw new ApiError(401, 'Authentication required')
  const input = updateMeSchema.parse(req.body)
  const updated = await updateMe(user.id, input, user.role)
  res.status(200).json({ message: 'Profile updated successfully', user: updated })
})
