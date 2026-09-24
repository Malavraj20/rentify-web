import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type {
  Agreement,
  AgreementDocument,
  AgreementStatus,
  AgreementWorkflowState,
} from '../types'
import { apiRequest, extractErrorMessage } from '../utils/api'
import { readJson, writeJson } from '../utils/storage'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'rentify:agreements'
const TOKEN_STORAGE_KEY = 'rentify:token'

export interface CreateAgreementInput {
  propertyId: string
  propertyTitle?: string
  propertyAddress?: string
  tenantId?: string
  tenantName?: string
  tenantPhone?: string
  tenantEmail?: string
  tenantAddress?: string
  tenantDocId?: string
  ownerId?: string
  ownerName?: string
  ownerPhone?: string
  ownerEmail?: string
  ownerAddress?: string
  ownerDocId?: string
  monthlyRent: number
  securityDeposit: number
  maintenanceAmount?: number
  startDate: string
  endDate: string
  noticePeriodDays: number
  paymentDueDay: number
  maintenanceResponsibility: 'Tenant' | 'Owner' | 'Shared'
  otherTerms?: string
  status?: AgreementStatus
  ownerPhoto?: string
  ownerSignature?: string
  tenantPhoto?: string
  tenantSignature?: string
}

interface AgreementsContextValue {
  agreements: Agreement[]
  loading: boolean
  error: string | null
  createAgreement: (input: CreateAgreementInput) => Promise<Agreement>
  updateAgreement: (
    id: string,
    patch: Partial<Agreement>,
  ) => Promise<void>
  setAgreementStatus: (
    id: string,
    status: AgreementStatus,
  ) => Promise<void>
  approveAgreement: (id: string) => Promise<void>
  getWorkflow: (id: string) => Promise<AgreementWorkflowState>
  uploadDocument: (
    id: string,
    input: {
      documentType: string
      fileName: string
      fileData: string
      fileMimeType: string
    },
  ) => Promise<AgreementDocument>
  removeDocument: (id: string, documentId: string) => Promise<void>
  verifyDocument: (
    id: string,
    documentId: string,
    input: {
      verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
      verificationNotes?: string
    },
  ) => Promise<AgreementDocument>
  downloadDocumentFile: (
    id: string,
    documentId: string,
  ) => Promise<{ fileName: string; fileData: string; fileMimeType: string }>
  uploadFinalAgreement: (
    id: string,
    input: {
      fileName: string
      fileData: string
      fileMimeType: string
      lawyerNotes?: string
    },
  ) => Promise<Agreement>
  downloadFinalAgreement: (
    id: string,
  ) => Promise<{
    fileName: string
    fileData: string
    fileMimeType: string
    uploadedAt?: string
  }>
}

const AgreementsContext = createContext<AgreementsContextValue | null>(null)

function readAuthToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function readAgreements(): Agreement[] {
  const stored = readJson<Agreement[] | null>(STORAGE_KEY, null)
  return Array.isArray(stored) ? stored : []
}

const statusToApi: Record<AgreementStatus, string> = {
  Draft: 'DRAFT',
  Pending: 'PENDING',
  'Awaiting Signatures': 'AWAITING_SIGNATURES',
  'Information Required': 'INFORMATION_REQUIRED',
  'Documents Required': 'DOCUMENTS_REQUIRED',
  'Awaiting Tenant Signature': 'AWAITING_TENANT_SIGNATURE',
  'Awaiting Owner Signature': 'AWAITING_OWNER_SIGNATURE',
  'Ready for Lawyer Review': 'READY_FOR_LAWYER_REVIEW',
  'Sent to Lawyer': 'SENT_TO_LAWYER',
  'Under Legal Review': 'UNDER_LEGAL_REVIEW',
  'Awaiting Final Agreement': 'AWAITING_FINAL_AGREEMENT',
  'Final Agreement Uploaded': 'FINAL_AGREEMENT_UPLOADED',
  Active: 'ACTIVE',
  Completed: 'COMPLETED',
  Rejected: 'REJECTED',
}

const statusFromApi: Record<string, AgreementStatus> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  AWAITING_SIGNATURES: 'Awaiting Signatures',
  INFORMATION_REQUIRED: 'Information Required',
  DOCUMENTS_REQUIRED: 'Documents Required',
  AWAITING_TENANT_SIGNATURE: 'Awaiting Tenant Signature',
  AWAITING_OWNER_SIGNATURE: 'Awaiting Owner Signature',
  READY_FOR_LAWYER_REVIEW: 'Ready for Lawyer Review',
  SENT_TO_LAWYER: 'Sent to Lawyer',
  UNDER_LEGAL_REVIEW: 'Under Legal Review',
  AWAITING_FINAL_AGREEMENT: 'Awaiting Final Agreement',
  FINAL_AGREEMENT_UPLOADED: 'Final Agreement Uploaded',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
}

interface ApiAgreementPayload {
  id: string
  status: string
  propertyId: string
  propertyTitle?: string
  propertyAddress?: string
  propertyLocation?: string
  tenantId: string
  tenantName: string
  tenantPhone?: string
  tenantEmail?: string
  tenantAddress?: string
  tenantDocId?: string
  ownerId: string
  ownerName: string
  ownerPhone?: string
  ownerEmail?: string
  ownerAddress?: string
  ownerDocId?: string
  monthlyRent: number
  securityDeposit: number
  maintenanceAmount?: number
  startDate: string
  endDate: string
  noticePeriodDays: number
  paymentDueDay: number
  maintenanceResponsibility: 'Tenant' | 'Owner' | 'Shared'
  otherTerms?: string
  createdAt: string
  tenantPhoto?: string
  tenantSignature?: string
  tenantSignedAt?: string
  ownerPhoto?: string
  ownerSignature?: string
  ownerSignedAt?: string
  requiredTenantDocuments?: string[]
  requiredOwnerDocuments?: string[]
  sentToLawyerAt?: string
  underReviewAt?: string
  lawyerNotes?: string
  finalAgreementUploadedAt?: string
  finalAgreementFileName?: string
  hasFinalAgreement?: boolean
  finalAgreementFileMimeType?: string
  finalAgreementUploadedById?: string
  documents?: AgreementDocument[]
}

function mapApiAgreement(api: ApiAgreementPayload): Agreement {
  return {
    ...api,
    status: statusFromApi[api.status] ?? 'Draft',
  }
}

async function fetchApiAgreements(token: string): Promise<Agreement[] | null> {
  const result = await apiRequest<{ agreements: ApiAgreementPayload[] }>(
    'GET',
    '/api/agreements',
    undefined,
    token,
  )
  if (!result.ok || !result.data) return null
  return result.data.agreements.map(mapApiAgreement)
}

const AgreementsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth()
  const userId = user?.id ?? null
  const [agreements, setAgreements] = useState<Agreement[]>(readAgreements)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!isAuthenticated || !userId) {
        setAgreements(readAgreements())
        setLoading(false)
        setError(null)
        return
      }
      const token = readAuthToken()
      if (!token) {
        setAgreements(readAgreements())
        setLoading(false)
        return
      }
      setLoading(true)
      const apiAgreements = await fetchApiAgreements(token)
      if (cancelled) return
      setLoading(false)
      if (apiAgreements === null) {
        setError('Could not load agreements. Please try again.')
        return
      }
      setError(null)
      setAgreements(apiAgreements)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, userId])

  useEffect(() => {
    if (!isAuthenticated) {
      writeJson(STORAGE_KEY, agreements)
    }
  }, [isAuthenticated, agreements])

  const createAgreement = useCallback(
    async (input: CreateAgreementInput): Promise<Agreement> => {
      const token = readAuthToken()
      if (!token || !isAuthenticated) {
        throw new Error('Please sign in to create an agreement.')
      }

      const body: Record<string, unknown> = {
        propertyId: input.propertyId,
        monthlyRent: input.monthlyRent,
        securityDeposit: input.securityDeposit,
        startDate: input.startDate,
        endDate: input.endDate,
        noticePeriodDays: input.noticePeriodDays,
        paymentDueDay: input.paymentDueDay,
        maintenanceResponsibility: input.maintenanceResponsibility,
      }
      if (input.status) body.status = statusToApi[input.status]
      if (input.maintenanceAmount !== undefined) {
        body.maintenanceAmount = input.maintenanceAmount
      }
      if (input.otherTerms !== undefined) body.otherTerms = input.otherTerms
      if (input.tenantAddress !== undefined) body.tenantAddress = input.tenantAddress
      if (input.tenantDocId !== undefined) body.tenantDocId = input.tenantDocId
      if (input.tenantPhone !== undefined) body.tenantPhone = input.tenantPhone
      if (input.tenantEmail !== undefined) body.tenantEmail = input.tenantEmail
      if (input.ownerAddress !== undefined) body.ownerAddress = input.ownerAddress
      if (input.ownerDocId !== undefined) body.ownerDocId = input.ownerDocId
      if (input.ownerPhone !== undefined) body.ownerPhone = input.ownerPhone
      if (input.ownerEmail !== undefined) body.ownerEmail = input.ownerEmail
      if (input.tenantPhoto !== undefined) body.tenantPhoto = input.tenantPhoto

      const result = await apiRequest<{ agreement: ApiAgreementPayload }>(
        'POST',
        '/api/agreements',
        body,
        token,
      )
      if (!result.ok || !result.data?.agreement) {
        throw new Error(
          extractErrorMessage(result, 'Could not create agreement.'),
        )
      }
      const agreement = mapApiAgreement(result.data.agreement)
      setAgreements((current) => [agreement, ...current])
      return agreement
    },
    [isAuthenticated],
  )

  const updateAgreement = useCallback(
    async (id: string, patch: Partial<Agreement>): Promise<void> => {
      const token = readAuthToken()
      if (!token) {
        throw new Error('Please sign in again.')
      }

      const body: Record<string, unknown> = {}
      if (patch.status !== undefined) body.status = statusToApi[patch.status]
      const scalarKeys = [
        'monthlyRent',
        'securityDeposit',
        'maintenanceAmount',
        'startDate',
        'endDate',
        'noticePeriodDays',
        'paymentDueDay',
        'maintenanceResponsibility',
        'otherTerms',
        'tenantAddress',
        'tenantDocId',
        'tenantPhone',
        'tenantEmail',
        'ownerAddress',
        'ownerDocId',
        'ownerPhone',
        'ownerEmail',
        'tenantPhoto',
        'tenantSignature',
        'tenantSignedAt',
        'ownerPhoto',
        'ownerSignature',
        'ownerSignedAt',
      ] as const
      for (const key of scalarKeys) {
        const value = patch[key]
        if (value !== undefined) {
          body[key] = value
        }
      }

      const result = await apiRequest<{ agreement: ApiAgreementPayload }>(
        'PATCH',
        `/api/agreements/${id}`,
        body,
        token,
      )
      if (!result.ok || !result.data?.agreement) {
        throw new Error(
          extractErrorMessage(result, 'Could not update agreement.'),
        )
      }
      const updated = mapApiAgreement(result.data.agreement)
      setAgreements((current) =>
        current.map((agreement) => (agreement.id === id ? updated : agreement)),
      )
    },
    [],
  )

  const setAgreementStatus = useCallback(
    async (id: string, status: AgreementStatus): Promise<void> => {
      await updateAgreement(id, { status })
    },
    [updateAgreement],
  )

  const approveAgreement = useCallback(
    async (id: string): Promise<void> => {
      await setAgreementStatus(id, 'Awaiting Signatures')
    },
    [setAgreementStatus],
  )

  const getWorkflow = useCallback(
    async (id: string): Promise<AgreementWorkflowState> => {
      const token = readAuthToken()
      if (!token) throw new Error('Please sign in again.')
      const result = await apiRequest<{ workflow: AgreementWorkflowState }>(
        'GET',
        `/api/agreements/${id}/workflow`,
        undefined,
        token,
      )
      if (!result.ok || !result.data?.workflow) {
        throw new Error(extractErrorMessage(result, 'Could not load workflow.'))
      }
      return result.data.workflow
    },
    [],
  )

  const uploadDocument = useCallback(
    async (
      id: string,
      input: {
        documentType: string
        fileName: string
        fileData: string
        fileMimeType: string
      },
    ): Promise<AgreementDocument> => {
      const token = readAuthToken()
      if (!token) throw new Error('Please sign in again.')
      const result = await apiRequest<{ document: AgreementDocument }>(
        'POST',
        `/api/agreements/${id}/documents`,
        input,
        token,
      )
      if (!result.ok || !result.data?.document) {
        throw new Error(extractErrorMessage(result, 'Could not upload document.'))
      }
      const doc = result.data.document
      setAgreements((current) =>
        current.map((agreement) => {
          if (agreement.id !== id) return agreement
          const docs = (agreement.documents ?? []).filter(
            (d) =>
              !(
                d.documentType === doc.documentType &&
                d.providedBy === doc.providedBy
              ),
          )
          return { ...agreement, documents: [doc, ...docs] }
        }),
      )
      return doc
    },
    [],
  )

  const removeDocument = useCallback(
    async (id: string, documentId: string): Promise<void> => {
      const token = readAuthToken()
      if (!token) throw new Error('Please sign in again.')
      const result = await apiRequest(
        'DELETE',
        `/api/agreements/${id}/documents/${documentId}`,
        undefined,
        token,
      )
      if (!result.ok) {
        throw new Error(extractErrorMessage(result, 'Could not remove document.'))
      }
      setAgreements((current) =>
        current.map((agreement) =>
          agreement.id === id
            ? {
                ...agreement,
                documents: (agreement.documents ?? []).filter(
                  (d) => d.id !== documentId,
                ),
              }
            : agreement,
        ),
      )
    },
    [],
  )

  const verifyDocument = useCallback(
    async (
      id: string,
      documentId: string,
      input: {
        verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
        verificationNotes?: string
      },
    ): Promise<AgreementDocument> => {
      const token = readAuthToken()
      if (!token) throw new Error('Please sign in again.')
      const result = await apiRequest<{ document: AgreementDocument }>(
        'PATCH',
        `/api/agreements/${id}/documents/${documentId}/verify`,
        input,
        token,
      )
      if (!result.ok || !result.data?.document) {
        throw new Error(
          extractErrorMessage(result, 'Could not update verification.'),
        )
      }
      const doc = result.data.document
      setAgreements((current) =>
        current.map((agreement) =>
          agreement.id === id
            ? {
                ...agreement,
                documents: (agreement.documents ?? []).map((d) =>
                  d.id === doc.id ? doc : d,
                ),
              }
            : agreement,
        ),
      )
      return doc
    },
    [],
  )

  const downloadDocumentFile = useCallback(
    async (
      id: string,
      documentId: string,
    ): Promise<{ fileName: string; fileData: string; fileMimeType: string }> => {
      const token = readAuthToken()
      if (!token) throw new Error('Please sign in again.')
      const result = await apiRequest<{
        fileName: string
        fileData: string
        fileMimeType: string
      }>('GET', `/api/agreements/${id}/documents/${documentId}/file`, undefined, token)
      if (!result.ok || !result.data) {
        throw new Error(extractErrorMessage(result, 'Could not download document.'))
      }
      return result.data
    },
    [],
  )

  const uploadFinalAgreement = useCallback(
    async (
      id: string,
      input: {
        fileName: string
        fileData: string
        fileMimeType: string
        lawyerNotes?: string
      },
    ): Promise<Agreement> => {
      const token = readAuthToken()
      if (!token) throw new Error('Please sign in again.')
      const result = await apiRequest<{ agreement: ApiAgreementPayload }>(
        'POST',
        `/api/agreements/${id}/final-agreement`,
        input,
        token,
      )
      if (!result.ok || !result.data?.agreement) {
        throw new Error(
          extractErrorMessage(result, 'Could not upload final agreement.'),
        )
      }
      const updated = mapApiAgreement(result.data.agreement)
      setAgreements((current) =>
        current.map((agreement) => (agreement.id === id ? updated : agreement)),
      )
      return updated
    },
    [],
  )

  const downloadFinalAgreement = useCallback(
    async (
      id: string,
    ): Promise<{
      fileName: string
      fileData: string
      fileMimeType: string
      uploadedAt?: string
    }> => {
      const token = readAuthToken()
      if (!token) throw new Error('Please sign in again.')
      const result = await apiRequest<{
        fileName: string
        fileData: string
        fileMimeType: string
        uploadedAt?: string
      }>('GET', `/api/agreements/${id}/final-agreement`, undefined, token)
      if (!result.ok || !result.data) {
        throw new Error(
          extractErrorMessage(result, 'Final agreement is not available yet.'),
        )
      }
      return result.data
    },
    [],
  )

  const value = useMemo(
    () => ({
      agreements,
      loading,
      error,
      createAgreement,
      updateAgreement,
      setAgreementStatus,
      approveAgreement,
      getWorkflow,
      uploadDocument,
      removeDocument,
      verifyDocument,
      downloadDocumentFile,
      uploadFinalAgreement,
      downloadFinalAgreement,
    }),
    [
      agreements,
      loading,
      error,
      createAgreement,
      updateAgreement,
      setAgreementStatus,
      approveAgreement,
      getWorkflow,
      uploadDocument,
      removeDocument,
      verifyDocument,
      downloadDocumentFile,
      uploadFinalAgreement,
      downloadFinalAgreement,
    ],
  )

  return (
    <AgreementsContext.Provider value={value}>
      {children}
    </AgreementsContext.Provider>
  )
}

function useAgreements(): AgreementsContextValue {
  const context = useContext(AgreementsContext)
  if (!context) {
    throw new Error('useAgreements must be used within an AgreementsProvider')
  }
  return context
}

export { AgreementsProvider, useAgreements }
export type { AgreementsContextValue }
