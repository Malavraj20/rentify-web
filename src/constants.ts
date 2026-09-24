export const MIN_PROPERTY_IMAGES = 5

export const AGREEMENT_DOCUMENT_TYPES = {
  GOVERNMENT_ID: 'government_id',
  ADDRESS_PROOF: 'address_proof',
  OWNERSHIP_PROOF: 'ownership_proof',
} as const

export type AgreementDocumentType =
  (typeof AGREEMENT_DOCUMENT_TYPES)[keyof typeof AGREEMENT_DOCUMENT_TYPES]

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  government_id: 'Government ID',
  address_proof: 'Address proof',
  ownership_proof: 'Property ownership proof',
}

export const DEFAULT_REQUIRED_TENANT_DOCUMENTS: AgreementDocumentType[] = [
  AGREEMENT_DOCUMENT_TYPES.GOVERNMENT_ID,
  AGREEMENT_DOCUMENT_TYPES.ADDRESS_PROOF,
]

export const DEFAULT_REQUIRED_OWNER_DOCUMENTS: AgreementDocumentType[] = [
  AGREEMENT_DOCUMENT_TYPES.GOVERNMENT_ID,
  AGREEMENT_DOCUMENT_TYPES.OWNERSHIP_PROOF,
]

export const MAX_DOCUMENT_FILE_BYTES = 8 * 1024 * 1024
