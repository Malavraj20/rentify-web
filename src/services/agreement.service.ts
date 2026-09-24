import type { AgreementStatus } from '@prisma/client'
import { prisma } from '../prisma.js'
import { ApiError } from '../middleware/error.middleware.js'
import type { AuthUser } from './auth.service.js'
import {
  DEFAULT_REQUIRED_OWNER_DOCUMENTS,
  DEFAULT_REQUIRED_TENANT_DOCUMENTS,
} from '../constants.js'
import type {
  CreateAgreementInput,
  UpdateAgreementInput,
  UploadAgreementDocumentInput,
  UploadFinalAgreementInput,
  VerifyAgreementDocumentInput,
} from '../validation/agreement.schema.js'

const userSelect = { id: true, name: true, email: true, phone: true } as const

const agreementInclude = {
  property: {
    select: {
      id: true,
      title: true,
      address: true,
      location: true,
      ownerId: true,
      owner: { select: userSelect },
    },
  },
  tenant: { select: userSelect },
  owner: { select: userSelect },
  booking: { select: { id: true } },
  documents: {
    orderBy: { uploadedAt: 'desc' as const },
    select: {
      id: true,
      documentType: true,
      providedBy: true,
      fileName: true,
      fileMimeType: true,
      uploadedAt: true,
      verificationStatus: true,
      verifiedAt: true,
      verificationNotes: true,
    },
  },
} as const

const OPEN_STATUSES: AgreementStatus[] = [
  'DRAFT',
  'PENDING',
  'AWAITING_SIGNATURES',
  'ACTIVE',
  'INFORMATION_REQUIRED',
  'DOCUMENTS_REQUIRED',
  'AWAITING_TENANT_SIGNATURE',
  'AWAITING_OWNER_SIGNATURE',
  'READY_FOR_LAWYER_REVIEW',
  'SENT_TO_LAWYER',
  'UNDER_LEGAL_REVIEW',
  'AWAITING_FINAL_AGREEMENT',
  'FINAL_AGREEMENT_UPLOADED',
]

const LAWYER_STATUSES: AgreementStatus[] = [
  'SENT_TO_LAWYER',
  'UNDER_LEGAL_REVIEW',
  'AWAITING_FINAL_AGREEMENT',
  'FINAL_AGREEMENT_UPLOADED',
]

function toDateOnly(date: Date | null | undefined): string | undefined {
  return date ? date.toISOString().slice(0, 10) : undefined
}

function isStaff(user: AuthUser): boolean {
  return user.role === 'ADMIN'
}

function isParticipant(
  user: AuthUser,
  agreement: { tenantId: string; ownerId: string },
): boolean {
  return user.id === agreement.tenantId || user.id === agreement.ownerId
}

function assertParticipant(
  user: AuthUser,
  agreement: { tenantId: string; ownerId: string },
): void {
  if (!isStaff(user) && !isParticipant(user, agreement)) {
    throw new ApiError(403, 'You do not have access to this agreement')
  }
}

function serializeAgreement(agreement: {
  id: string
  status: AgreementStatus
  startDate: Date
  endDate: Date
  monthlyRent: number
  securityDeposit: number
  maintenanceAmount: number | null
  noticePeriodDays: number
  paymentDueDay: number
  maintenanceResponsibility: string
  otherTerms: string | null
  tenantAddress: string | null
  tenantDocId: string | null
  tenantPhone: string | null
  tenantEmail: string | null
  ownerAddress: string | null
  ownerDocId: string | null
  ownerPhone: string | null
  ownerEmail: string | null
  tenantPhoto: string | null
  tenantSignature: string | null
  tenantSignedAt: Date | null
  ownerPhoto: string | null
  ownerSignature: string | null
  ownerSignedAt: Date | null
  requiredTenantDocuments: string[]
  requiredOwnerDocuments: string[]
  sentToLawyerAt: Date | null
  underReviewAt: Date | null
  lawyerNotes: string | null
  finalAgreementUploadedAt: Date | null
  finalAgreementFileName: string | null
  finalAgreementFileData: string | null
  finalAgreementFileMimeType: string | null
  finalAgreementUploadedById: string | null
  createdAt: Date
  bookingId: string | null
  property: {
    id: string
    title: string
    address: string
    location: string
    ownerId: string
    owner: { id: string; name: string; email: string; phone: string | null }
  }
  tenant: { id: string; name: string; email: string; phone: string | null }
  owner: { id: string; name: string; email: string; phone: string | null }
  booking: { id: string } | null
  documents?: Array<{
    id: string
    documentType: string
    providedBy: 'TENANT' | 'OWNER'
    fileName: string
    fileMimeType: string
    uploadedAt: Date
    verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
    verifiedAt: Date | null
    verificationNotes: string | null
  }>
}) {
  return {
    id: agreement.id,
    status: agreement.status,
    propertyId: agreement.property.id,
    propertyTitle: agreement.property.title,
    propertyAddress: agreement.property.address,
    propertyLocation: agreement.property.location,
    tenantId: agreement.tenant.id,
    tenantName: agreement.tenant.name,
    tenantPhone: agreement.tenantPhone ?? agreement.tenant.phone ?? undefined,
    tenantEmail: agreement.tenantEmail ?? agreement.tenant.email,
    tenantAddress: agreement.tenantAddress ?? undefined,
    tenantDocId: agreement.tenantDocId ?? undefined,
    ownerId: agreement.owner.id,
    ownerName: agreement.owner.name,
    ownerPhone: agreement.ownerPhone ?? agreement.owner.phone ?? undefined,
    ownerEmail: agreement.ownerEmail ?? agreement.owner.email,
    ownerAddress: agreement.ownerAddress ?? undefined,
    ownerDocId: agreement.ownerDocId ?? undefined,
    monthlyRent: agreement.monthlyRent,
    securityDeposit: agreement.securityDeposit,
    maintenanceAmount: agreement.maintenanceAmount ?? undefined,
    startDate: toDateOnly(agreement.startDate)!,
    endDate: toDateOnly(agreement.endDate)!,
    noticePeriodDays: agreement.noticePeriodDays,
    paymentDueDay: agreement.paymentDueDay,
    maintenanceResponsibility: agreement.maintenanceResponsibility as
      | 'Tenant'
      | 'Owner'
      | 'Shared',
    otherTerms: agreement.otherTerms ?? undefined,
    createdAt: toDateOnly(agreement.createdAt)!,
    bookingId: agreement.bookingId ?? undefined,
    tenantPhoto: agreement.tenantPhoto ?? undefined,
    tenantSignature: agreement.tenantSignature ?? undefined,
    tenantSignedAt: toDateOnly(agreement.tenantSignedAt),
    ownerPhoto: agreement.ownerPhoto ?? undefined,
    ownerSignature: agreement.ownerSignature ?? undefined,
    ownerSignedAt: toDateOnly(agreement.ownerSignedAt),
    requiredTenantDocuments: agreement.requiredTenantDocuments,
    requiredOwnerDocuments: agreement.requiredOwnerDocuments,
    sentToLawyerAt: toDateOnly(agreement.sentToLawyerAt),
    underReviewAt: toDateOnly(agreement.underReviewAt),
    lawyerNotes: agreement.lawyerNotes ?? undefined,
    finalAgreementUploadedAt: toDateOnly(agreement.finalAgreementUploadedAt),
    finalAgreementFileName: agreement.finalAgreementFileName ?? undefined,
    hasFinalAgreement: Boolean(agreement.finalAgreementFileData),
    finalAgreementFileMimeType: agreement.finalAgreementFileMimeType ?? undefined,
    finalAgreementUploadedById: agreement.finalAgreementUploadedById ?? undefined,
    documents: (agreement.documents ?? []).map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      providedBy: doc.providedBy,
      fileName: doc.fileName,
      fileMimeType: doc.fileMimeType,
      uploadedAt: toDateOnly(doc.uploadedAt)!,
      verificationStatus: doc.verificationStatus,
      verifiedAt: toDateOnly(doc.verifiedAt),
      verificationNotes: doc.verificationNotes ?? undefined,
    })),
  }
}

export async function listAgreements(user: AuthUser) {
  let where = {}
  if (isStaff(user)) {
    where = {}
  } else if (user.role === 'OWNER') {
    where = { ownerId: user.id }
  } else {
    where = { tenantId: user.id }
  }

  const agreements = await prisma.agreement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: agreementInclude,
  })
  return agreements.map(serializeAgreement)
}

export async function getAgreement(user: AuthUser, id: string) {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: agreementInclude,
  })
  if (!agreement) {
    throw new ApiError(404, 'Agreement not found')
  }
  assertParticipant(user, agreement)
  return serializeAgreement(agreement)
}

export async function createAgreement(user: AuthUser, input: CreateAgreementInput) {
  if (user.role !== 'TENANT' && user.role !== 'BUYER') {
    throw new ApiError(403, 'Only tenants and buyers can create agreements')
  }

  const property = await prisma.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true, ownerId: true, title: true, address: true },
  })
  if (!property) {
    throw new ApiError(404, 'Property not found')
  }
  if (property.ownerId === user.id) {
    throw new ApiError(400, 'You cannot create an agreement for your own property')
  }

  if (input.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      select: { id: true, propertyId: true, tenantId: true },
    })
    if (!booking) {
      throw new ApiError(404, 'Booking not found')
    }
    if (booking.propertyId !== property.id || booking.tenantId !== user.id) {
      throw new ApiError(400, 'Booking does not match this tenant and property')
    }
  }

  const duplicate = await prisma.agreement.findFirst({
    where: {
      propertyId: property.id,
      tenantId: user.id,
      status: { in: OPEN_STATUSES },
    },
    select: { id: true },
  })
  if (duplicate) {
    throw new ApiError(
      409,
      'You already have an open agreement for this property',
    )
  }

  const startDate = new Date(`${input.startDate}T00:00:00.000Z`)
  const endDate = new Date(`${input.endDate}T00:00:00.000Z`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new ApiError(400, 'Invalid agreement dates')
  }
  if (endDate <= startDate) {
    throw new ApiError(400, 'End date must be after start date')
  }

  const agreement = await prisma.agreement.create({
    data: {
      propertyId: property.id,
      tenantId: user.id,
      ownerId: property.ownerId,
      bookingId: input.bookingId,
      status: input.status ?? 'INFORMATION_REQUIRED',
      startDate,
      endDate,
      monthlyRent: input.monthlyRent,
      securityDeposit: input.securityDeposit,
      maintenanceAmount: input.maintenanceAmount,
      noticePeriodDays: input.noticePeriodDays,
      paymentDueDay: input.paymentDueDay,
      maintenanceResponsibility: input.maintenanceResponsibility,
      otherTerms: input.otherTerms,
      tenantAddress: input.tenantAddress,
      tenantDocId: input.tenantDocId,
      tenantPhone: input.tenantPhone,
      tenantEmail: input.tenantEmail,
      ownerAddress: input.ownerAddress,
      ownerDocId: input.ownerDocId,
      ownerPhone: input.ownerPhone,
      ownerEmail: input.ownerEmail,
      requiredTenantDocuments:
        input.requiredTenantDocuments ?? DEFAULT_REQUIRED_TENANT_DOCUMENTS,
      requiredOwnerDocuments:
        input.requiredOwnerDocuments ?? DEFAULT_REQUIRED_OWNER_DOCUMENTS,
    },
    include: agreementInclude,
  })
  return serializeAgreement(agreement)
}

const ALLOWED_TRANSITIONS: Record<AgreementStatus, AgreementStatus[]> = {
  DRAFT: [
    'INFORMATION_REQUIRED',
    'DOCUMENTS_REQUIRED',
    'PENDING',
    'AWAITING_SIGNATURES',
    'REJECTED',
  ],
  PENDING: ['DRAFT', 'AWAITING_SIGNATURES', 'INFORMATION_REQUIRED', 'REJECTED'],
  AWAITING_SIGNATURES: ['ACTIVE', 'DRAFT', 'REJECTED'],
  ACTIVE: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  INFORMATION_REQUIRED: ['DRAFT', 'DOCUMENTS_REQUIRED', 'REJECTED'],
  DOCUMENTS_REQUIRED: [
    'INFORMATION_REQUIRED',
    'AWAITING_TENANT_SIGNATURE',
    'AWAITING_SIGNATURES',
    'REJECTED',
  ],
  AWAITING_TENANT_SIGNATURE: [
    'AWAITING_OWNER_SIGNATURE',
    'DOCUMENTS_REQUIRED',
    'REJECTED',
  ],
  AWAITING_OWNER_SIGNATURE: [
    'READY_FOR_LAWYER_REVIEW',
    'AWAITING_TENANT_SIGNATURE',
    'REJECTED',
  ],
  READY_FOR_LAWYER_REVIEW: ['SENT_TO_LAWYER', 'DOCUMENTS_REQUIRED', 'REJECTED'],
  SENT_TO_LAWYER: ['UNDER_LEGAL_REVIEW', 'REJECTED'],
  UNDER_LEGAL_REVIEW: ['AWAITING_FINAL_AGREEMENT', 'REJECTED'],
  AWAITING_FINAL_AGREEMENT: ['FINAL_AGREEMENT_UPLOADED', 'REJECTED'],
  FINAL_AGREEMENT_UPLOADED: ['COMPLETED'],
}

const STAFF_ONLY_STATUSES: AgreementStatus[] = [
  'SENT_TO_LAWYER',
  'UNDER_LEGAL_REVIEW',
  'AWAITING_FINAL_AGREEMENT',
  'FINAL_AGREEMENT_UPLOADED',
]

function assertTransition(
  user: AuthUser,
  agreement: { tenantId: string; ownerId: string; status: AgreementStatus },
  next: AgreementStatus,
): void {
  const allowed = ALLOWED_TRANSITIONS[agreement.status] ?? []
  if (!allowed.includes(next)) {
    throw new ApiError(
      400,
      `Cannot change agreement status from ${agreement.status} to ${next}`,
    )
  }

  const participant = isParticipant(user, agreement)
  const staff = isStaff(user)
  const owner = staff || user.id === agreement.ownerId

  if (STAFF_ONLY_STATUSES.includes(next) && !staff) {
    throw new ApiError(403, 'Only lawyer/admin staff can set this status')
  }
  if (next === 'REJECTED') {
    if (!owner) {
      throw new ApiError(403, 'Only the property owner can reject this agreement')
    }
    return
  }
  if (next === 'COMPLETED') {
    if (!staff && !(owner && agreement.status === 'ACTIVE')) {
      throw new ApiError(403, 'Not authorized to complete this agreement')
    }
    return
  }
  if (!participant && !staff) {
    throw new ApiError(403, 'Not authorized to set this status')
  }
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function partyInfoComplete(
  party: 'tenant' | 'owner',
  agreement: {
    tenantAddress: string | null
    tenantDocId: string | null
    tenantPhone: string | null
    tenantEmail: string | null
    ownerAddress: string | null
    ownerDocId: string | null
    ownerPhone: string | null
    ownerEmail: string | null
    tenant: { name: string; phone: string | null; email: string }
    owner: { name: string; phone: string | null; email: string }
  },
): boolean {
  if (party === 'tenant') {
    const contact =
      agreement.tenantPhone ??
      agreement.tenant?.phone ??
      agreement.tenantEmail ??
      agreement.tenant?.email
    return Boolean(
      agreement.tenant?.name &&
        contact &&
        agreement.tenantAddress &&
        agreement.tenantDocId,
    )
  }
  const contact =
    agreement.ownerPhone ??
    agreement.owner?.phone ??
    agreement.ownerEmail ??
    agreement.owner?.email
  return Boolean(
    agreement.owner?.name &&
      contact &&
      agreement.ownerAddress &&
      agreement.ownerDocId,
  )
}

function documentsComplete(
  required: string[],
  documents: Array<{ documentType: string; providedBy: string }>,
  provider: 'TENANT' | 'OWNER',
): boolean {
  if (required.length === 0) return true
  return required.every((type) =>
    documents.some(
      (doc) => doc.documentType === type && doc.providedBy === provider,
    ),
  )
}

export async function updateAgreement(
  user: AuthUser,
  id: string,
  input: UpdateAgreementInput,
) {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: agreementInclude,
  })
  if (!agreement) {
    throw new ApiError(404, 'Agreement not found')
  }
  assertParticipant(user, agreement)

  const isTenant = user.id === agreement.tenantId
  const isOwner = isStaff(user) || user.id === agreement.ownerId

  const {
    status,
    tenantPhoto,
    tenantSignature,
    tenantSignedAt,
    ownerPhoto,
    ownerSignature,
    ownerSignedAt,
    lawyerNotes,
    ...termFields
  } = input

  const data: Record<string, unknown> = {}

  if (status !== undefined) {
    assertTransition(user, agreement, status)
    data.status = status
    if (status === 'SENT_TO_LAWYER' && !agreement.sentToLawyerAt) {
      data.sentToLawyerAt = new Date()
    }
    if (status === 'UNDER_LEGAL_REVIEW' && !agreement.underReviewAt) {
      data.underReviewAt = new Date()
    }
  }

  if (lawyerNotes !== undefined) {
    if (!isStaff(user)) {
      throw new ApiError(403, 'Only lawyer/admin staff can update lawyer notes')
    }
    data.lawyerNotes = lawyerNotes
  }

  const tenantSigningStatuses: AgreementStatus[] = [
    'AWAITING_SIGNATURES',
    'AWAITING_TENANT_SIGNATURE',
  ]
  const ownerSigningStatuses: AgreementStatus[] = [
    'AWAITING_SIGNATURES',
    'AWAITING_OWNER_SIGNATURE',
  ]

  if (
    tenantPhoto !== undefined ||
    tenantSignature !== undefined ||
    tenantSignedAt !== undefined
  ) {
    if (!isTenant) {
      throw new ApiError(403, 'Only the tenant can provide the tenant signature')
    }
    if (!tenantSigningStatuses.includes(agreement.status)) {
      throw new ApiError(400, 'Agreement is not awaiting the tenant signature')
    }
    if (tenantPhoto !== undefined) data.tenantPhoto = tenantPhoto
    if (tenantSignature !== undefined) data.tenantSignature = tenantSignature
    if (tenantSignedAt !== undefined) {
      data.tenantSignedAt = tenantSignedAt
        ? parseDateOnly(tenantSignedAt)
        : null
    }
  }

  if (
    ownerPhoto !== undefined ||
    ownerSignature !== undefined ||
    ownerSignedAt !== undefined
  ) {
    if (!isOwner) {
      throw new ApiError(403, 'Only the owner can provide the owner signature')
    }
    if (!ownerSigningStatuses.includes(agreement.status)) {
      throw new ApiError(400, 'Agreement is not awaiting the owner signature')
    }
    if (ownerPhoto !== undefined) data.ownerPhoto = ownerPhoto
    if (ownerSignature !== undefined) data.ownerSignature = ownerSignature
    if (ownerSignedAt !== undefined) {
      data.ownerSignedAt = ownerSignedAt ? parseDateOnly(ownerSignedAt) : null
    }
  }

  const hasTermUpdates = Object.keys(termFields).some((key) => {
    const value = (termFields as Record<string, unknown>)[key]
    return value !== undefined
  })
  if (hasTermUpdates) {
    if (!isTenant && !isOwner) {
      throw new ApiError(403, 'Not authorized to update agreement terms')
    }
    const editableStatuses: AgreementStatus[] = [
      'DRAFT',
      'PENDING',
      'INFORMATION_REQUIRED',
      'DOCUMENTS_REQUIRED',
    ]
    if (!editableStatuses.includes(agreement.status)) {
      throw new ApiError(
        400,
        'Terms can only be edited while draft, information or documents required',
      )
    }
    if (termFields.startDate !== undefined) {
      data.startDate = parseDateOnly(termFields.startDate)
    }
    if (termFields.endDate !== undefined) {
      data.endDate = parseDateOnly(termFields.endDate)
    }
    if (termFields.maintenanceAmount !== undefined) {
      data.maintenanceAmount = termFields.maintenanceAmount
    }
    if (termFields.otherTerms !== undefined) {
      data.otherTerms = termFields.otherTerms
    }
    if (termFields.tenantAddress !== undefined) {
      data.tenantAddress = termFields.tenantAddress
    }
    if (termFields.tenantDocId !== undefined) {
      data.tenantDocId = termFields.tenantDocId
    }
    if (termFields.ownerAddress !== undefined) {
      data.ownerAddress = termFields.ownerAddress
    }
    if (termFields.ownerDocId !== undefined) {
      data.ownerDocId = termFields.ownerDocId
    }
    if (termFields.tenantPhone !== undefined) {
      data.tenantPhone = termFields.tenantPhone
    }
    if (termFields.tenantEmail !== undefined) {
      data.tenantEmail = termFields.tenantEmail
    }
    if (termFields.ownerPhone !== undefined) {
      data.ownerPhone = termFields.ownerPhone
    }
    if (termFields.ownerEmail !== undefined) {
      data.ownerEmail = termFields.ownerEmail
    }
    if (termFields.monthlyRent !== undefined) data.monthlyRent = termFields.monthlyRent
    if (termFields.securityDeposit !== undefined) {
      data.securityDeposit = termFields.securityDeposit
    }
    if (termFields.noticePeriodDays !== undefined) {
      data.noticePeriodDays = termFields.noticePeriodDays
    }
    if (termFields.paymentDueDay !== undefined) {
      data.paymentDueDay = termFields.paymentDueDay
    }
    if (termFields.maintenanceResponsibility !== undefined) {
      data.maintenanceResponsibility = termFields.maintenanceResponsibility
    }
    if (
      data.startDate !== undefined &&
      data.endDate !== undefined &&
      (data.endDate as Date) <= (data.startDate as Date)
    ) {
      throw new ApiError(400, 'End date must be after start date')
    }
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, 'No valid fields to update')
  }

  let updated = await prisma.agreement.update({
    where: { id },
    data,
    include: agreementInclude,
  })

  // Auto-advance signature workflow
  if (
    updated.status === 'AWAITING_SIGNATURES' &&
    updated.tenantSignedAt &&
    updated.ownerSignedAt
  ) {
    updated = await prisma.agreement.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: agreementInclude,
    })
  } else if (
    updated.status === 'AWAITING_TENANT_SIGNATURE' &&
    updated.tenantSignedAt
  ) {
    updated = await prisma.agreement.update({
      where: { id },
      data: { status: 'AWAITING_OWNER_SIGNATURE' },
      include: agreementInclude,
    })
  } else if (
    updated.status === 'AWAITING_OWNER_SIGNATURE' &&
    updated.ownerSignedAt &&
    updated.tenantSignedAt
  ) {
    updated = await prisma.agreement.update({
      where: { id },
      data: { status: 'READY_FOR_LAWYER_REVIEW' },
      include: agreementInclude,
    })
  }

  return serializeAgreement(updated)
}

export async function deleteAgreement(user: AuthUser, id: string) {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    select: { id: true, tenantId: true, ownerId: true, status: true },
  })
  if (!agreement) {
    throw new ApiError(404, 'Agreement not found')
  }
  assertParticipant(user, agreement)

  if (!isStaff(user)) {
    const deletable: AgreementStatus[] = [
      'DRAFT',
      'PENDING',
      'INFORMATION_REQUIRED',
      'DOCUMENTS_REQUIRED',
    ]
    if (!deletable.includes(agreement.status)) {
      throw new ApiError(
        400,
        'Only draft or early-stage agreements can be deleted',
      )
    }
  }

  await prisma.agreement.delete({ where: { id } })
}

export async function listAgreementDocuments(user: AuthUser, id: string) {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    select: { id: true, tenantId: true, ownerId: true },
  })
  if (!agreement) {
    throw new ApiError(404, 'Agreement not found')
  }
  assertParticipant(user, agreement)

  const documents = await prisma.agreementDocument.findMany({
    where: { agreementId: id },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      documentType: true,
      providedBy: true,
      fileName: true,
      fileMimeType: true,
      uploadedAt: true,
      verificationStatus: true,
      verifiedAt: true,
      verificationNotes: true,
    },
  })
  return documents.map((doc) => ({
    ...doc,
    uploadedAt: toDateOnly(doc.uploadedAt)!,
    verifiedAt: toDateOnly(doc.verifiedAt),
    verificationNotes: doc.verificationNotes ?? undefined,
  }))
}

export async function getAgreementDocumentFile(
  user: AuthUser,
  id: string,
  documentId: string,
) {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    select: { id: true, tenantId: true, ownerId: true },
  })
  if (!agreement) {
    throw new ApiError(404, 'Agreement not found')
  }
  assertParticipant(user, agreement)

  const document = await prisma.agreementDocument.findFirst({
    where: { id: documentId, agreementId: id },
    select: {
      id: true,
      fileName: true,
      fileData: true,
      fileMimeType: true,
    },
  })
  if (!document) {
    throw new ApiError(404, 'Document not found')
  }
  return document
}

export async function uploadAgreementDocument(
  user: AuthUser,
  id: string,
  input: UploadAgreementDocumentInput,
) {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    select: {
      id: true,
      tenantId: true,
      ownerId: true,
      status: true,
      requiredTenantDocuments: true,
      requiredOwnerDocuments: true,
    },
  })
  if (!agreement) {
    throw new ApiError(404, 'Agreement not found')
  }

  const staff = isStaff(user)
  const isTenant = user.id === agreement.tenantId
  const isOwner = user.id === agreement.ownerId

  if (!staff && !isTenant && !isOwner) {
    throw new ApiError(403, 'You do not have access to this agreement')
  }

  const closed: AgreementStatus[] = [
    'COMPLETED',
    'REJECTED',
    'FINAL_AGREEMENT_UPLOADED',
    'SENT_TO_LAWYER',
    'UNDER_LEGAL_REVIEW',
    'AWAITING_FINAL_AGREEMENT',
  ]
  if (closed.includes(agreement.status) && !staff) {
    throw new ApiError(400, 'Documents can no longer be changed for this agreement')
  }

  const provider: 'TENANT' | 'OWNER' = isTenant ? 'TENANT' : 'OWNER'
  if (!staff) {
    const allowedTypes =
      provider === 'TENANT'
        ? agreement.requiredTenantDocuments
        : agreement.requiredOwnerDocuments
    if (
      allowedTypes.length > 0 &&
      !allowedTypes.includes(input.documentType)
    ) {
      throw new ApiError(400, 'This document type is not required for your role')
    }
  }

  const existing = await prisma.agreementDocument.findFirst({
    where: {
      agreementId: id,
      documentType: input.documentType,
      providedBy: provider,
    },
    select: { id: true },
  })

  if (existing) {
    const updated = await prisma.agreementDocument.update({
      where: { id: existing.id },
      data: {
        fileName: input.fileName,
        fileData: input.fileData,
        fileMimeType: input.fileMimeType,
        uploadedAt: new Date(),
        verificationStatus: 'PENDING',
        verifiedAt: null,
        verificationNotes: null,
      },
      select: {
        id: true,
        documentType: true,
        providedBy: true,
        fileName: true,
        fileMimeType: true,
        uploadedAt: true,
        verificationStatus: true,
        verifiedAt: true,
        verificationNotes: true,
      },
    })
    return {
      ...updated,
      uploadedAt: toDateOnly(updated.uploadedAt)!,
      verifiedAt: undefined,
      verificationNotes: undefined,
    }
  }

  const created = await prisma.agreementDocument.create({
    data: {
      agreementId: id,
      documentType: input.documentType,
      providedBy: provider,
      fileName: input.fileName,
      fileData: input.fileData,
      fileMimeType: input.fileMimeType,
    },
    select: {
      id: true,
      documentType: true,
      providedBy: true,
      fileName: true,
      fileMimeType: true,
      uploadedAt: true,
      verificationStatus: true,
      verifiedAt: true,
      verificationNotes: true,
    },
  })
  return {
    ...created,
    uploadedAt: toDateOnly(created.uploadedAt)!,
    verifiedAt: undefined,
    verificationNotes: undefined,
  }
}

export async function deleteAgreementDocument(
  user: AuthUser,
  id: string,
  documentId: string,
) {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    select: { id: true, tenantId: true, ownerId: true, status: true },
  })
  if (!agreement) {
    throw new ApiError(404, 'Agreement not found')
  }

  const document = await prisma.agreementDocument.findFirst({
    where: { id: documentId, agreementId: id },
    select: { id: true, providedBy: true, verificationStatus: true },
  })
  if (!document) {
    throw new ApiError(404, 'Document not found')
  }

  const staff = isStaff(user)
  const ownsDoc =
    (document.providedBy === 'TENANT' && user.id === agreement.tenantId) ||
    (document.providedBy === 'OWNER' && user.id === agreement.ownerId)

  if (!staff && !ownsDoc) {
    throw new ApiError(403, 'You can only remove your own documents')
  }
  if (!staff && document.verificationStatus === 'VERIFIED') {
    throw new ApiError(400, 'Verified documents cannot be removed')
  }
  if (!staff) {
    const locked: AgreementStatus[] = [
      'COMPLETED',
      'REJECTED',
      'FINAL_AGREEMENT_UPLOADED',
      'SENT_TO_LAWYER',
      'UNDER_LEGAL_REVIEW',
      'AWAITING_FINAL_AGREEMENT',
      'READY_FOR_LAWYER_REVIEW',
    ]
    if (locked.includes(agreement.status)) {
      throw new ApiError(400, 'Documents are locked for this agreement stage')
    }
  }

  await prisma.agreementDocument.delete({ where: { id: documentId } })
}

export async function verifyAgreementDocument(
  user: AuthUser,
  id: string,
  documentId: string,
  input: VerifyAgreementDocumentInput,
) {
  if (!isStaff(user)) {
    throw new ApiError(403, 'Only lawyer/admin staff can verify documents')
  }
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!agreement) {
    throw new ApiError(404, 'Agreement not found')
  }
  const document = await prisma.agreementDocument.findFirst({
    where: { id: documentId, agreementId: id },
    select: { id: true },
  })
  if (!document) {
    throw new ApiError(404, 'Document not found')
  }

  const updated = await prisma.agreementDocument.update({
    where: { id: documentId },
    data: {
      verificationStatus: input.verificationStatus,
      verificationNotes: input.verificationNotes ?? null,
      verifiedAt:
        input.verificationStatus === 'PENDING'
          ? null
          : new Date(),
    },
    select: {
      id: true,
      documentType: true,
      providedBy: true,
      fileName: true,
      fileMimeType: true,
      uploadedAt: true,
      verificationStatus: true,
      verifiedAt: true,
      verificationNotes: true,
    },
  })
  return {
    ...updated,
    uploadedAt: toDateOnly(updated.uploadedAt)!,
    verifiedAt: toDateOnly(updated.verifiedAt),
    verificationNotes: updated.verificationNotes ?? undefined,
  }
}

export async function uploadFinalAgreement(
  user: AuthUser,
  id: string,
  input: UploadFinalAgreementInput,
) {
  if (!isStaff(user)) {
    throw new ApiError(
      403,
      'Only lawyer/admin staff can upload the final legal agreement',
    )
  }
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      tenantId: true,
      ownerId: true,
      sentToLawyerAt: true,
      underReviewAt: true,
    },
  })
  if (!agreement) {
    throw new ApiError(404, 'Agreement not found')
  }

  const allowedFrom: AgreementStatus[] = [
    'READY_FOR_LAWYER_REVIEW',
    'SENT_TO_LAWYER',
    'UNDER_LEGAL_REVIEW',
    'AWAITING_FINAL_AGREEMENT',
    'FINAL_AGREEMENT_UPLOADED',
  ]
  if (!allowedFrom.includes(agreement.status)) {
    throw new ApiError(
      400,
      'Agreement package is not ready for the final legal agreement upload',
    )
  }

  const updated = await prisma.agreement.update({
    where: { id },
    data: {
      status: 'FINAL_AGREEMENT_UPLOADED',
      finalAgreementUploadedAt: new Date(),
      finalAgreementFileName: input.fileName,
      finalAgreementFileData: input.fileData,
      finalAgreementFileMimeType: input.fileMimeType,
      finalAgreementUploadedById: user.id,
      ...(input.lawyerNotes !== undefined
        ? { lawyerNotes: input.lawyerNotes }
        : {}),
      ...(agreement.sentToLawyerAt ? {} : { sentToLawyerAt: new Date() }),
      ...(agreement.underReviewAt ? {} : { underReviewAt: new Date() }),
    },
    include: agreementInclude,
  })
  return serializeAgreement(updated)
}

export async function getFinalAgreementFile(
  user: AuthUser,
  id: string,
) {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    select: {
      id: true,
      tenantId: true,
      ownerId: true,
      finalAgreementFileName: true,
      finalAgreementFileData: true,
      finalAgreementFileMimeType: true,
      finalAgreementUploadedAt: true,
    },
  })
  if (!agreement) {
    throw new ApiError(404, 'Agreement not found')
  }
  assertParticipant(user, agreement)
  if (!agreement.finalAgreementFileData) {
    throw new ApiError(404, 'Final legal agreement has not been uploaded yet')
  }
  return {
    fileName: agreement.finalAgreementFileName ?? 'legal-rent-agreement',
    fileData: agreement.finalAgreementFileData,
    fileMimeType: agreement.finalAgreementFileMimeType ?? 'application/pdf',
    uploadedAt: toDateOnly(agreement.finalAgreementUploadedAt),
  }
}

export async function getAgreementWorkflowState(user: AuthUser, id: string) {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: agreementInclude,
  })
  if (!agreement) {
    throw new ApiError(404, 'Agreement not found')
  }
  assertParticipant(user, agreement)

  const tenantInfoComplete = partyInfoComplete('tenant', agreement)
  const ownerInfoComplete = partyInfoComplete('owner', agreement)
  const infoComplete = tenantInfoComplete && ownerInfoComplete

  const tenantDocsComplete = documentsComplete(
    agreement.requiredTenantDocuments,
    agreement.documents,
    'TENANT',
  )
  const ownerDocsComplete = documentsComplete(
    agreement.requiredOwnerDocuments,
    agreement.documents,
    'OWNER',
  )
  const docsComplete = tenantDocsComplete && ownerDocsComplete

  const tenantSigned = Boolean(agreement.tenantSignedAt)
  const ownerSigned = Boolean(agreement.ownerSignedAt)
  const signaturesComplete = tenantSigned && ownerSigned

  return {
    tenantInfoComplete,
    ownerInfoComplete,
    infoComplete,
    tenantDocsComplete,
    ownerDocsComplete,
    docsComplete,
    tenantSigned,
    ownerSigned,
    signaturesComplete,
    readyForLawyer:
      infoComplete && docsComplete && signaturesComplete &&
      (agreement.status === 'READY_FOR_LAWYER_REVIEW' ||
        LAWYER_STATUSES.includes(agreement.status)),
    canAdvanceToDocuments:
      infoComplete &&
      (agreement.status === 'DRAFT' || agreement.status === 'INFORMATION_REQUIRED'),
    canAdvanceToSigning:
      infoComplete &&
      docsComplete &&
      agreement.status === 'DOCUMENTS_REQUIRED',
  }
}
