import { z } from 'zod'

export const agreementIdSchema = z
  .string()
  .trim()
  .min(1, 'Agreement id is required')

const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')

export const AGREEMENT_STATUS_VALUES = [
  'DRAFT',
  'PENDING',
  'AWAITING_SIGNATURES',
  'ACTIVE',
  'COMPLETED',
  'REJECTED',
  'INFORMATION_REQUIRED',
  'DOCUMENTS_REQUIRED',
  'AWAITING_TENANT_SIGNATURE',
  'AWAITING_OWNER_SIGNATURE',
  'READY_FOR_LAWYER_REVIEW',
  'SENT_TO_LAWYER',
  'UNDER_LEGAL_REVIEW',
  'AWAITING_FINAL_AGREEMENT',
  'FINAL_AGREEMENT_UPLOADED',
] as const

export const agreementStatusSchema = z.enum(AGREEMENT_STATUS_VALUES)

export const CREATE_STATUS_VALUES = [
  'DRAFT',
  'PENDING',
  'AWAITING_SIGNATURES',
  'INFORMATION_REQUIRED',
  'DOCUMENTS_REQUIRED',
] as const

export const createAgreementSchema = z.object({
  propertyId: z.string().trim().min(1, 'Property id is required'),
  status: z.enum(CREATE_STATUS_VALUES).optional(),
  monthlyRent: z
    .number()
    .int('Monthly rent must be an integer')
    .positive('Monthly rent must be greater than zero'),
  securityDeposit: z
    .number()
    .int('Security deposit must be an integer')
    .min(0, 'Security deposit must not be negative'),
  maintenanceAmount: z
    .number()
    .int('Maintenance amount must be an integer')
    .min(0, 'Maintenance amount must not be negative')
    .optional(),
  startDate: dateOnly,
  endDate: dateOnly,
  noticePeriodDays: z
    .number()
    .int('Notice period must be an integer')
    .min(0)
    .max(180),
  paymentDueDay: z.number().int().min(1).max(28),
  maintenanceResponsibility: z.enum(['Tenant', 'Owner', 'Shared']),
  otherTerms: z.string().trim().max(5000).optional(),
  tenantAddress: z.string().trim().max(500).optional(),
  tenantDocId: z.string().trim().max(100).optional(),
  tenantPhone: z.string().trim().max(30).optional(),
  tenantEmail: z.string().trim().max(200).optional(),
  ownerAddress: z.string().trim().max(500).optional(),
  ownerDocId: z.string().trim().max(100).optional(),
  ownerPhone: z.string().trim().max(30).optional(),
  ownerEmail: z.string().trim().max(200).optional(),
  bookingId: z.string().trim().min(1).optional(),
  requiredTenantDocuments: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  requiredOwnerDocuments: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
})

export const updateAgreementSchema = z
  .object({
    status: agreementStatusSchema.optional(),
    monthlyRent: z.number().int().positive().optional(),
    securityDeposit: z.number().int().min(0).optional(),
    maintenanceAmount: z.number().int().min(0).nullish(),
    startDate: dateOnly.optional(),
    endDate: dateOnly.optional(),
    noticePeriodDays: z.number().int().min(0).max(180).optional(),
    paymentDueDay: z.number().int().min(1).max(28).optional(),
    maintenanceResponsibility: z.enum(['Tenant', 'Owner', 'Shared']).optional(),
    otherTerms: z.string().trim().max(5000).nullish(),
    tenantAddress: z.string().trim().max(500).nullish(),
    tenantDocId: z.string().trim().max(100).nullish(),
    tenantPhone: z.string().trim().max(30).nullish(),
    tenantEmail: z.string().trim().max(200).nullish(),
    ownerAddress: z.string().trim().max(500).nullish(),
    ownerDocId: z.string().trim().max(100).nullish(),
    ownerPhone: z.string().trim().max(30).nullish(),
    ownerEmail: z.string().trim().max(200).nullish(),
    tenantPhoto: z.string().trim().max(2_000_000).nullish(),
    tenantSignature: z.string().trim().max(200).nullish(),
    tenantSignedAt: dateOnly.nullish(),
    ownerPhoto: z.string().trim().max(2_000_000).nullish(),
    ownerSignature: z.string().trim().max(200).nullish(),
    ownerSignedAt: dateOnly.nullish(),
    lawyerNotes: z.string().trim().max(5000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  })

export const uploadAgreementDocumentSchema = z.object({
  documentType: z.string().trim().min(1).max(64),
  fileName: z.string().trim().min(1).max(255),
  fileData: z.string().trim().min(1).max(8_000_000),
  fileMimeType: z.string().trim().min(1).max(100),
})

export const verifyAgreementDocumentSchema = z.object({
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']),
  verificationNotes: z.string().trim().max(1000).nullish(),
})

export const uploadFinalAgreementSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileData: z.string().trim().min(1).max(10_000_000),
  fileMimeType: z.string().trim().min(1).max(100),
  lawyerNotes: z.string().trim().max(5000).optional(),
})

export type CreateAgreementInput = z.infer<typeof createAgreementSchema>
export type UpdateAgreementInput = z.infer<typeof updateAgreementSchema>
export type UploadAgreementDocumentInput = z.infer<
  typeof uploadAgreementDocumentSchema
>
export type VerifyAgreementDocumentInput = z.infer<
  typeof verifyAgreementDocumentSchema
>
export type UploadFinalAgreementInput = z.infer<
  typeof uploadFinalAgreementSchema
>
