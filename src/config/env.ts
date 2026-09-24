import 'dotenv/config'
import { z } from 'zod'

const EXAMPLE_JWT_SECRET = 'REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG'
const EXAMPLE_DB_PASSWORD = 'YOUR_PASSWORD'

const envSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (value) =>
          value.startsWith('postgresql://') || value.startsWith('postgres://'),
        { message: 'DATABASE_URL must be a PostgreSQL connection string' },
      ),
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().trim().min(1).default('7d'),
    EMAIL_PROVIDER: z.string().trim().optional(),
    EMAIL_FROM: z.string().trim().optional(),
    EMAIL_API_KEY: z.string().trim().optional(),
    EMAIL_RESET_BASE_URL: z.string().trim().optional(),
    PASSWORD_RESET_DEV_FILE: z.string().trim().optional(),
    CORS_ALLOWED_ORIGINS: z
      .string()
      .optional()
      .transform((value) =>
        (value ?? '')
          .split(',')
          .map((origin) => origin.trim())
          .filter((origin) => origin.length > 0),
      ),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return

    if (!data.DATABASE_URL || data.DATABASE_URL.includes(EXAMPLE_DB_PASSWORD)) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          'DATABASE_URL is required and must not use the .env.example placeholder in production',
      })
    }

    if (
      !data.JWT_SECRET ||
      data.JWT_SECRET === EXAMPLE_JWT_SECRET ||
      data.JWT_SECRET.includes('REPLACE_WITH')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message:
          'JWT_SECRET is required and must be a real secret (not the .env.example placeholder) in production',
      })
    }
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment variables:\n${issues}`)
}

export const env = parsed.data
