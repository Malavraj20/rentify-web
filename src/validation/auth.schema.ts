import { z } from 'zod'

export const API_ROLES = ['TENANT', 'BUYER', 'OWNER', 'ADMIN'] as const
export const PUBLIC_REGISTER_ROLES = ['TENANT', 'BUYER', 'OWNER'] as const

export type ApiRole = (typeof API_ROLES)[number]
export type PublicRegisterRole = (typeof PUBLIC_REGISTER_ROLES)[number]

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Please provide a valid email address'))

const roleSchema = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(z.enum(API_ROLES))

const publicRegisterRoleSchema = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(
    z.enum(API_ROLES).refine((role) => role !== 'ADMIN', {
      message:
        'ADMIN role cannot be selected during registration. Use TENANT, BUYER, or OWNER.',
    }),
  )

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name must not be empty'),
    email: emailSchema,
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: publicRegisterRoleSchema.optional().default('TENANT'),
  })
  .strict()

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required').max(512),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name must not be empty').optional(),
    phone: z
      .string()
      .trim()
      .max(30, 'Phone must be at most 30 characters')
      .nullable()
      .optional(),
    role: roleSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  })

export const adminUsersQuerySchema = z.object({
  page: z.coerce
    .number('page must be a number')
    .int('page must be an integer')
    .min(1, 'page must be at least 1')
    .default(1),
  limit: z.coerce
    .number('limit must be a number')
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(100, 'limit must be at most 100')
    .default(20),
  search: z
    .string()
    .trim()
    .max(200, 'search must be at most 200 characters')
    .optional(),
  role: roleSchema.optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdateMeInput = z.infer<typeof updateMeSchema>
export type AdminUsersQueryInput = z.infer<typeof adminUsersQuerySchema>
