export type Role = 'tenant' | 'buyer' | 'owner' | 'admin'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  password?: string
  phone?: string
  preferredLocation?: string
  budget?: number
  preferredBedrooms?: number
  createdAt?: string
}

export interface Owner {
  id: string
  name: string
  email: string
  role: 'Property Owner'
  phone?: string
}

export type RiskLevel = 'low' | 'medium' | 'high'

export type PropertyStatus = 'draft' | 'active'

export type ListingFor = 'rent' | 'sale' | 'both'

export interface Property {
  id: string
  title: string
  type: string
  price: number
  sellingPrice?: number
  listingFor?: ListingFor
  location: string
  address: string
  city: string
  state?: string
  pincode?: string
  bedrooms: number
  bathrooms: number
  size: number
  commute: string
  matchScore: number
  healthScore: number
  riskLevel: RiskLevel
  amenities: string[]
  imageUrl: string
  gallery?: string[]
  description: string
  ownerId: string
  ownerName?: string
  securityDeposit: number
  maintenance: number
  otherCharges?: number
  available: boolean
  availableFrom: string
  views: number
  interestedTenants: string[]
  furnishing: string
  status?: PropertyStatus
  floor?: string
  totalFloors?: string
  parking?: string
  latitude?: number
  longitude?: number
  rentalPreferences?: RentalPreferences
}

export type BookingStatus =
  | 'Requested'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected'

export interface Booking {
  id: string
  propertyId: string
  tenantId: string
  tenantName: string
  ownerId: string
  ownerName: string
  date: string
  time: string
  status: BookingStatus
  note?: string
  createdAt: string
}

export type AgreementStatus =
  | 'Draft'
  | 'Pending'
  | 'Awaiting Signatures'
  | 'Information Required'
  | 'Documents Required'
  | 'Awaiting Tenant Signature'
  | 'Awaiting Owner Signature'
  | 'Ready for Lawyer Review'
  | 'Sent to Lawyer'
  | 'Under Legal Review'
  | 'Awaiting Final Agreement'
  | 'Final Agreement Uploaded'
  | 'Active'
  | 'Completed'
  | 'Rejected'

export type AgreementDocumentProvider = 'TENANT' | 'OWNER'
export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface AgreementDocument {
  id: string
  documentType: string
  providedBy: AgreementDocumentProvider
  fileName: string
  fileMimeType: string
  uploadedAt: string
  verificationStatus: DocumentVerificationStatus
  verifiedAt?: string | null
  verificationNotes?: string
}

export interface AgreementWorkflowState {
  tenantInfoComplete: boolean
  ownerInfoComplete: boolean
  infoComplete: boolean
  tenantDocsComplete: boolean
  ownerDocsComplete: boolean
  docsComplete: boolean
  tenantSigned: boolean
  ownerSigned: boolean
  signaturesComplete: boolean
  readyForLawyer: boolean
  canAdvanceToDocuments: boolean
  canAdvanceToSigning: boolean
}

export interface Agreement {
  id: string
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
  status: AgreementStatus
  createdAt: string
  ownerPhoto?: string
  ownerSignature?: string
  ownerSignedAt?: string
  tenantPhoto?: string
  tenantSignature?: string
  tenantSignedAt?: string
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

export interface ChatMessage {
  id: string
  from: 'owner' | 'ai' | 'you'
  text: string
  sentAt: string
}

export interface ChatThreadMeta {
  propertyId?: string
  ownerId?: string
  userId?: string
}

export interface ChatState {
  threads: Record<string, ChatMessage[]>
  meta: Record<string, ChatThreadMeta>
}

export interface RenterPreferences {
  budget: string
  propertyType: string
  occupants: string
  pets: string
  furnishing: string
}

export interface BuyerPreferences {
  budget: string
  propertyType: string
  purpose: string
  furnishing: string
  priority: string
}

export interface RentalPreferences {
  tenantType: string
  petPolicy: string
  tenancyDuration: string
  occupancy: string
}

export interface ApiPropertyImage {
  id: string
  imageUrl: string
  displayOrder: number
}

export interface ApiPropertyOwner {
  id: string
  name: string
}

export interface ApiPropertyDetailResponse {
  property: ApiPropertyPayload
}

export interface ApiPropertyPayload {
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
  status?: PropertyStatus | null
  floor?: string | null
  totalFloors?: string | null
  parking?: string | null
  latitude?: number | null
  longitude?: number | null
  ownerId: string
  owner?: ApiPropertyOwner
  images?: ApiPropertyImage[]
}

export interface ApiPropertyListResponse {
  properties: ApiPropertyPayload[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
