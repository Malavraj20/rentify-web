import { app } from './app.js'
import { env } from './config/env.js'
import { prisma } from './prisma.js'

async function main() {
  const server = app.listen(env.PORT, () => {
    console.log(`Rentify API listening on http://localhost:${env.PORT}`)
  })

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down...`)
    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch(async (error) => {
  console.error('Failed to start server:', error)
  await prisma.$disconnect()
  process.exit(1)
})
