import type { AgreementStatus } from '../types'

export type AgreementBadgeVariant =
  | 'default'
  | 'success'
  | 'caution'
  | 'destructive'

const AGREEMENT_STATUS_VARIANTS: Record<AgreementStatus, AgreementBadgeVariant> =
  {
    Draft: 'default',
    Pending: 'caution',
    'Awaiting Signatures': 'caution',
    'Information Required': 'caution',
    'Documents Required': 'caution',
    'Awaiting Tenant Signature': 'caution',
    'Awaiting Owner Signature': 'caution',
    'Ready for Lawyer Review': 'default',
    'Sent to Lawyer': 'default',
    'Under Legal Review': 'caution',
    'Awaiting Final Agreement': 'caution',
    'Final Agreement Uploaded': 'success',
    Active: 'success',
    Completed: 'success',
    Rejected: 'destructive',
  }

export function agreementStatusVariant(
  status: AgreementStatus | string | undefined,
): AgreementBadgeVariant {
  if (status && Object.prototype.hasOwnProperty.call(AGREEMENT_STATUS_VARIANTS, status)) {
    return AGREEMENT_STATUS_VARIANTS[status as AgreementStatus]
  }
  return 'default'
}

export function isAgreementActive(status: AgreementStatus | undefined): boolean {
  return status === 'Active'
}

export function isAgreementInProgress(
  status: AgreementStatus | undefined,
): boolean {
  return (
    status !== undefined &&
    status !== 'Draft' &&
    status !== 'Active' &&
    status !== 'Completed' &&
    status !== 'Rejected'
  )
}
