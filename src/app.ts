import express from 'express'
import helmet from 'helmet'
import { corsMiddleware } from './middleware/cors.middleware.js'
import { errorHandler } from './middleware/error.middleware.js'
import { adminRouter } from './routes/admin.route.js'
import { agreementRouter } from './routes/agreement.route.js'
import { authRouter } from './routes/auth.route.js'
import { bookingRouter } from './routes/booking.route.js'
import { favoriteRouter } from './routes/favorite.route.js'
import { healthRouter } from './routes/health.route.js'
import { preferenceRouter } from './routes/preference.route.js'
import { propertyRouter } from './routes/property.route.js'
import { userRouter } from './routes/user.route.js'

export const app = express()

// Security headers first so CORS/OPTIONS and JSON body parsing stay intact.
// CSP/COEP off: API returns JSON only; CORP cross-origin allows a separate SPA origin.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(corsMiddleware)
app.use(express.json({ limit: '15mb' }))

app.use(healthRouter)
app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/properties', propertyRouter)
app.use('/api/favorites', favoriteRouter)
app.use('/api/bookings', bookingRouter)
app.use('/api/agreements', agreementRouter)
app.use('/api/preferences', preferenceRouter)
app.use('/api/users', userRouter)
app.use('/api/admin', adminRouter)

app.use(errorHandler)
