import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { useProperties } from '../context/PropertiesContext'
import { fileToDataUrl } from '../utils/imageUpload'
import { formatCurrency } from '../utils/currency'
import { apiRequest, extractErrorMessage } from '../utils/api'
import { mapApiProperty } from '../utils/property'
import {
  RentalPreferencesWizard,
  emptyRentalPreferences,
  isRentalPreferencesComplete,
} from '../components/features/RentalPreferencesWizard'
import { LocationMapPicker } from '../components/features/LocationMapPicker'
import type { ListingFor, RentalPreferences, RiskLevel } from '../types'

const selectClass =
  'block w-full appearance-none rounded-xl border border-rentify-borderDefault bg-white px-4 py-2.5 text-base text-rentify-navy shadow-sm transition-colors hover:border-rentify-lightNavy focus:border-rentify-navy focus:outline-none focus:ring-2 focus:ring-rentify-purpleLight'

const MIN_PROPERTY_PHOTOS = 5

const PHOTO_VALIDATION_MESSAGE =
  'Please upload at least 5 photos of the property before publishing.'

function todayPlusDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

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

interface FormState {
  title: string
  type: string
  price: string
  sellingPrice: string
  listingFor: ListingFor
  location: string
  address: string
  city: string
  state: string
  pincode: string
  bedrooms: string
  bathrooms: string
  size: string
  floor: string
  totalFloors: string
  furnishing: string
  parking: string
  amenities: string
  description: string
  securityDeposit: string
  maintenance: string
  otherCharges: string
  available: boolean
  availableFrom: string
  images: string[]
  status: 'draft' | 'active'
  commute: string
  latitude?: number
  longitude?: number
}

const emptyForm: FormState = {
  title: '',
  type: 'Apartment',
  price: '',
  sellingPrice: '',
  listingFor: 'rent',
  location: '',
  address: '',
  city: 'Vadodara',
  state: 'Gujarat',
  pincode: '',
  bedrooms: '2',
  bathrooms: '2',
  size: '',
  floor: '',
  totalFloors: '',
  furnishing: 'Semi-Furnished',
  parking: '1 car',
  amenities: '',
  description: '',
  securityDeposit: '',
  maintenance: '',
  otherCharges: '',
  available: true,
  availableFrom: todayPlusDays(7),
  images: [],
  status: 'active',
  commute: '20 min',
}

type FormStep = 'details' | 'preferences' | 'review'

const TOKEN_STORAGE_KEY = 'rentify:token'

const PLACEHOLDER_IMAGE_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect fill="#e8e6f5" width="800" height="500"/><text x="400" y="255" text-anchor="middle" fill="#767e91" font-size="24" font-family="sans-serif">Rentify listing</text></svg>`,
  )

interface ApiPropertyImage {
  id: string
  imageUrl: string
  displayOrder: number
}

interface ApiPropertyPayload {
  id: string
  title: string
  type: string
  price: number
  sellingPrice?: number | null
  listingFor?: ListingFor | null
  location: string
  address: string
  city: string
  state?: string | null
  pincode?: string | null
  bedrooms: number
  bathrooms: number
  size: number
  commute?: string | null
  matchScore?: number | null
  healthScore?: number | null
  riskLevel?: RiskLevel | null
  amenities: string[]
  description: string
  securityDeposit: number
  maintenance: number
  otherCharges?: number | null
  available: boolean
  availableFrom?: string | null
  views: number
  furnishing: string
  status?: 'draft' | 'active' | null
  floor?: string | null
  totalFloors?: string | null
  parking?: string | null
  latitude?: number | null
  longitude?: number | null
  ownerId: string
  images?: ApiPropertyImage[]
}

function readAuthToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

const PropertyFormPage = () => {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user, role, isAuthenticated } = useAuth()
  const { getPropertyById, insertProperty } = useProperties()

  const existing = isEdit ? getPropertyById(id ?? '') : undefined

  const [form, setForm] = useState<FormState>(() => {
    if (existing) {
      return {
        title: existing.title,
        type: existing.type,
        price: String(existing.price),
        sellingPrice:
          typeof existing.sellingPrice === 'number' && existing.sellingPrice > 0
            ? String(existing.sellingPrice)
            : '',
        listingFor:
          existing.listingFor ??
          (typeof existing.sellingPrice === 'number' && existing.sellingPrice > 0
            ? 'both'
            : 'rent'),
        location: existing.location,
        address: existing.address,
        city: existing.city,
        state: existing.state ?? 'Gujarat',
        pincode: existing.pincode ?? '',
        bedrooms: String(existing.bedrooms),
        bathrooms: String(existing.bathrooms),
        size: String(existing.size),
        floor: existing.floor ?? '',
        totalFloors: existing.totalFloors ?? '',
        furnishing: existing.furnishing,
        parking: existing.parking ?? '',
        amenities: existing.amenities.join(', '),
        description: existing.description,
        securityDeposit: String(existing.securityDeposit),
        maintenance: String(existing.maintenance),
        otherCharges: String(existing.otherCharges ?? ''),
        available: existing.available,
        availableFrom: existing.availableFrom,
        images: existing.gallery?.length
          ? [...existing.gallery]
          : existing.imageUrl
            ? [existing.imageUrl]
            : [],
        status: existing.status ?? 'active',
        commute: existing.commute,
        latitude: existing.latitude,
        longitude: existing.longitude,
      }
    }
    return emptyForm
  })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [imageUrlDraft, setImageUrlDraft] = useState('')
  const [step, setStep] = useState<FormStep>('details')
  const [rentalPrefs, setRentalPrefs] = useState<RentalPreferences>(() =>
    existing?.rentalPreferences
      ? { ...emptyRentalPreferences, ...existing.rentalPreferences }
      : { ...emptyRentalPreferences },
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const needsPreferences = form.listingFor !== 'sale'

  const steps = useMemo(() => {
    const list: { key: FormStep; label: string }[] = [
      { key: 'details', label: 'Property details' },
    ]
    if (needsPreferences) {
      list.push({ key: 'preferences', label: 'Rental details' })
    }
    list.push({ key: 'review', label: 'Review & submit' })
    return list
  }, [needsPreferences])

  const ownerName = user?.name ?? ''

  const isForbidden = useMemo(() => {
    if (!isAuthenticated || !user) return false
    if (role !== 'owner') return true
    if (isEdit && existing && existing.ownerId !== user.id) return true
    return false
  }, [isAuthenticated, user, role, isEdit, existing])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    setUploadError('')
    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of files) {
        uploaded.push(await fileToDataUrl(file))
      }
      setForm((current) => ({ ...current, images: [...current.images, ...uploaded] }))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not read image.')
    } finally {
      setUploading(false)
      if (event.target) event.target.value = ''
    }
  }

  const handleAddImageUrl = () => {
    const url = imageUrlDraft.trim()
    if (!url) return
    setUploadError('')
    setForm((current) => ({ ...current, images: [...current.images, url] }))
    setImageUrlDraft('')
  }

  const handleRemoveImage = (index: number) => {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, i) => i !== index),
    }))
  }

  const photoCount = form.images.length
  const photoCounterLabel =
    photoCount < MIN_PROPERTY_PHOTOS
      ? `${photoCount} / ${MIN_PROPERTY_PHOTOS} photos`
      : photoCount === MIN_PROPERTY_PHOTOS
        ? `${MIN_PROPERTY_PHOTOS} photos uploaded`
        : `${photoCount} photos uploaded`

  const validatePhotos = (): string => {
    if (photoCount < MIN_PROPERTY_PHOTOS) return PHOTO_VALIDATION_MESSAGE
    return ''
  }

  const validate = (): string => {
    if (form.title.trim().length < 4) return 'Enter a descriptive property title.'
    if (!form.description.trim()) return 'Enter a property description.'
    if (!form.location.trim()) return 'Enter the area / location.'
    if (!form.address.trim()) return 'Enter the full address.'
    if (!form.city.trim()) return 'Enter the city.'
    const price = Number(form.price)
    if (!Number.isFinite(price) || price <= 0) return 'Monthly rent must be a positive amount.'
    const sellingRaw = form.sellingPrice.trim()
    if (sellingRaw) {
      const selling = Number(sellingRaw)
      if (!Number.isFinite(selling) || selling <= 0) {
        return 'Selling price must be a positive INR amount, or left empty if not for sale.'
      }
    }
    if (form.listingFor !== 'rent' && !sellingRaw) {
      return 'Enter a selling price for a property listed For Sale or For Rent & Sale.'
    }
    const size = Number(form.size)
    if (!Number.isFinite(size) || size <= 0) return 'Enter the carpet area in sqft.'
    const deposit = Number(form.securityDeposit || '0')
    if (!Number.isFinite(deposit) || deposit < 0) return 'Security deposit must be zero or more.'
    const maint = Number(form.maintenance || '0')
    if (!Number.isFinite(maint) || maint < 0) return 'Maintenance must be zero or more.'
    if (!form.availableFrom) return 'Choose an available-from date.'
    return ''
  }

  const resolveRentalPreferences = (): RentalPreferences | undefined => {
    if (needsPreferences) {
      return isRentalPreferencesComplete(rentalPrefs) ? rentalPrefs : undefined
    }
    return existing?.rentalPreferences
  }

  const buildInput = () => {
    const amenities = form.amenities
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    const sellingRaw = form.sellingPrice.trim()
    const selling = sellingRaw ? Number(sellingRaw) : undefined
    return {
      title: form.title.trim(),
      type: form.type,
      price: Number(form.price),
      sellingPrice:
        selling !== undefined && Number.isFinite(selling) && selling > 0
          ? selling
          : undefined,
      listingFor: form.listingFor,
      location: form.location.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim() || 'Gujarat',
      pincode: form.pincode.trim() || undefined,
      bedrooms: Number(form.bedrooms) || 0,
      bathrooms: Number(form.bathrooms) || 0,
      size: Number(form.size),
      floor: form.floor.trim() || undefined,
      totalFloors: form.totalFloors.trim() || undefined,
      furnishing: form.furnishing,
      parking: form.parking.trim() || undefined,
      amenities,
      description: form.description.trim(),
      securityDeposit: Number(form.securityDeposit || '0'),
      maintenance: Number(form.maintenance || '0'),
      otherCharges: form.otherCharges ? Number(form.otherCharges) : undefined,
      available: form.available,
      availableFrom: form.availableFrom,
      imageUrl: form.images[0] || PLACEHOLDER_IMAGE_URL,
      gallery: [...form.images],
      status: form.status,
      commute: form.commute || '20 min',
      latitude:
        typeof form.latitude === 'number' && Number.isFinite(form.latitude)
          ? form.latitude
          : undefined,
      longitude:
        typeof form.longitude === 'number' && Number.isFinite(form.longitude)
          ? form.longitude
          : undefined,
      rentalPreferences: resolveRentalPreferences(),
    }
  }

  const buildApiPayload = (statusOverride?: 'draft' | 'active') => {
    const input = buildInput()
    return {
      ...input,
      status: statusOverride ?? input.status,
      images: [...form.images],
    }
  }

  const handleDetailsContinue = () => {
    const message = validate()
    if (message) {
      setError(message)
      return
    }
    const photoMessage = validatePhotos()
    if (photoMessage) {
      setError(photoMessage)
      return
    }
    setError('')
    setStep(needsPreferences ? 'preferences' : 'review')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (step === 'details') {
      handleDetailsContinue()
      return
    }
    if (step !== 'review') return
    if (!user || role !== 'owner') return
    if (submitting) return
    if (isEdit) {
      if (!existing || existing.ownerId !== user.id) {
        setError('You can only edit your own listings.')
        return
      }
    }
    const message = validate()
    if (message) {
      setError(message)
      setStep('details')
      return
    }
    const photoMessage = validatePhotos()
    if (photoMessage) {
      setError(photoMessage)
      setStep('details')
      return
    }
    if (needsPreferences && !isRentalPreferencesComplete(rentalPrefs)) {
      setError('Answer all rental preference questions before submitting.')
      setStep('preferences')
      return
    }

    const token = readAuthToken()
    if (!token) {
      setError('Please sign in again before saving this listing.')
      return
    }

    const payload = buildApiPayload()
    setError('')
    setSubmitting(true)
    try {
      const path = isEdit && id ? `/api/properties/${id}` : '/api/properties'
      const method = isEdit ? 'PATCH' : 'POST'
      const result = await apiRequest<{
        message?: string
        property: ApiPropertyPayload
      }>(method, path, payload, token)

      if (!result.ok || !result.data?.property) {
        setError(extractErrorMessage(result, 'Could not save the property.'))
        return
      }

      const saved = mapApiProperty(result.data.property, {
        imageUrl: payload.imageUrl,
        gallery: payload.gallery,
        commute: payload.commute,
        rentalPreferences: payload.rentalPreferences,
      })
      insertProperty(saved)

      if (isEdit) {
        setNotice('Property updated.')
        window.setTimeout(() => navigate('/owner/properties'), 500)
      } else {
        setNotice('Property created.')
        window.setTimeout(() => navigate(`/properties/${saved.id}`), 500)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!user || role !== 'owner') return
    if (submitting) return
    if (isEdit) {
      if (!existing || existing.ownerId !== user.id) {
        setError('You can only edit your own listings.')
        return
      }
    }
    const message = validate()
    if (message) {
      setError(message)
      if (step !== 'details') setStep('details')
      return
    }

    const token = readAuthToken()
    if (!token) {
      setError('Please sign in again before saving this listing.')
      return
    }

    const payload = buildApiPayload('draft')
    setError('')
    setSubmitting(true)
    try {
      const path = isEdit && id ? `/api/properties/${id}` : '/api/properties'
      const method = isEdit ? 'PATCH' : 'POST'
      const result = await apiRequest<{
        message?: string
        property: ApiPropertyPayload
      }>(method, path, payload, token)

      if (!result.ok || !result.data?.property) {
        setError(extractErrorMessage(result, 'Could not save the draft.'))
        return
      }

      const saved = mapApiProperty(result.data.property, {
        imageUrl: payload.imageUrl,
        gallery: payload.gallery,
        commute: payload.commute,
        rentalPreferences: payload.rentalPreferences,
      })
      insertProperty(saved)

      setNotice('Saved as draft.')
      window.setTimeout(() => navigate('/owner/properties'), 500)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-12 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-rentify-navy">
            Sign in as a property owner
          </h1>
          <p className="mt-2 text-rentify-grayMuted">
            Listing a property requires an owner account.
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

  if (isForbidden || (isEdit && !existing)) {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-12 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-rentify-navy">
            {isEdit && !existing ? 'Property not found' : 'Owner access required'}
          </h1>
          <p className="mt-2 text-rentify-grayMuted">
            {isEdit && !existing
              ? 'This listing may have been removed.'
              : 'Only the listing owner can add or edit properties. Sign in with the owning account to continue.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate('/owner/properties')}>My properties</Button>
            <Button variant="secondary" onClick={() => navigate('/auth')}>
              Switch account
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header showBack onBack={() => navigate('/owner/properties')} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
              {isEdit ? 'Edit Property' : 'Add Property'}
            </h1>
            <p className="mt-2 text-rentify-grayMuted">
              {ownerName} · Vadodara listings · all amounts in ₹ (INR)
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={form.status === 'draft' ? 'default' : 'success'}>
              {form.status === 'draft' ? 'Draft' : 'Active'}
            </Badge>
            <Badge variant="default">Owner</Badge>
          </div>
        </div>

        <nav aria-label="Property form steps" className="mt-6">
          <ol className="flex flex-wrap items-center gap-2">
            {steps.map((item, index) => {
              const currentIndex = steps.findIndex((s) => s.key === step)
              const state =
                index < currentIndex
                  ? 'done'
                  : index === currentIndex
                    ? 'current'
                    : 'upcoming'
              return (
                <li
                  key={item.key}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-colors ${
                    state === 'current'
                      ? 'bg-rentify-deepNavy text-white'
                      : state === 'done'
                        ? 'bg-rentify-purpleLight2 text-rentify-deepNavy'
                        : 'border border-rentify-grayLight bg-white text-rentify-grayMuted'
                  }`}
                >
                  {index + 1}. {item.label}
                </li>
              )
            })}
          </ol>
          <div className="mt-3">
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-rentify-grayLight"
              role="progressbar"
              aria-valuenow={
                Math.round(
                  ((steps.findIndex((s) => s.key === step) + 1) /
                    steps.length) *
                    100,
                ) || 0
              }
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Property form progress"
            >
              <div
                className="h-full rounded-full bg-rentify-deepNavy transition-all duration-300"
                style={{
                  width: `${(
                    ((steps.findIndex((s) => s.key === step) + 1) /
                      steps.length) *
                    100
                  ).toFixed(0)}%`,
                }}
              />
            </div>
          </div>
        </nav>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
          {step === 'details' && (
            <>
          <section className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-semibold text-rentify-navy">
              Listing basics
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="pf-title" label="Property title">
                  <Input
                    id="pf-title"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder="Spacious 2 BHK near Laxmi Vilas Palace"
                  />
                </Field>
              </div>
              <Field id="pf-type" label="Property type">
                <select
                  id="pf-type"
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  className={selectClass}
                >
                  <option value="Apartment">Apartment</option>
                  <option value="Independent House">Independent House</option>
                  <option value="Villa">Villa</option>
                  <option value="Studio">Studio</option>
                  <option value="Penthouse">Penthouse</option>
                </select>
              </Field>
              <Field id="pf-furnishing" label="Furnishing">
                <select
                  id="pf-furnishing"
                  value={form.furnishing}
                  onChange={(e) => set('furnishing', e.target.value)}
                  className={selectClass}
                >
                  <option value="Fully Furnished">Fully Furnished</option>
                  <option value="Semi-Furnished">Semi-Furnished</option>
                  <option value="Unfurnished">Unfurnished</option>
                </select>
              </Field>
              <Field
                id="pf-price"
                label="Monthly rent (₹) — for rental"
                hint="Required. Used for tenant search and rent agreements."
              >
                <Input
                  id="pf-price"
                  type="number"
                  min={0}
                  step={500}
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="22000"
                />
              </Field>
              <Field
                id="pf-selling-price"
                label="Selling price (₹) — for sale"
                hint="Optional. Leave empty if the property is not for sale. Positive INR amount."
              >
                <Input
                  id="pf-selling-price"
                  type="number"
                  min={0}
                  step={100000}
                  value={form.sellingPrice}
                  onChange={(e) => set('sellingPrice', e.target.value)}
                  placeholder="6500000"
                />
              </Field>
              <Field
                id="pf-listing-for"
                label="Listing offers"
                hint="Choose whether this home is for rent, for sale, or both."
              >
                <select
                  id="pf-listing-for"
                  value={form.listingFor}
                  onChange={(e) =>
                    set('listingFor', e.target.value as ListingFor)
                  }
                  className={selectClass}
                >
                  <option value="rent">For Rent</option>
                  <option value="sale">For Sale</option>
                  <option value="both">For Rent &amp; Sale</option>
                </select>
              </Field>
              <Field id="pf-location" label="Area / location">
                <Input
                  id="pf-location"
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="Alkapuri"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field id="pf-address" label="Full address">
                  <Input
                    id="pf-address"
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="4th Floor, Suryam Residency, Alkapuri, Vadodara"
                  />
                </Field>
              </div>
              <Field id="pf-city" label="City">
                <Input
                  id="pf-city"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field id="pf-state" label="State">
                  <Input
                    id="pf-state"
                    value={form.state}
                    onChange={(e) => set('state', e.target.value)}
                  />
                </Field>
                <Field id="pf-pincode" label="Pincode">
                  <Input
                    id="pf-pincode"
                    value={form.pincode}
                    onChange={(e) => set('pincode', e.target.value)}
                    placeholder="390007"
                  />
                </Field>
              </div>
            </div>
          </section>

          <LocationMapPicker
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(latitude, longitude) => {
              setForm((current) => ({ ...current, latitude, longitude }))
            }}
          />

          <section className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-semibold text-rentify-navy">
              Layout &amp; charges
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field id="pf-bedrooms" label="Bedrooms">
                <Input
                  id="pf-bedrooms"
                  type="number"
                  min={0}
                  max={10}
                  value={form.bedrooms}
                  onChange={(e) => set('bedrooms', e.target.value)}
                />
              </Field>
              <Field id="pf-bathrooms" label="Bathrooms">
                <Input
                  id="pf-bathrooms"
                  type="number"
                  min={1}
                  max={10}
                  value={form.bathrooms}
                  onChange={(e) => set('bathrooms', e.target.value)}
                />
              </Field>
              <Field id="pf-size" label="Size (sqft)">
                <Input
                  id="pf-size"
                  type="number"
                  min={0}
                  value={form.size}
                  onChange={(e) => set('size', e.target.value)}
                  placeholder="950"
                />
              </Field>
              <Field id="pf-floor" label="Floor">
                <Input
                  id="pf-floor"
                  value={form.floor}
                  onChange={(e) => set('floor', e.target.value)}
                  placeholder="3"
                />
              </Field>
              <Field id="pf-total-floors" label="Total floors">
                <Input
                  id="pf-total-floors"
                  value={form.totalFloors}
                  onChange={(e) => set('totalFloors', e.target.value)}
                  placeholder="7"
                />
              </Field>
              <Field id="pf-parking" label="Parking">
                <Input
                  id="pf-parking"
                  value={form.parking}
                  onChange={(e) => set('parking', e.target.value)}
                  placeholder="1 car"
                />
              </Field>
              <Field id="pf-deposit" label="Security deposit (₹)">
                <Input
                  id="pf-deposit"
                  type="number"
                  min={0}
                  step={1000}
                  value={form.securityDeposit}
                  onChange={(e) => set('securityDeposit', e.target.value)}
                />
              </Field>
              <Field id="pf-maintenance" label="Maintenance (₹/mo)">
                <Input
                  id="pf-maintenance"
                  type="number"
                  min={0}
                  step={100}
                  value={form.maintenance}
                  onChange={(e) => set('maintenance', e.target.value)}
                />
              </Field>
              <Field id="pf-other" label="Other charges (₹, optional)">
                <Input
                  id="pf-other"
                  type="number"
                  min={0}
                  value={form.otherCharges}
                  onChange={(e) => set('otherCharges', e.target.value)}
                />
              </Field>
              <div className="col-span-2 sm:col-span-3">
                <Field
                  id="pf-amenities"
                  label="Amenities"
                  hint="Comma-separated — e.g. Lift, Gym, Clubhouse, Power Backup"
                >
                  <Input
                    id="pf-amenities"
                    value={form.amenities}
                    onChange={(e) => set('amenities', e.target.value)}
                    placeholder="Lift, Gym, Power Backup, Clubhouse"
                  />
                </Field>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <Field
                  id="pf-description"
                  label="Description"
                  hint="Required — describe the property, society and nearby landmarks."
                >
                  <textarea
                    id="pf-description"
                    rows={4}
                    required
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Describe the property, society and nearby landmarks…"
                    className="block w-full rounded-xl border border-rentify-borderDefault bg-white px-4 py-2.5 text-base text-rentify-navy shadow-sm transition-colors hover:border-rentify-lightNavy focus:border-rentify-navy focus:outline-none focus:ring-2 focus:ring-rentify-purpleLight"
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-semibold text-rentify-navy">
              Availability
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="pf-available-from" label="Available from">
                <Input
                  id="pf-available-from"
                  type="date"
                  value={form.availableFrom}
                  onChange={(e) => set('availableFrom', e.target.value)}
                />
              </Field>
              <Field id="pf-available" label="Open for bookings">
                <select
                  id="pf-available"
                  value={form.available ? 'yes' : 'no'}
                  onChange={(e) => set('available', e.target.value === 'yes')}
                  className={selectClass}
                >
                  <option value="yes">Yes — available now</option>
                  <option value="no">No — coming soon</option>
                </select>
              </Field>
              <Field id="pf-status" label="Listing status">
                <select
                  id="pf-status"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as 'draft' | 'active')}
                  className={selectClass}
                >
                  <option value="active">Active (visible in search)</option>
                  <option value="draft">Draft (owner only)</option>
                </select>
              </Field>
              <Field id="pf-commute" label="Commute to city centre">
                <Input
                  id="pf-commute"
                  value={form.commute}
                  onChange={(e) => set('commute', e.target.value)}
                  placeholder="20 min"
                />
              </Field>
            </div>
          </section>

          <section
            className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6"
            aria-labelledby="pf-photos-heading"
          >
            <h2
              id="pf-photos-heading"
              className="font-display text-lg font-semibold text-rentify-navy"
            >
              Property Photos
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              Upload at least 5 photos of your property.
            </p>
            <p
              className={`mt-2 text-sm font-semibold ${
                photoCount < MIN_PROPERTY_PHOTOS
                  ? 'text-red-500'
                  : 'text-rentify-successGreen'
              }`}
              aria-live="polite"
            >
              {photoCounterLabel}
            </p>
            <div className="mt-3 space-y-2">
              <input
                id="pf-image-file"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="block w-full rounded-xl border border-rentify-borderDefault bg-white px-3 py-2.5 text-sm text-rentify-navy file:mr-3 file:rounded-lg file:border-0 file:bg-rentify-purpleLight file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-rentify-navy hover:file:bg-rentify-purpleLight2"
              />
              {uploading && (
                <p className="text-xs text-rentify-grayMuted">Processing images…</p>
              )}
              {uploadError && (
                <p className="text-xs text-red-500" role="alert">
                  {uploadError}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="pf-image-url"
                  value={imageUrlDraft}
                  onChange={(e) => setImageUrlDraft(e.target.value)}
                  placeholder="https://… image URL"
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddImageUrl}
                  disabled={!imageUrlDraft.trim()}
                >
                  Add photo
                </Button>
              </div>
              {photoCount > 0 && (
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {form.images.map((src, index) => (
                    <li
                      key={`${src.slice(0, 64)}-${index}`}
                      className="overflow-hidden rounded-xl border border-rentify-grayLight bg-rentify-whiteOff"
                    >
                      <img
                        src={src}
                        alt={`Property photo ${index + 1}`}
                        className="h-28 w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                          Photo {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveImage(index)}
                          aria-label={`Remove photo ${index + 1}`}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
            </>
          )}

          {step === 'preferences' && needsPreferences && (
            <RentalPreferencesWizard
              value={rentalPrefs}
              onChange={setRentalPrefs}
              onBack={() => setStep('details')}
              onContinue={() => setStep('review')}
            />
          )}

          {step === 'review' && (
            <>
              <section className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-display text-lg font-semibold text-rentify-navy">
                  Review property
                </h2>
                <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                      Title
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                      {form.title}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                      Listing offers
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                      {form.listingFor === 'rent'
                        ? 'For Rent'
                        : form.listingFor === 'sale'
                          ? 'For Sale'
                          : 'For Rent & Sale'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                      Type &amp; furnishing
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                      {form.type} · {form.furnishing}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                      Layout
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                      {form.bedrooms} bed · {form.bathrooms} bath ·{' '}
                      {form.size} sqft
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                      Address
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                      {form.address}, {form.city}, {form.state}{' '}
                      {form.pincode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                      Monthly rent
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                      {formatCurrency(Number(form.price) || 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                      Selling price
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                      {form.sellingPrice
                        ? formatCurrency(Number(form.sellingPrice) || 0)
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                      Security deposit
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                      {formatCurrency(Number(form.securityDeposit) || 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                      Available from
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                      {form.availableFrom}
                    </dd>
                  </div>
                </dl>
              </section>

              {needsPreferences && (
                <section className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="font-display text-lg font-semibold text-rentify-navy">
                    Rental Preferences &amp; Property Rules
                  </h2>
                  <p className="mt-1 text-sm text-rentify-grayMuted">
                    Tell renters about the rental conditions for this property.
                  </p>
                  <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                        Preferred tenant
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                        {rentalPrefs.tenantType || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                        Pets
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                        {rentalPrefs.petPolicy || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                        Tenancy
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                        {rentalPrefs.tenancyDuration || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                        Occupancy
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-rentify-navy">
                        {rentalPrefs.occupancy || '—'}
                      </dd>
                    </div>
                  </dl>
                </section>
              )}
            </>
          )}

          {error && (
            <p className="text-sm font-medium text-red-500" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p
              className="rounded-xl bg-rentify-purpleLight3 px-3.5 py-2.5 text-sm font-medium text-rentify-navy"
              role="status"
            >
              {notice}
            </p>
          )}

          {step === 'details' && (
            <div className="flex flex-wrap justify-between gap-2 border-t border-rentify-grayLight pt-5">
              <Button variant="ghost" onClick={() => navigate('/owner/properties')}>
                Cancel
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                >
                  Save draft
                </Button>
                <Button onClick={handleDetailsContinue} disabled={submitting}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="flex flex-wrap justify-between gap-2 border-t border-rentify-grayLight pt-5">
              <Button
                variant="ghost"
                onClick={() => setStep(needsPreferences ? 'preferences' : 'details')}
              >
                Back
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                >
                  Save draft
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? 'Saving…'
                    : isEdit
                      ? 'Save changes'
                      : 'Publish listing'}
                  {!submitting && form.price
                    ? ` · ${formatCurrency(Number(form.price) || 0)}/mo`
                    : ''}
                </Button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}

export default PropertyFormPage
