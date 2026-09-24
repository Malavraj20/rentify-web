import { Router } from 'express'
import { prisma } from '../prisma.js'

export const healthRouter = Router()

healthRouter.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    })
  } catch {
    res.status(503).json({
      status: 'degraded',
      database: 'down',
      timestamp: new Date().toISOString(),
    })
  }
})
