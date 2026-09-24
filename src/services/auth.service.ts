import type { Role, User } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { compare, hash } from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'
import { ApiError } from '../middleware/error.middleware.js'
import { prisma } from '../prisma.js'
import {
  assertPasswordResetEmailConfigured,
  buildPasswordResetUrl,
  deliverPasswordResetEmail,
} from './email.service.js'
import {
  PUBLIC_REGISTER_ROLES,
  type ApiRole,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type UpdateMeInput,
} from '../validation/auth.schema.js'

const BCRYPT_SALT_ROUNDS = 10
const RESET_TOKEN_TTL_MINUTES = 20
const RESET_TOKEN_BYTES = 32

export const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'If an account exists for that email, reset instructions have been sent.'

export const RESET_PASSWORD_SUCCESS_MESSAGE =
  'Password updated successfully. You can now sign in with your new password.'

function hashResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function generateResetToken(): string {
  return randomBytes(RESET_TOKEN_BYTES).toString('hex')
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: ApiRole
  phone?: string | null
  createdAt: Date
}

export function toApiRole(role: Role): ApiRole {
  return role.toUpperCase() as ApiRole
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: toApiRole(user.role),
    phone: user.phone,
    createdAt: user.createdAt,
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  // Defense in depth: schema already rejects ADMIN, never persist it here.
  if ((input.role as string) === 'ADMIN') {
    throw new ApiError(
      400,
      'ADMIN role cannot be selected during registration. Use TENANT, BUYER, or OWNER.',
    )
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists')
  }

  const passwordHash = await hash(input.password, BCRYPT_SALT_ROUNDS)

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: passwordHash,
        role: input.role.toLowerCase() as Role,
      },
    })
    return toAuthUser(user)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, 'An account with this email already exists')
    }
    throw error
  }
}

export function signToken(userId: string): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  }
  return jwt.sign({}, env.JWT_SECRET, options)
}

export function verifyToken(token: string): string {
  let payload: string | JwtPayload
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    throw new ApiError(401, 'Invalid or expired authentication token')
  }

  if (typeof payload === 'string') {
    throw new ApiError(401, 'Invalid or expired authentication token')
  }

  const userId = payload.sub
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new ApiError(401, 'Invalid or expired authentication token')
  }

  return userId
}

export async function login(
  input: LoginInput,
): Promise<{ token: string; user: AuthUser }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  })

  if (!user) {
    await hash(input.password, BCRYPT_SALT_ROUNDS)
    throw new ApiError(401, 'Invalid email or password')
  }

  const passwordValid = await compare(input.password, user.password)
  if (!passwordValid) {
    throw new ApiError(401, 'Invalid email or password')
  }

  return { token: signToken(user.id), user: toAuthUser(user) }
}

export async function updateMe(
  userId: string,
  input: UpdateMeInput,
  currentRole: ApiRole,
): Promise<AuthUser> {
  // Role changes are never taken from an untrusted client for privilege gain.
  // Non-admins may only switch among public roles (frontend role switcher).
  // Only an existing ADMIN may set role=ADMIN (and no public endpoint promotes users).
  if (input.role !== undefined && currentRole !== 'ADMIN') {
    const isPublicRole = (
      PUBLIC_REGISTER_ROLES as readonly string[]
    ).includes(input.role)
    if (input.role === 'ADMIN' || !isPublicRole) {
      throw new ApiError(403, 'Only administrators can change a role to ADMIN')
    }
  }

  const data: { name?: string; phone?: string | null; role?: Role } = {}
  if (input.name !== undefined) data.name = input.name
  if (input.phone !== undefined) data.phone = input.phone
  if (input.role !== undefined) data.role = input.role.toLowerCase() as Role

  try {
    const user = await prisma.user.update({ where: { id: userId }, data })
    return toAuthUser(user)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new ApiError(404, 'User not found')
    }
    throw error
  }
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<{ message: string }> {
  // Configuration problems fail clearly (server-side) before any account lookup,
  // so production never pretends an email was sent.
  try {
    assertPasswordResetEmailConfigured()
    buildPasswordResetUrl('config-check')
  } catch (error) {
    console.error(error)
    const message =
      error instanceof Error
        ? error.message
        : 'Password reset is not configured on this server.'
    throw new ApiError(500, message)
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    })

    if (user) {
      const now = new Date()
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      })

      const token = generateResetToken()
      const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60_000)

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetToken(token),
          expiresAt,
        },
      })

      await deliverPasswordResetEmail(input.email, buildPasswordResetUrl(token))
    }
  } catch (error) {
    // Never reveal whether the account exists or why delivery failed for a
    // specific user. Still surface unexpected failures in server logs.
    console.error('Password reset delivery failed:', error)
  }

  return { message: FORGOT_PASSWORD_GENERIC_MESSAGE }
}

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<{ message: string }> {
  const tokenHash = hashResetToken(input.token)
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
  })

  if (!record) {
    throw new ApiError(400, 'Invalid or expired reset link')
  }
  if (record.usedAt) {
    throw new ApiError(400, 'Invalid or expired reset link')
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(400, 'Invalid or expired reset link')
  }

  const passwordHash = await hash(input.password, BCRYPT_SALT_ROUNDS)
  const now = new Date()

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { password: passwordHash },
    }),
  ])

  return { message: RESET_PASSWORD_SUCCESS_MESSAGE }
}
