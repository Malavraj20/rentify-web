import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { getOwnerById } from '../data/users'
import { AGREEMENT_DISCLAIMER } from '../data/agreements'
import { useAgreements } from '../context/AgreementsContext'
import { useAuth } from '../context/AuthContext'
import { useProperties } from '../context/PropertiesContext'
import { fileToDataUrl } from '../utils/imageUpload'
import { formatCurrency } from '../utils/currency'
import type { CreateAgreementInput } from '../context/AgreementsContext'
import type { Agreement } from '../types'

const STEP_LABELS = [
  'Property',
  'Owner',
  'Renter',
  'Financials',
  'Dates',
  'Documents',
  'Review',
  'Create',
] as const

function addMonths(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const selectClass =
  'block w-full appearance-none rounded-xl border border-rentify-borderDefault bg-white px-4 py-2.5 text-base text-rentify-navy shadow-sm transition-colors hover:border-rentify-lightNavy focus:border-rentify-navy focus:outline-none focus:ring-2 focus:ring-rentify-purpleLight'

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-rentify-navy">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-rentify-grayMuted">{hint}</p>}
    </div>
  )
}

const AgreementWizardPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const propertyParam = searchParams.get('property')
  const { properties, getPropertyById } = useProperties()
  const { user, isAuthenticated } = useAuth()
  const { createAgreement } = useAgreements()

  const [step, setStep] = useState(1)
  const [propertyId, setPropertyId] = useState(propertyParam ?? '')
  const [tenantName, setTenantName] = useState(user?.name ?? '')
  const [tenantPhone, setTenantPhone] = useState(user?.phone ?? '')
  const [tenantEmail, setTenantEmail] = useState(user?.email ?? '')
  const [tenantAddress, setTenantAddress] = useState('')
  const [tenantDocId, setTenantDocId] = useState('')
  const [startDate, setStartDate] = useState(todayIso())
  const [duration, setDuration] = useState('11')
  const [rent, setRent] = useState('')
  const [deposit, setDeposit] = useState('')
  const [maintenanceAmount, setMaintenanceAmount] = useState('')
  const [noticePeriod, setNoticePeriod] = useState('30')
  const [paymentDueDay, setPaymentDueDay] = useState('5')
  const [maintenance, setMaintenance] = useState<'Tenant' | 'Owner' | 'Shared'>('Tenant')
  const [otherTerms, setOtherTerms] = useState('')
  const [tenantPhoto, setTenantPhoto] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<Agreement | null>(null)
  const [creating, setCreating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const property = propertyId ? getPropertyById(propertyId) : undefined
  const seedOwner = property ? getOwnerById(property.ownerId) : undefined
  const ownerName =
    property?.ownerName ?? seedOwner?.name ?? undefined
  const owner = property
    ? {
        id: property.ownerId,
        name: ownerName ?? 'Property Owner',
        email: seedOwner?.email ?? '—',
        phone: seedOwner?.phone,
        role: 'Property Owner' as const,
      }
    : undefined

  // Prefill financials when property arrives from ?property= without a select change
  const [seededFor, setSeededFor] = useState('')
  if (property && seededFor !== property.id) {
    setSeededFor(property.id)
    if (!rent) setRent(String(property.price))
    if (!deposit) setDeposit(String(property.securityDeposit))
    if (!maintenanceAmount) setMaintenanceAmount(String(property.maintenance))
  }

  const endDate = useMemo(
    () => addMonths(startDate, parseInt(duration, 10) || 11),
    [startDate, duration],
  )

  const rentValue = Number(rent)
  const depositValue = Number(deposit)

  const ensureDefaults = () => ({
    propertyIdFallback: propertyId || properties[0]?.id || '',
  })

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-12 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-rentify-navy">
            Sign in to start an agreement
          </h1>
          <p className="mt-2 text-rentify-grayMuted">
            Rent agreements are tied to your Rentify account.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Go home
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const validateStep = (current: number): string => {
    if (current === 1) {
      if (!propertyId || !property) return 'Select a property for this agreement.'
    }
    if (current === 2) {
      if (!property || !property.ownerId)
        return 'Selected property has no linked owner.'
    }
    if (current === 3) {
      if (tenantName.trim().length < 2) return 'Enter the renter’s full name.'
      if (!tenantPhone.trim()) return 'Enter the renter’s phone number.'
      if (!tenantEmail.trim() || !tenantEmail.includes('@'))
        return 'Enter a valid renter email.'
      if (!tenantAddress.trim()) return 'Enter the renter’s current address.'
    }
    if (current === 4) {
      if (!Number.isFinite(rentValue) || rentValue <= 0)
        return 'Monthly rent must be a positive amount.'
      if (!Number.isFinite(depositValue) || depositValue < 0)
        return 'Security deposit must be zero or more.'
      const maint = Number(maintenanceAmount || '0')
      if (!Number.isFinite(maint) || maint < 0)
        return 'Maintenance amount must be zero or more.'
    }
    if (current === 5) {
      if (!startDate) return 'Choose a lease start date.'
      if (!endDate || endDate <= startDate) return 'Lease end must be after the start date.'
      const due = parseInt(paymentDueDay, 10)
      if (due < 1 || due > 28) return 'Payment due day must be between 1 and 28.'
      const notice = parseInt(noticePeriod, 10)
      if (notice < 0 || notice > 180) return 'Notice period must be 0–180 days.'
    }
    return ''
  }

  const handleNext = (event: FormEvent) => {
    event.preventDefault()
    const message = validateStep(step)
    if (message) {
      setError(message)
      return
    }
    setError('')
    setStep((s) => Math.min(s + 1, 8))
  }

  const handleBack = () => {
    setError('')
    setStep((s) => Math.max(s - 1, 1))
  }

  const buildInput = (status?: CreateAgreementInput['status']): CreateAgreementInput => {
    const fallbackId = ensureDefaults().propertyIdFallback
    const fallbackProperty = getPropertyById(fallbackId) ?? properties[0]
    const fallbackOwnerName =
      fallbackProperty?.ownerName ??
      (fallbackProperty ? getOwnerById(fallbackProperty.ownerId)?.name : undefined)
    return {
      propertyId: propertyId || fallbackProperty?.id || '',
      propertyTitle: property?.title ?? fallbackProperty?.title,
      propertyAddress: property?.address ?? fallbackProperty?.address,
      tenantId: user.id,
      tenantName: tenantName.trim() || user.name,
      tenantPhone: tenantPhone.trim() || undefined,
      tenantEmail: tenantEmail.trim() || user.email,
      tenantAddress: tenantAddress.trim() || undefined,
      tenantDocId: tenantDocId.trim() || undefined,
      ownerId: property?.ownerId ?? fallbackProperty?.ownerId ?? 'unknown',
      ownerName: property?.ownerName ?? owner?.name ?? fallbackOwnerName ?? 'Property Owner',
      ownerPhone: owner?.phone,
      ownerEmail: owner?.email === '—' ? undefined : owner?.email,
      monthlyRent: Number.isFinite(rentValue) && rentValue > 0 ? rentValue : property?.price ?? 0,
      securityDeposit:
        Number.isFinite(depositValue) && depositValue >= 0
          ? depositValue
          : property?.securityDeposit ?? 0,
      maintenanceAmount: Number(maintenanceAmount || '0') || undefined,
      startDate: startDate || todayIso(),
      endDate: endDate || addMonths(todayIso(), 11),
      noticePeriodDays: parseInt(noticePeriod, 10) || 30,
      paymentDueDay: parseInt(paymentDueDay, 10) || 5,
      maintenanceResponsibility: maintenance,
      otherTerms: otherTerms.trim() || undefined,
      status,
      tenantPhoto: tenantPhoto || undefined,
    }
  }

  const handleSaveDraft = async () => {
    setError('')
    setCreating(true)
    try {
      const agreement = await createAgreement(buildInput('Draft'))
      setSuccess(agreement)
      window.setTimeout(() => navigate(`/agreements/${agreement.id}`), 600)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save the draft.',
      )
      setCreating(false)
    }
  }

  const handleCreate = async () => {
    const message = validateStep(3) || validateStep(4) || validateStep(5)
    if (message) {
      setError(message)
      return
    }
    if (!acknowledged) {
      setError('Acknowledge the demo disclaimer before creating the agreement.')
      return
    }
    setError('')
    setCreating(true)
    try {
      const agreement = await createAgreement(buildInput('Information Required'))
      setSuccess(agreement)
      window.setTimeout(() => navigate(`/agreements/${agreement.id}`), 700)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not create the agreement.',
      )
      setCreating(false)
    }
  }

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoError('')
    setUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      setTenantPhoto(dataUrl)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not read image.')
    } finally {
      setUploading(false)
      if (event.target) event.target.value = ''
    }
  }

  const progress = Math.round((step / 8) * 100)

  const reviewRows = property
    ? [
        { label: 'Property', value: property.title },
        { label: 'Address', value: property.address },
        { label: 'Property Owner', value: owner?.name ?? 'Property Owner' },
        { label: 'Renter', value: tenantName || user.name },
        { label: 'Renter phone', value: tenantPhone || user.phone || '—' },
        { label: 'Renter email', value: tenantEmail || user.email },
        { label: 'Monthly rent', value: formatCurrency(rentValue || property.price) },
        {
          label: 'Security deposit',
          value: formatCurrency(depositValue || property.securityDeposit),
        },
        {
          label: 'Maintenance',
          value: `${formatCurrency(Number(maintenanceAmount || '0'))} · ${maintenance} responsibility`,
        },
        { label: 'Lease start', value: formatDate(startDate) },
        { label: 'Lease end', value: formatDate(endDate) },
        { label: 'Notice period', value: `${noticePeriod} days` },
        { label: 'Payment due', value: `Day ${paymentDueDay} of every month` },
        { label: 'Documents', value: tenantPhoto ? 'Photo ID attached' : 'None attached (optional)' },
        { label: 'Other terms', value: otherTerms.trim() || '—' },
      ]
    : []

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header
        showBack
        onBack={() => {
          if (success) {
            navigate('/agreements')
          } else if (step > 1) {
            handleBack()
          } else if (propertyId) {
            navigate(`/properties/${propertyId}`)
          } else {
            navigate('/agreements')
          }
        }}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
              Start Rent Agreement
            </h1>
            <p className="mt-2 text-rentify-grayMuted">
              {property
                ? `${property.title} · ${property.location}, Vadodara`
                : 'Choose a property, fill the details, review and create'}
            </p>
          </div>
          <Badge variant="default">Step {step} of 8</Badge>
        </div>

        {/* Progress */}
        <div className="mt-6" aria-label={`Step ${step} of 8`}>
          <div className="flex items-center justify-between text-xs font-semibold text-rentify-grayMuted">
            <span>{STEP_LABELS[step - 1]}</span>
            <span>{progress}%</span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-rentify-grayLight"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-rentify-navy transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ol className="mt-3 hidden flex-wrap gap-1.5 sm:flex" aria-label="Agreement steps">
            {STEP_LABELS.map((label, index) => {
              const n = index + 1
              const active = n === step
              const done = n < step
              return (
                <li
                  key={label}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    active
                      ? 'border-rentify-navy bg-rentify-navy text-white'
                      : done
                        ? 'border-rentify-successGreen/40 bg-rentify-purpleLight text-rentify-navy'
                        : 'border-rentify-grayLight bg-white text-rentify-grayMuted'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                      active ? 'bg-white/20 text-white' : 'bg-rentify-purpleLight text-rentify-navy'
                    }`}
                  >
                    {n}
                  </span>
                  {label}
                </li>
              )
            })}
          </ol>
        </div>

        <div className="mt-6 rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-7">
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-4" noValidate>
              <h2 className="font-display text-lg font-semibold text-rentify-navy">
                1 · Property
              </h2>
              <p className="text-sm text-rentify-grayMuted">
                Select the Vadodara property this rent agreement applies to.
              </p>
              <Field id="wizard-property" label="Property">
                <select
                  id="wizard-property"
                  value={propertyId}
                  onChange={(e) => {
                    setPropertyId(e.target.value)
                    const next = getPropertyById(e.target.value)
                    if (next) {
                      setRent(String(next.price))
                      setDeposit(String(next.securityDeposit))
                    }
                  }}
                  className={selectClass}
                >
                  <option value="">Choose a property…</option>
                  {properties
                    .filter((p) => p.status !== 'draft')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} — {p.location} ({formatCurrency(p.price)}/mo)
                      </option>
                    ))}
                </select>
              </Field>
              {property && (
                <div className="rounded-xl bg-rentify-whiteOff px-4 py-3 text-sm text-rentify-grayMuted">
                  <p className="font-semibold text-rentify-navy">{property.address}</p>
                  <p className="mt-0.5">
                    {property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} BHK`} ·{' '}
                    {property.size} sqft · {property.furnishing} ·{' '}
                    {formatCurrency(property.price)}/month
                  </p>
                </div>
              )}
              {error && (
                <p className="text-sm font-medium text-red-500" role="alert">
                  {error}
                </p>
              )}
              <div className="flex justify-between gap-2 border-t border-rentify-grayLight pt-4">
                <Button variant="ghost" onClick={() => navigate('/search')}>
                  Browse instead
                </Button>
                <Button type="submit">Continue</Button>
              </div>
            </form>
          )}

          {step === 2 && property && owner && (
            <form onSubmit={handleNext} className="space-y-4" noValidate>
              <h2 className="font-display text-lg font-semibold text-rentify-navy">
                2 · Property Owner
              </h2>
              <p className="text-sm text-rentify-grayMuted">
                Owner details are pulled from the listing.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="owner-name" label="Owner name">
                  <Input id="owner-name" value={owner.name} readOnly />
                </Field>
                <Field id="owner-email" label="Owner email">
                  <Input id="owner-email" value={owner.email} readOnly />
                </Field>
                <Field id="owner-phone" label="Owner phone">
                  <Input id="owner-phone" value={owner.phone ?? '—'} readOnly />
                </Field>
                <Field id="owner-id" label="Owner ID">
                  <Input id="owner-id" value={owner.id} readOnly />
                </Field>
              </div>
              <div className="rounded-xl bg-rentify-whiteOff px-4 py-3 text-sm text-rentify-grayMuted">
                The owner reviews and signs the agreement from their dashboard after
                you create it.
              </div>
              {error && (
                <p className="text-sm font-medium text-red-500" role="alert">
                  {error}
                </p>
              )}
              <div className="flex justify-between gap-2 border-t border-rentify-grayLight pt-4">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button type="submit">Continue</Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleNext} className="space-y-4" noValidate>
              <h2 className="font-display text-lg font-semibold text-rentify-navy">
                3 · Renter
              </h2>
              <p className="text-sm text-rentify-grayMuted">
                Filled from your profile — edit anything that differs.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="renter-name" label="Full name">
                  <Input
                    id="renter-name"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    autoComplete="name"
                  />
                </Field>
                <Field id="renter-phone" label="Phone">
                  <Input
                    id="renter-phone"
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                  />
                </Field>
                <Field id="renter-email" label="Email">
                  <Input
                    id="renter-email"
                    type="email"
                    value={tenantEmail}
                    onChange={(e) => setTenantEmail(e.target.value)}
                    autoComplete="email"
                  />
                </Field>
                <Field id="renter-doc" label="ID document number (optional)">
                  <Input
                    id="renter-doc"
                    value={tenantDocId}
                    onChange={(e) => setTenantDocId(e.target.value)}
                    placeholder="Aadhaar / PAN"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    id="renter-address"
                    label="Current address"
                    hint="Street, area, city, pincode"
                  >
                    <Input
                      id="renter-address"
                      value={tenantAddress}
                      onChange={(e) => setTenantAddress(e.target.value)}
                      placeholder="12 Shanti Nagar, Gotri, Vadodara 390022"
                    />
                  </Field>
                </div>
              </div>
              {error && (
                <p className="text-sm font-medium text-red-500" role="alert">
                  {error}
                </p>
              )}
              <div className="flex justify-between gap-2 border-t border-rentify-grayLight pt-4">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button type="submit">Continue</Button>
              </div>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleNext} className="space-y-4" noValidate>
              <h2 className="font-display text-lg font-semibold text-rentify-navy">
                4 · Financials
              </h2>
              <p className="text-sm text-rentify-grayMuted">
                Pre-filled from the listing — adjust the agreed terms.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="wiz-rent" label="Monthly rent (₹)">
                  <Input
                    id="wiz-rent"
                    type="number"
                    min={0}
                    step={500}
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                  />
                </Field>
                <Field id="wiz-deposit" label="Security deposit (₹)">
                  <Input
                    id="wiz-deposit"
                    type="number"
                    min={0}
                    step={1000}
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                  />
                </Field>
                <Field id="wiz-maint-amount" label="Monthly maintenance (₹)">
                  <Input
                    id="wiz-maint-amount"
                    type="number"
                    min={0}
                    step={100}
                    value={maintenanceAmount}
                    onChange={(e) => setMaintenanceAmount(e.target.value)}
                    placeholder={property ? String(property.maintenance) : '0'}
                  />
                </Field>
                <Field id="wiz-maint" label="Maintenance responsibility">
                  <select
                    id="wiz-maint"
                    value={maintenance}
                    onChange={(e) =>
                      setMaintenance(e.target.value as 'Tenant' | 'Owner' | 'Shared')
                    }
                    className={selectClass}
                  >
                    <option value="Tenant">Tenant</option>
                    <option value="Owner">Owner</option>
                    <option value="Shared">Shared</option>
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field id="wiz-terms" label="Other terms (optional)">
                    <textarea
                      id="wiz-terms"
                      rows={3}
                      value={otherTerms}
                      onChange={(e) => setOtherTerms(e.target.value)}
                      placeholder="No pets. Society charges extra during summer…"
                      className="block w-full rounded-xl border border-rentify-borderDefault bg-white px-4 py-2.5 text-base text-rentify-navy shadow-sm transition-colors hover:border-rentify-lightNavy focus:border-rentify-navy focus:outline-none focus:ring-2 focus:ring-rentify-purpleLight"
                    />
                  </Field>
                </div>
              </div>
              {error && (
                <p className="text-sm font-medium text-red-500" role="alert">
                  {error}
                </p>
              )}
              <div className="flex justify-between gap-2 border-t border-rentify-grayLight pt-4">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button type="submit">Continue</Button>
              </div>
            </form>
          )}

          {step === 5 && (
            <form onSubmit={handleNext} className="space-y-4" noValidate>
              <h2 className="font-display text-lg font-semibold text-rentify-navy">
                5 · Dates
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="wiz-start" label="Lease start date">
                  <Input
                    id="wiz-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Field>
                <Field id="wiz-duration" label="Lease duration">
                  <select
                    id="wiz-duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={selectClass}
                  >
                    <option value="11">11 months</option>
                    <option value="12">12 months</option>
                    <option value="6">6 months</option>
                    <option value="3">3 months</option>
                  </select>
                </Field>
                <Field id="wiz-end" label="Lease end date (computed)">
                  <Input id="wiz-end" value={formatDate(endDate)} readOnly />
                </Field>
                <Field id="wiz-notice" label="Notice period">
                  <select
                    id="wiz-notice"
                    value={noticePeriod}
                    onChange={(e) => setNoticePeriod(e.target.value)}
                    className={selectClass}
                  >
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                </Field>
                <Field id="wiz-due" label="Rent payment due (day of month)">
                  <select
                    id="wiz-due"
                    value={paymentDueDay}
                    onChange={(e) => setPaymentDueDay(e.target.value)}
                    className={selectClass}
                  >
                    {[1, 5, 7, 10, 15].map((day) => (
                      <option key={day} value={String(day)}>
                        Day {day}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {error && (
                <p className="text-sm font-medium text-red-500" role="alert">
                  {error}
                </p>
              )}
              <div className="flex justify-between gap-2 border-t border-rentify-grayLight pt-4">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button type="submit">Continue</Button>
              </div>
            </form>
          )}

          {step === 6 && (
            <form onSubmit={handleNext} className="space-y-4" noValidate>
              <h2 className="font-display text-lg font-semibold text-rentify-navy">
                6 · Documents
              </h2>
              <p className="text-sm text-rentify-grayMuted">
                Optional — attach a photo ID now, or upload it later when signing on
                the agreement details page.
              </p>
              <Field id="wiz-photo" label="Photo ID (optional)">
                <input
                  id="wiz-photo"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full rounded-xl border border-rentify-borderDefault bg-white px-3 py-2.5 text-sm text-rentify-navy file:mr-3 file:rounded-lg file:border-0 file:bg-rentify-purpleLight file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-rentify-navy hover:file:bg-rentify-purpleLight2"
                />
                {uploading && (
                  <p className="mt-1 text-xs text-rentify-grayMuted">Processing image…</p>
                )}
                {photoError && (
                  <p className="mt-1 text-xs text-red-500" role="alert">
                    {photoError}
                  </p>
                )}
                {tenantPhoto && (
                  <img
                    src={tenantPhoto}
                    alt="Photo ID preview"
                    className="mt-2 h-24 w-24 rounded-lg border border-rentify-grayLight object-cover"
                  />
                )}
              </Field>
              <div className="rounded-xl bg-rentify-whiteOff px-4 py-3 text-sm text-rentify-grayMuted">
                Signing (typed signature + photo ID) happens on the agreement details
                page for both tenant and owner.
              </div>
              <div className="flex justify-between gap-2 border-t border-rentify-grayLight pt-4">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSaveDraft} disabled={creating}>
                    Save draft
                  </Button>
                  <Button type="submit">Continue</Button>
                </div>
              </div>
            </form>
          )}

          {step === 7 && property && (
            <div>
              <h2 className="font-display text-lg font-semibold text-rentify-navy">
                7 · Review
              </h2>
              <p className="mt-1 text-sm text-rentify-grayMuted">
                Check every term before creating the demo agreement.
              </p>
              <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {reviewRows.map((row) => (
                  <div key={row.label} className="rounded-xl bg-rentify-whiteOff px-4 py-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                      {row.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-rentify-navy">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <label className="mt-5 flex items-start gap-3 rounded-xl border border-rentify-grayLight px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-rentify-navy"
                />
                <span className="text-sm text-rentify-grayMuted">
                  I understand Rentify only prepares the information, document
                  and signature <strong>package for lawyer review</strong>. The
                  final legal rent agreement is prepared and issued by a lawyer —
                  not generated by Rentify.
                </span>
              </label>

              {error && (
                <p className="mt-3 text-sm font-medium text-red-500" role="alert">
                  {error}
                </p>
              )}

              <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-rentify-grayLight pt-4">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSaveDraft} disabled={creating}>
                    Save draft
                  </Button>
                  <Button onClick={handleCreate} disabled={!acknowledged || creating}>
                    {creating ? 'Creating…' : 'Create agreement'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="py-8 text-center">
              {success ? (
                <>
                  <span
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rentify-purpleLight text-rentify-deepNavy"
                    aria-hidden
                  >
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                  <h2 className="mt-4 font-display text-xl font-bold text-rentify-navy">
                    Agreement created ({success.status})
                  </h2>
                  <p className="mt-2 text-sm text-rentify-grayMuted">
                    Opening agreement details…
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-display text-xl font-bold text-rentify-navy">
                    Create agreement
                  </h2>
                  <p className="mt-2 text-sm text-rentify-grayMuted">
                    Create now or save a draft to finish later.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button variant="outline" onClick={handleSaveDraft} disabled={creating}>
                      Save draft
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={!acknowledged || creating}
                    >
                      {creating ? 'Creating…' : 'Create agreement'}
                    </Button>
                  </div>
                </>
              )}
              <p className="mx-auto mt-6 max-w-md text-xs text-rentify-grayMuted">
                {AGREEMENT_DISCLAIMER}
              </p>
              {error && (
                <p className="mt-3 text-sm font-medium text-red-500" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {!property && step <= 2 && (
          <p className="mt-4 text-center text-xs text-rentify-grayMuted">
            Tip: open any property and use “Start Rent Agreement” to pre-select it.
          </p>
        )}
      </main>
    </div>
  )
}

export default AgreementWizardPage
