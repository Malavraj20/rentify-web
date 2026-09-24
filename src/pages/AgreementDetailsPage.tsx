import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { AGREEMENT_DISCLAIMER } from '../data/agreements'
import { DOCUMENT_TYPE_LABELS } from '../constants'
import { useAgreements } from '../context/AgreementsContext'
import { useAuth } from '../context/AuthContext'
import { useProperties } from '../context/PropertiesContext'
import { fileToDataUrl } from '../utils/imageUpload'
import { fileToBase64DataUrl } from '../utils/documentUpload'
import { formatCurrency } from '../utils/currency'
import { agreementStatusVariant } from '../utils/agreementStatus'
import type {
  AgreementDocument,
  AgreementStatus,
  AgreementWorkflowState,
} from '../types'

const WORKFLOW_STEPS: AgreementStatus[] = [
  'Information Required',
  'Documents Required',
  'Awaiting Tenant Signature',
  'Awaiting Owner Signature',
  'Ready for Lawyer Review',
  'Sent to Lawyer',
  'Under Legal Review',
  'Awaiting Final Agreement',
  'Final Agreement Uploaded',
  'Completed',
]

const STEP_LABELS: Record<AgreementStatus, string> = {
  Draft: 'Draft',
  Pending: 'Pending',
  'Awaiting Signatures': 'Awaiting Signatures',
  'Information Required': 'Information',
  'Documents Required': 'Documents',
  'Awaiting Tenant Signature': 'Tenant signature',
  'Awaiting Owner Signature': 'Owner signature',
  'Ready for Lawyer Review': 'Ready for lawyer',
  'Sent to Lawyer': 'Sent to lawyer',
  'Under Legal Review': 'Legal review',
  'Awaiting Final Agreement': 'Awaiting final',
  'Final Agreement Uploaded': 'Final uploaded',
  Active: 'Active',
  Completed: 'Completed',
  Rejected: 'Rejected',
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function downloadDataUrl(fileName: string, dataUrl: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function Check({ done }: { done: boolean }) {
  return done ? (
    <span className="text-rentify-successGreen" aria-label="Complete">
      ✓
    </span>
  ) : (
    <span className="text-rentify-grayMuted" aria-label="Incomplete">
      ○
    </span>
  )
}

function SectionCard({
  id,
  title,
  children,
  action,
}: {
  id: string
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className="mt-6 rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id={id}
          className="font-display text-lg font-semibold text-rentify-navy"
        >
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function PartySummary({
  roleLabel,
  name,
  contact,
  address,
  docId,
  photo,
  signature,
  signedAt,
  infoComplete,
  docsComplete,
  signatureComplete,
}: {
  roleLabel: string
  name: string
  contact?: string
  address?: string
  docId?: string
  photo?: string
  signature?: string
  signedAt?: string
  infoComplete: boolean
  docsComplete: boolean
  signatureComplete: boolean
}) {
  const signed = Boolean(signedAt)
  return (
    <div className="rounded-2xl border border-rentify-grayLight bg-rentify-whiteOff p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
        {roleLabel}
      </p>
      <div className="mt-3 flex items-start gap-3">
        {photo ? (
          <img
            src={photo}
            alt={`${name} photo`}
            className="h-12 w-12 shrink-0 rounded-full border border-rentify-grayLight object-cover"
          />
        ) : (
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rentify-navy text-sm font-bold text-white"
            aria-hidden
          >
            {initials(name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-rentify-navy">{name}</p>
          <p className="mt-0.5 break-words text-xs text-rentify-grayMuted">
            {contact || 'Contact not provided'}
          </p>
        </div>
      </div>
      <dl className="mt-3 space-y-1 text-xs text-rentify-grayMuted">
        <div>
          <dt className="inline font-semibold text-rentify-navy">Address:{' '}</dt>
          <dd className="inline">{address || '—'}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-rentify-navy">ID:{' '}</dt>
          <dd className="inline">{docId || '—'}</dd>
        </div>
      </dl>
      <div className="mt-3 rounded-xl border border-dashed border-rentify-grayLight bg-white px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
          Signature
        </p>
        {signed ? (
          <p
            className="mt-1 text-lg text-rentify-navy"
            style={{ fontFamily: 'cursive' }}
            aria-label={`${roleLabel} signature`}
          >
            {signature || name}
          </p>
        ) : (
          <p className="mt-1 text-sm text-rentify-grayMuted">Not signed yet</p>
        )}
      </div>
      <p
        className={`mt-2 text-xs font-medium ${
          signed ? 'text-rentify-successGreen' : 'text-rentify-grayMuted'
        }`}
      >
        {signed ? `Signed on ${formatDate(signedAt)}` : 'Awaiting signature'}
      </p>
      <ul className="mt-3 space-y-1 text-xs">
        <li className="flex items-center gap-2">
          <Check done={infoComplete} /> Information complete
        </li>
        <li className="flex items-center gap-2">
          <Check done={docsComplete} /> Documents complete
        </li>
        <li className="flex items-center gap-2">
          <Check done={signatureComplete} /> Signature completed
        </li>
      </ul>
    </div>
  )
}

function DocumentChecklist({
  required,
  documents,
  canUpload,
  canRemove,
  canVerify,
  onUpload,
  onRemove,
  onVerify,
  onDownload,
  busyType,
}: {
  required: string[]
  documents: AgreementDocument[]
  canUpload: boolean
  canRemove: boolean
  canVerify: boolean
  onUpload: (documentType: string, file: File) => Promise<void>
  onRemove: (documentId: string) => Promise<void>
  onVerify: (
    documentId: string,
    status: 'VERIFIED' | 'REJECTED' | 'PENDING',
  ) => Promise<void>
  onDownload: (document: AgreementDocument) => Promise<void>
  busyType: string | null
}) {
  const types = required.length > 0 ? required : [...new Set(documents.map((d) => d.documentType))]
  if (types.length === 0 && documents.length === 0) {
    return <p className="text-sm text-rentify-grayMuted">No documents required.</p>
  }

  const rows = [
    ...types.map((type) => ({
      type,
      doc: documents.find((d) => d.documentType === type),
    })),
    ...documents
      .filter((d) => !types.includes(d.documentType))
      .map((d) => ({ type: d.documentType, doc: d })),
  ]

  return (
    <div className="space-y-3">
      {rows.map(({ type, doc }) => (
        <div
          key={type}
          className="rounded-xl border border-rentify-grayLight bg-rentify-whiteOff px-3.5 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rentify-navy">
                {DOCUMENT_TYPE_LABELS[type] ?? type}
              </p>
              <p className="text-xs text-rentify-grayMuted">
                Provided by: {doc?.providedBy === 'OWNER' ? 'Property Owner' : 'Tenant'}
              </p>
              {doc ? (
                <>
                  <p className="mt-1 break-all text-xs text-rentify-grayMuted">
                    {doc.fileName}
                  </p>
                  <p className="text-xs text-rentify-grayMuted">
                    Uploaded {formatDate(doc.uploadedAt)}
                  </p>
                  <p className="text-xs">
                    Verification:{' '}
                    <span
                      className={
                        doc.verificationStatus === 'VERIFIED'
                          ? 'font-semibold text-rentify-successGreen'
                          : doc.verificationStatus === 'REJECTED'
                            ? 'font-semibold text-red-500'
                            : 'font-semibold text-rentify-cautionOrange'
                      }
                    >
                      {doc.verificationStatus === 'VERIFIED'
                        ? 'Verified'
                        : doc.verificationStatus === 'REJECTED'
                          ? 'Rejected'
                          : 'Pending review'}
                    </span>
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs font-medium text-rentify-cautionOrange">
                  Not uploaded
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {doc && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void onDownload(doc)}
                >
                  View
                </Button>
              )}
              {canUpload && (
                <label
                  className={`inline-flex cursor-pointer items-center rounded-xl border border-rentify-navy/30 bg-white px-3 py-1.5 text-xs font-semibold text-rentify-navy transition-colors hover:bg-rentify-purpleLight ${
                    busyType === type ? 'pointer-events-none opacity-60' : ''
                  }`}
                >
                  {busyType === type
                    ? 'Uploading…'
                    : doc
                      ? 'Replace'
                      : 'Upload'}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void onUpload(type, file)
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
              {canRemove && doc && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void onRemove(doc.id)}
                >
                  Remove
                </Button>
              )}
              {canVerify && doc && doc.verificationStatus !== 'VERIFIED' && (
                <Button
                  size="sm"
                  onClick={() => void onVerify(doc.id, 'VERIFIED')}
                >
                  Verify
                </Button>
              )}
              {canVerify && doc && doc.verificationStatus !== 'REJECTED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void onVerify(doc.id, 'REJECTED')}
                >
                  Reject
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const AgreementDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getPropertyById } = useProperties()
  const {
    agreements,
    approveAgreement,
    setAgreementStatus,
    updateAgreement,
    getWorkflow,
    uploadDocument,
    removeDocument,
    verifyDocument,
    downloadDocumentFile,
    uploadFinalAgreement,
    downloadFinalAgreement,
  } = useAgreements()
  const { user, role, isAuthenticated } = useAuth()

  const agreement = agreements.find((item) => item.id === id)

  const [workflow, setWorkflow] = useState<AgreementWorkflowState | null>(null)
  const [workflowError, setWorkflowError] = useState('')
  const [signatureName, setSignatureName] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [signError, setSignError] = useState('')
  const [signNotice, setSignNotice] = useState('')
  const [uploading, setUploading] = useState(false)
  const [busyDocType, setBusyDocType] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [finalFileName, setFinalFileName] = useState('')
  const [finalFileData, setFinalFileData] = useState('')
  const [finalFileMime, setFinalFileMime] = useState('')
  const [finalUploading, setFinalUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refreshWorkflow = useCallback(async () => {
    if (!id) return
    setWorkflowError('')
    try {
      const state = await getWorkflow(id)
      setWorkflow(state)
    } catch (err) {
      setWorkflowError(
        err instanceof Error ? err.message : 'Could not load workflow status.',
      )
    }
  }, [id, getWorkflow])

  useEffect(() => {
    void refreshWorkflow()
  }, [refreshWorkflow, agreement?.status])

  if (!agreement) {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-12 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-rentify-navy sm:text-3xl">
            Agreement not found
          </h1>
          <p className="mt-2 text-rentify-grayMuted">
            This agreement may have been removed or the link is incorrect.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate('/agreements')}>
              Back to agreements
            </Button>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Go home
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const property = getPropertyById(agreement.propertyId)
  const isStaff = isAuthenticated && role === 'admin'
  const isOwner =
    isAuthenticated && role === 'owner' && user?.id === agreement.ownerId
  const isTenant =
    isAuthenticated &&
    (agreement.tenantId === user?.id || agreement.tenantName === user?.name)
  const isParticipant = isTenant || isOwner

  const tenantSigned = Boolean(agreement.tenantSignedAt)
  const ownerSigned = Boolean(agreement.ownerSignedAt)
  const canSignAsTenant =
    isTenant &&
    (agreement.status === 'Awaiting Signatures' ||
      agreement.status === 'Awaiting Tenant Signature') &&
    !tenantSigned
  const canSignAsOwner =
    isOwner &&
    (agreement.status === 'Awaiting Signatures' ||
      agreement.status === 'Awaiting Owner Signature') &&
    !ownerSigned
  const canSign = canSignAsTenant || canSignAsOwner

  const documents = agreement.documents ?? []
  const tenantDocs = documents.filter((d) => d.providedBy === 'TENANT')
  const ownerDocs = documents.filter((d) => d.providedBy === 'OWNER')
  const requiredTenant = agreement.requiredTenantDocuments ?? []
  const requiredOwner = agreement.requiredOwnerDocuments ?? []

  const currentStepIndex = WORKFLOW_STEPS.indexOf(agreement.status)
  const progressPct =
    agreement.status === 'Rejected'
      ? 0
      : agreement.status === 'Active' || agreement.status === 'Completed'
        ? 100
        : currentStepIndex >= 0
          ? Math.round(((currentStepIndex + 1) / WORKFLOW_STEPS.length) * 100)
          : 0

  const infoComplete = workflow?.infoComplete ?? false
  const docsComplete = workflow?.docsComplete ?? false
  const signaturesComplete = workflow?.signaturesComplete ?? false

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoError('')
    setUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      setPhotoDataUrl(dataUrl)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not read image.')
    } finally {
      setUploading(false)
      if (event.target) event.target.value = ''
    }
  }

  const handleSign = async (event: FormEvent) => {
    event.preventDefault()
    setSignError('')
    const typed = signatureName.trim()
    if (typed.length < 2) {
      setSignError('Type your full name as the signature (at least 2 characters).')
      return
    }
    const photo = photoDataUrl
    if (!photo) {
      setSignError('Upload a photo ID before signing.')
      return
    }
    const signedAt = new Date().toISOString().slice(0, 10)
    try {
      if (canSignAsTenant) {
        await updateAgreement(agreement.id, {
          tenantSignature: typed,
          tenantPhoto: photo,
          tenantSignedAt: signedAt,
        })
        setSignNotice('Tenant signature recorded.')
      } else if (canSignAsOwner) {
        await updateAgreement(agreement.id, {
          ownerSignature: typed,
          ownerPhoto: photo,
          ownerSignedAt: signedAt,
        })
        setSignNotice('Owner signature recorded.')
      }
      setSignatureName('')
      setPhotoDataUrl('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await refreshWorkflow()
    } catch (err) {
      setSignError(
        err instanceof Error ? err.message : 'Could not record signature.',
      )
    }
  }

  const runStatusAction = async (
    fn: () => Promise<void>,
    successMessage: string,
  ) => {
    setActionError('')
    setActionNotice('')
    try {
      await fn()
      setActionNotice(successMessage)
      await refreshWorkflow()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not update agreement.',
      )
    }
  }

  const handleDocUpload = async (documentType: string, file: File) => {
    setActionError('')
    setActionNotice('')
    setBusyDocType(documentType)
    try {
      const dataUrl = await fileToBase64DataUrl(file)
      const comma = dataUrl.indexOf(',')
      const meta = dataUrl.slice(0, comma)
      const mimeMatch = meta.match(/data:([^;]+)/)
      await uploadDocument(agreement.id, {
        documentType,
        fileName: file.name,
        fileData: dataUrl,
        fileMimeType: mimeMatch?.[1] ?? file.type ?? 'application/octet-stream',
      })
      setActionNotice('Document uploaded.')
      await refreshWorkflow()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not upload document.',
      )
    } finally {
      setBusyDocType(null)
    }
  }

  const handleDocRemove = async (documentId: string) => {
    setActionError('')
    setActionNotice('')
    try {
      await removeDocument(agreement.id, documentId)
      setActionNotice('Document removed.')
      await refreshWorkflow()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not remove document.',
      )
    }
  }

  const handleDocVerify = async (
    documentId: string,
    status: 'VERIFIED' | 'REJECTED' | 'PENDING',
  ) => {
    setActionError('')
    setActionNotice('')
    try {
      await verifyDocument(agreement.id, documentId, {
        verificationStatus: status,
      })
      setActionNotice('Verification updated.')
      await refreshWorkflow()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not update verification.',
      )
    }
  }

  const handleDocDownload = async (doc: AgreementDocument) => {
    setActionError('')
    try {
      const file = await downloadDocumentFile(agreement.id, doc.id)
      downloadDataUrl(doc.fileName || file.fileName, file.fileData)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not download document.',
      )
    }
  }

  const handleFinalFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setActionError('')
    void fileToBase64DataUrl(file)
      .then((dataUrl) => {
        setFinalFileName(file.name)
        setFinalFileData(dataUrl)
        setFinalFileMime(file.type || 'application/pdf')
      })
      .catch((err: unknown) => {
        setActionError(
          err instanceof Error ? err.message : 'Could not read file.',
        )
      })
      .finally(() => {
        if (event.target) event.target.value = ''
      })
  }

  const handleFinalUpload = async () => {
    if (!finalFileData || !finalFileName) {
      setActionError('Choose the final legal agreement file first.')
      return
    }
    setFinalUploading(true)
    setActionError('')
    setActionNotice('')
    try {
      await uploadFinalAgreement(agreement.id, {
        fileName: finalFileName,
        fileData: finalFileData,
        fileMimeType: finalFileMime || 'application/pdf',
      })
      setFinalFileName('')
      setFinalFileData('')
      setFinalFileMime('')
      setActionNotice('Final legal agreement uploaded.')
      await refreshWorkflow()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not upload final agreement.',
      )
    } finally {
      setFinalUploading(false)
    }
  }

  const handleViewFinal = async () => {
    setActionError('')
    try {
      const file = await downloadFinalAgreement(agreement.id)
      downloadDataUrl(file.fileName, file.fileData)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Final agreement is not available.',
      )
    }
  }

  const financialRows = [
    { label: 'Monthly rent', value: formatCurrency(agreement.monthlyRent) },
    {
      label: 'Security deposit',
      value: formatCurrency(agreement.securityDeposit),
    },
    {
      label: 'Maintenance amount',
      value: agreement.maintenanceAmount
        ? formatCurrency(agreement.maintenanceAmount)
        : '—',
    },
    {
      label: 'Payment due',
      value: `Day ${agreement.paymentDueDay} of every month`,
    },
    {
      label: 'Maintenance responsibility',
      value: `${agreement.maintenanceResponsibility} responsibility`,
    },
  ]

  const tenancyRows = [
    { label: 'Start date', value: formatDate(agreement.startDate) },
    { label: 'End date', value: formatDate(agreement.endDate) },
    {
      label: 'Notice period',
      value: `${agreement.noticePeriodDays} days`,
    },
    { label: 'Created', value: formatDate(agreement.createdAt) },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header showBack onBack={() => navigate('/agreements')} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        {/* HEADER */}
        <div className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-7">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Rent agreement package · Ref {agreement.id}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
                {property?.title ??
                  agreement.propertyTitle ??
                  'Property unavailable'}
              </h1>
              <p className="mt-1 text-rentify-grayMuted">
                {property
                  ? property.address
                  : agreement.propertyAddress ?? 'Listing removed'}
              </p>
            </div>
            <Badge variant={agreementStatusVariant(agreement.status)} size="lg">
              {agreement.status}
            </Badge>
          </header>

          {agreement.status !== 'Rejected' &&
            agreement.status !== 'Draft' &&
            agreement.status !== 'Pending' && (
              <div
                className="mt-4 h-2 w-full overflow-hidden rounded-full bg-rentify-grayLight"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Agreement progress"
              >
                <div
                  className="h-full rounded-full bg-rentify-deepNavy transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

          {actionNotice && (
            <p
              className="mt-4 rounded-xl bg-green-50 px-3.5 py-2.5 text-sm font-medium text-green-700"
              role="status"
            >
              {actionNotice}
            </p>
          )}
          {actionError && (
            <p
              className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600"
              role="alert"
            >
              {actionError}
            </p>
          )}
          {workflowError && (
            <p
              className="mt-4 rounded-xl bg-rentify-purpleLight3 px-3.5 py-2.5 text-sm text-rentify-navy"
              role="alert"
            >
              {workflowError}
            </p>
          )}
        </div>

        {/* A. Agreement Status */}
        <SectionCard id="status-heading" title="A. Agreement Status">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={agreementStatusVariant(agreement.status)} size="lg">
              {agreement.status}
            </Badge>
            <span className="text-sm text-rentify-grayMuted">
              {progressPct}% through the lawyer workflow
            </span>
          </div>
          <ol className="mt-4 flex flex-wrap gap-2">
            {WORKFLOW_STEPS.map((step, index) => {
              const reached = currentStepIndex >= index
              const current = step === agreement.status
              return (
                <li
                  key={step}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    current
                      ? 'bg-rentify-deepNavy text-white'
                      : reached
                        ? 'bg-rentify-purpleLight text-rentify-navy'
                        : 'bg-rentify-whiteOff text-rentify-grayMuted'
                  }`}
                >
                  {index + 1}. {STEP_LABELS[step]}
                </li>
              )
            })}
          </ol>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-rentify-grayLight px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Created
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                {formatDate(agreement.createdAt)}
              </dd>
            </div>
            <div className="rounded-xl border border-rentify-grayLight px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Tenancy start
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                {formatDate(agreement.startDate)}
              </dd>
            </div>
            <div className="rounded-xl border border-rentify-grayLight px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Sent to lawyer
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                {formatDate(agreement.sentToLawyerAt)}
              </dd>
            </div>
            <div className="rounded-xl border border-rentify-grayLight px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Final uploaded
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                {formatDate(agreement.finalAgreementUploadedAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {(isParticipant || isStaff) &&
              (agreement.status === 'Information Required' ||
                agreement.status === 'Draft') &&
              workflow?.canAdvanceToDocuments && (
                <Button
                  onClick={() =>
                    void runStatusAction(
                      () => setAgreementStatus(agreement.id, 'Documents Required'),
                      'Information marked complete. Upload documents next.',
                    )
                  }
                >
                  Continue to documents
                </Button>
              )}
            {(isParticipant || isStaff) &&
              agreement.status === 'Documents Required' &&
              workflow?.canAdvanceToSigning && (
                <Button
                  onClick={() =>
                    void runStatusAction(
                      () =>
                        setAgreementStatus(
                          agreement.id,
                          'Awaiting Tenant Signature',
                        ),
                      'Documents complete. Awaiting tenant signature.',
                    )
                  }
                >
                  Continue to signatures
                </Button>
              )}
            {(isParticipant || isStaff) &&
              agreement.status === 'Documents Required' &&
              workflow && !workflow.canAdvanceToSigning && (
                <p className="text-sm text-rentify-grayMuted">
                  Complete all required information and documents to continue to
                  signatures.
                </p>
              )}
            {isOwner && agreement.status === 'Pending' && (
              <Button
                onClick={() =>
                  void runStatusAction(
                    () => approveAgreement(agreement.id),
                    'Agreement approved.',
                  )
                }
              >
                Approve agreement
              </Button>
            )}
            {(isParticipant || isStaff) && agreement.status === 'Draft' && (
              <Button
                onClick={() =>
                  void runStatusAction(
                    () => setAgreementStatus(agreement.id, 'Information Required'),
                    'Agreement moved to information collection.',
                  )
                }
              >
                Start information collection
              </Button>
            )}
            {isStaff && agreement.status === 'Ready for Lawyer Review' && (
              <Button
                onClick={() =>
                  void runStatusAction(
                    () => setAgreementStatus(agreement.id, 'Sent to Lawyer'),
                    'Package marked as sent to lawyer.',
                  )
                }
              >
                Mark sent to lawyer
              </Button>
            )}
            {isStaff && agreement.status === 'Sent to Lawyer' && (
              <Button
                onClick={() =>
                  void runStatusAction(
                    () => setAgreementStatus(agreement.id, 'Under Legal Review'),
                    'Legal review started.',
                  )
                }
              >
                Start legal review
              </Button>
            )}
            {isStaff && agreement.status === 'Under Legal Review' && (
              <Button
                onClick={() =>
                  void runStatusAction(
                    () =>
                      setAgreementStatus(
                        agreement.id,
                        'Awaiting Final Agreement',
                      ),
                    'Awaiting final agreement from lawyer.',
                  )
                }
              >
                Awaiting final agreement
              </Button>
            )}
            {isStaff && agreement.status === 'Final Agreement Uploaded' && (
              <Button
                onClick={() =>
                  void runStatusAction(
                    () => setAgreementStatus(agreement.id, 'Completed'),
                    'Agreement completed.',
                  )
                }
              >
                Mark completed
              </Button>
            )}
            {(isOwner || isStaff) &&
              agreement.status !== 'Rejected' &&
              agreement.status !== 'Completed' && (
                <Button
                  variant="outline"
                  onClick={() =>
                    void runStatusAction(
                      () => setAgreementStatus(agreement.id, 'Rejected'),
                      'Agreement rejected.',
                    )
                  }
                >
                  Reject
                </Button>
              )}
          </div>
        </SectionCard>

        {/* B. Property Details */}
        <SectionCard id="property-heading" title="B. Property Details">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-rentify-grayLight px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Property name
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                {property?.title ??
                  agreement.propertyTitle ??
                  'Property unavailable'}
              </dd>
            </div>
            <div className="rounded-xl border border-rentify-grayLight px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Property reference
              </dt>
              <dd className="mt-1 break-all text-sm font-semibold text-rentify-navy">
                {agreement.propertyId}
              </dd>
            </div>
            <div className="rounded-xl border border-rentify-grayLight px-3 py-3 sm:col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Full address
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                {property
                  ? `${property.address}, ${property.location}, Vadodara, Gujarat, India`
                  : agreement.propertyAddress ?? '—'}
              </dd>
            </div>
          </dl>
          {property && (
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={() => navigate(`/properties/${property.id}`)}
              >
                View property
              </Button>
            </div>
          )}
        </SectionCard>

        {/* C. Parties */}
        <SectionCard id="parties-heading" title="C. Parties">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-rentify-grayLight bg-rentify-whiteOff p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Tenant
              </p>
              <p className="mt-2 text-sm font-semibold text-rentify-navy">
                {agreement.tenantName}
              </p>
              <p className="text-xs text-rentify-grayMuted">
                {agreement.tenantPhone ?? agreement.tenantEmail}
              </p>
              <p className="mt-2 text-xs text-rentify-grayMuted">
                {agreement.tenantAddress || 'Address on file'}
              </p>
            </div>
            <div className="rounded-2xl border border-rentify-grayLight bg-rentify-whiteOff p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Property Owner
              </p>
              <p className="mt-2 text-sm font-semibold text-rentify-navy">
                {agreement.ownerName}
              </p>
              <p className="text-xs text-rentify-grayMuted">
                {agreement.ownerPhone ?? agreement.ownerEmail}
              </p>
              <p className="mt-2 text-xs text-rentify-grayMuted">
                {agreement.ownerAddress || 'Address on file'}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* D. Information & Documents */}
        <SectionCard id="info-docs-heading" title="D. Information & Documents">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PartySummary
              roleLabel="Tenant"
              name={agreement.tenantName}
              contact={agreement.tenantPhone ?? agreement.tenantEmail}
              address={agreement.tenantAddress}
              docId={agreement.tenantDocId}
              photo={agreement.tenantPhoto}
              signature={agreement.tenantSignature}
              signedAt={agreement.tenantSignedAt}
              infoComplete={workflow?.tenantInfoComplete ?? false}
              docsComplete={workflow?.tenantDocsComplete ?? false}
              signatureComplete={tenantSigned}
            />
            <PartySummary
              roleLabel="Property Owner"
              name={agreement.ownerName}
              contact={agreement.ownerPhone ?? agreement.ownerEmail}
              address={agreement.ownerAddress}
              docId={agreement.ownerDocId}
              photo={agreement.ownerPhoto}
              signature={agreement.ownerSignature}
              signedAt={agreement.ownerSignedAt}
              infoComplete={workflow?.ownerInfoComplete ?? false}
              docsComplete={workflow?.ownerDocsComplete ?? false}
              signatureComplete={ownerSigned}
            />
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-rentify-navy">
              Tenant document checklist
            </h3>
            <div className="mt-2">
              <DocumentChecklist
                required={requiredTenant}
                documents={tenantDocs}
                canUpload={Boolean(isTenant || isStaff)}
                canRemove={Boolean(isTenant || isStaff)}
                canVerify={Boolean(isStaff)}
                onUpload={handleDocUpload}
                onRemove={handleDocRemove}
                onVerify={handleDocVerify}
                onDownload={handleDocDownload}
                busyType={busyDocType}
              />
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-rentify-navy">
              Owner document checklist
            </h3>
            <div className="mt-2">
              <DocumentChecklist
                required={requiredOwner}
                documents={ownerDocs}
                canUpload={Boolean(isOwner || isStaff)}
                canRemove={Boolean(isOwner || isStaff)}
                canVerify={Boolean(isStaff)}
                onUpload={handleDocUpload}
                onRemove={handleDocRemove}
                onVerify={handleDocVerify}
                onDownload={handleDocDownload}
                busyType={busyDocType}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-rentify-whiteOff px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Info
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  infoComplete ? 'text-rentify-successGreen' : 'text-rentify-navy'
                }`}
              >
                {infoComplete ? 'Complete' : 'Incomplete'}
              </p>
            </div>
            <div className="rounded-xl bg-rentify-whiteOff px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Documents
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  docsComplete ? 'text-rentify-successGreen' : 'text-rentify-navy'
                }`}
              >
                {docsComplete ? 'Complete' : 'Incomplete'}
              </p>
            </div>
            <div className="rounded-xl bg-rentify-whiteOff px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Signatures
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  signaturesComplete
                    ? 'text-rentify-successGreen'
                    : 'text-rentify-navy'
                }`}
              >
                {signaturesComplete ? 'Complete' : 'Incomplete'}
              </p>
            </div>
            <div className="rounded-xl bg-rentify-whiteOff px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Package
              </p>
              <p className="mt-1 text-sm font-semibold text-rentify-navy">
                {workflow?.readyForLawyer ? 'Ready' : 'Not ready'}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* E. Digital Signatures */}
        <SectionCard id="signatures-heading" title="E. Digital Signatures">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-rentify-grayLight px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Tenant signature
              </p>
              {tenantSigned ? (
                <>
                  <p
                    className="mt-2 text-lg text-rentify-navy"
                    style={{ fontFamily: 'cursive' }}
                  >
                    {agreement.tenantSignature || agreement.tenantName}
                  </p>
                  <p className="mt-1 text-xs font-medium text-rentify-successGreen">
                    Completed · {formatDate(agreement.tenantSignedAt)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-rentify-grayMuted">
                  Not signed yet
                </p>
              )}
            </div>
            <div className="rounded-xl border border-rentify-grayLight px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Owner signature
              </p>
              {ownerSigned ? (
                <>
                  <p
                    className="mt-2 text-lg text-rentify-navy"
                    style={{ fontFamily: 'cursive' }}
                  >
                    {agreement.ownerSignature || agreement.ownerName}
                  </p>
                  <p className="mt-1 text-xs font-medium text-rentify-successGreen">
                    Completed · {formatDate(agreement.ownerSignedAt)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-rentify-grayMuted">
                  Not signed yet
                </p>
              )}
            </div>
          </div>

          {(canSign ||
            ((agreement.status === 'Awaiting Signatures' ||
              agreement.status === 'Awaiting Tenant Signature' ||
              agreement.status === 'Awaiting Owner Signature') &&
              (isOwner || isTenant))) && (
            <section
              aria-labelledby="sign-heading"
              className="mt-5 rounded-2xl border border-rentify-purpleLight bg-rentify-purpleLight3 p-5"
            >
              <h3
                id="sign-heading"
                className="font-display text-lg font-semibold text-rentify-navy"
              >
                Sign this agreement
              </h3>
              <p className="mt-1 text-sm text-rentify-grayMuted">
                {canSign
                  ? canSignAsTenant
                    ? 'You are signing as the tenant. Upload a photo ID and type your signature.'
                    : 'You are signing as the property owner. Upload a photo ID and type your signature.'
                  : 'Waiting for the other party to sign.'}
              </p>

              {canSign && (
                <form onSubmit={handleSign} className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="sign-photo"
                        className="mb-1.5 block text-sm font-medium text-rentify-navy"
                      >
                        Photo ID
                      </label>
                      <input
                        id="sign-photo"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="block w-full rounded-xl border border-rentify-borderDefault bg-white px-3 py-2.5 text-sm text-rentify-navy file:mr-3 file:rounded-lg file:border-0 file:bg-rentify-purpleLight file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-rentify-navy hover:file:bg-rentify-purpleLight2"
                      />
                      {uploading && (
                        <p className="mt-1 text-xs text-rentify-grayMuted">
                          Processing image…
                        </p>
                      )}
                      {photoError && (
                        <p className="mt-1 text-xs text-red-500" role="alert">
                          {photoError}
                        </p>
                      )}
                      {photoDataUrl && (
                        <img
                          src={photoDataUrl}
                          alt="Photo ID preview"
                          className="mt-2 h-20 w-20 rounded-lg border border-rentify-grayLight object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="sign-name"
                        className="mb-1.5 block text-sm font-medium text-rentify-navy"
                      >
                        Typed signature
                      </label>
                      <Input
                        id="sign-name"
                        value={signatureName}
                        onChange={(e) => setSignatureName(e.target.value)}
                        placeholder="Your full name"
                        autoComplete="name"
                        style={{ fontFamily: 'cursive', fontSize: '1.1rem' }}
                      />
                      {signatureName.trim() && (
                        <p
                          className="mt-2 rounded-lg border border-dashed border-rentify-grayLight bg-white px-3 py-2 text-lg text-rentify-navy"
                          style={{ fontFamily: 'cursive' }}
                          aria-label="Signature preview"
                        >
                          {signatureName}
                        </p>
                      )}
                    </div>
                  </div>

                  {signError && (
                    <p className="text-sm font-medium text-red-500" role="alert">
                      {signError}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" disabled={uploading}>
                      {canSignAsTenant ? 'Sign as Tenant' : 'Sign as Owner'}
                    </Button>
                  </div>
                </form>
              )}
            </section>
          )}

          {signNotice && (
            <p
              className="mt-4 rounded-xl bg-rentify-purpleLight3 px-3.5 py-2.5 text-sm font-medium text-rentify-navy"
              role="status"
            >
              {signNotice}
            </p>
          )}
        </SectionCard>

        {/* F. Lawyer Review */}
        <SectionCard id="lawyer-heading" title="F. Lawyer Review">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-rentify-grayLight px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Package status
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                {workflow?.readyForLawyer
                  ? 'Complete package ready'
                  : 'Package incomplete'}
              </dd>
            </div>
            <div className="rounded-xl border border-rentify-grayLight px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Lawyer review status
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                {agreement.status === 'Ready for Lawyer Review'
                  ? 'Ready for lawyer review'
                  : agreement.status === 'Sent to Lawyer'
                    ? 'Sent to lawyer'
                    : agreement.status === 'Under Legal Review'
                      ? 'Under legal review'
                      : agreement.status === 'Awaiting Final Agreement'
                        ? 'Awaiting final agreement'
                        : agreement.status === 'Final Agreement Uploaded' ||
                            agreement.status === 'Completed'
                          ? 'Final agreement provided'
                          : 'Not yet sent'}
              </dd>
            </div>
            <div className="rounded-xl border border-rentify-grayLight px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                Date sent to lawyer
              </dt>
              <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                {formatDate(agreement.sentToLawyerAt)}
              </dd>
            </div>
          </dl>
          {agreement.lawyerNotes && (
            <div className="mt-3 rounded-xl border border-rentify-grayLight px-4 py-3 text-sm text-rentify-grayMuted">
              <strong className="text-rentify-navy">Lawyer notes:</strong>{' '}
              {agreement.lawyerNotes}
            </div>
          )}

          {isStaff &&
            (agreement.status === 'Ready for Lawyer Review' ||
              agreement.status === 'Sent to Lawyer' ||
              agreement.status === 'Under Legal Review' ||
              agreement.status === 'Awaiting Final Agreement' ||
              agreement.status === 'Final Agreement Uploaded') && (
              <div className="mt-4 rounded-2xl border border-rentify-purpleLight bg-rentify-purpleLight3 p-5">
                <h3 className="font-display text-base font-semibold text-rentify-navy">
                  Upload final legal rent agreement
                </h3>
                <p className="mt-1 text-sm text-rentify-grayMuted">
                  Lawyer/admin only. The uploaded file becomes the authoritative
                  final document for both parties.
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-rentify-navy/30 bg-white px-3 py-2 text-sm font-semibold text-rentify-navy hover:bg-rentify-purpleLight2">
                    {finalFileName || 'Choose file (PDF or image)'}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="sr-only"
                      onChange={handleFinalFileChange}
                    />
                  </label>
                  <Button
                    onClick={() => void handleFinalUpload()}
                    disabled={finalUploading || !finalFileData}
                  >
                    {finalUploading ? 'Uploading…' : 'Upload final agreement'}
                  </Button>
                </div>
              </div>
            )}
        </SectionCard>

        {/* G. Final Legal Agreement */}
        <SectionCard
          id="final-heading"
          title="G. Final Legal Agreement"
          action={
            agreement.hasFinalAgreement ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void handleViewFinal()}>
                  View Agreement
                </Button>
                <Button variant="outline" onClick={() => void handleViewFinal()}>
                  Download Agreement
                </Button>
              </div>
            ) : undefined
          }
        >
          {agreement.hasFinalAgreement ? (
            <div className="rounded-2xl border border-rentify-successGreen/40 bg-green-50 p-4 sm:p-5">
              <p className="font-display text-lg font-semibold text-rentify-navy">
                Final Legal Rent Agreement
              </p>
              <p className="mt-1 text-sm font-medium text-rentify-successGreen">
                Provided by Lawyer · Prepared/issued by Lawyer
              </p>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                    File
                  </dt>
                  <dd className="font-medium text-rentify-navy">
                    {agreement.finalAgreementFileName ?? 'legal-agreement'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                    Uploaded
                  </dt>
                  <dd className="font-medium text-rentify-navy">
                    {formatDate(agreement.finalAgreementUploadedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                    Agreement reference
                  </dt>
                  <dd className="break-all font-medium text-rentify-navy">
                    {agreement.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                    Property reference
                  </dt>
                  <dd className="break-all font-medium text-rentify-navy">
                    {agreement.propertyId}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-rentify-grayMuted">
                This document is provided by the lawyer and cannot be edited by
                tenants or owners.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-rentify-grayLight bg-rentify-whiteOff p-5 text-center">
              <p className="text-sm text-rentify-grayMuted">
                Final legal agreement is pending lawyer review.
              </p>
              <p className="mt-1 text-xs text-rentify-grayMuted">
                Rentify prepares the information and signature package. A lawyer
                prepares and issues the final legal rent agreement.
              </p>
            </div>
          )}
        </SectionCard>

        {/* Financial + Tenancy (supporting detail) */}
        <SectionCard id="financial-heading" title="Financial Terms">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {financialRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-rentify-grayLight px-3 py-3"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                  {row.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard id="tenancy-heading" title="Tenancy Period">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tenancyRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-rentify-grayLight px-3 py-3"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                  {row.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-rentify-navy">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          {agreement.otherTerms && (
            <div className="mt-3 rounded-xl border border-rentify-grayLight px-4 py-3 text-sm text-rentify-grayMuted">
              <p>
                <strong className="text-rentify-navy">Other terms:</strong>{' '}
                {agreement.otherTerms}
              </p>
            </div>
          )}
        </SectionCard>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="ghost" onClick={() => navigate('/agreements')}>
            Back to agreements
          </Button>
        </div>

        {/* DISCLAIMER */}
        <div className="mt-6 rounded-xl border border-rentify-cautionOrange/50 bg-rentify-purpleLight3 px-4 py-3 text-sm text-rentify-grayMuted">
          {AGREEMENT_DISCLAIMER}
        </div>
      </main>
    </div>
  )
}

export default AgreementDetailsPage
