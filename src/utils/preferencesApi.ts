import { apiRequest, extractErrorMessage, type ApiResult } from './api'
import type { BuyerPreferences, RenterPreferences } from '../types'

export function readToken(): string | null {
  try {
    return window.localStorage.getItem('rentify:token')
  } catch {
    return null
  }
}

export interface PreferencesBundle {
  renter: RenterPreferences | null
  buyer: BuyerPreferences | null
}

interface PreferencesResponse {
  preferences?: RenterPreferences | null
  renter?: RenterPreferences | null
  buyer?: BuyerPreferences | null
}

function isValidRenter(value: unknown): value is RenterPreferences {
  if (!value || typeof value !== 'object') return false
  const entry = value as RenterPreferences
  return (
    typeof entry.budget === 'string' &&
    typeof entry.propertyType === 'string' &&
    typeof entry.occupants === 'string' &&
    typeof entry.pets === 'string' &&
    typeof entry.furnishing === 'string'
  )
}

function isValidBuyer(value: unknown): value is BuyerPreferences {
  if (!value || typeof value !== 'object') return false
  const entry = value as BuyerPreferences
  return (
    typeof entry.budget === 'string' &&
    typeof entry.propertyType === 'string' &&
    typeof entry.purpose === 'string' &&
    typeof entry.furnishing === 'string' &&
    typeof entry.priority === 'string'
  )
}

export async function fetchPreferencesBundle(
  token: string | null,
): Promise<{ ok: true; data: PreferencesBundle } | { ok: false; error: string }> {
  if (!token) {
    return { ok: false, error: 'Missing session token. Sign in again.' }
  }
  const result = await apiRequest<PreferencesBundle>(
    'GET',
    '/api/preferences',
    undefined,
    token,
  )
  if (!result.ok || !result.data) {
    return {
      ok: false,
      error: extractErrorMessage(result, 'Could not load preferences.'),
    }
  }
  return {
    ok: true,
    data: {
      renter: isValidRenter(result.data.renter) ? result.data.renter : null,
      buyer: isValidBuyer(result.data.buyer) ? result.data.buyer : null,
    },
  }
}

export async function fetchRenterPreferences(
  token: string | null,
): Promise<{ ok: true; data: RenterPreferences | null } | { ok: false; error: string }> {
  if (!token) {
    return { ok: false, error: 'Missing session token. Sign in again.' }
  }
  const result = await apiRequest<PreferencesResponse>(
    'GET',
    '/api/preferences/renter',
    undefined,
    token,
  )
  if (!result.ok || !result.data) {
    return {
      ok: false,
      error: extractErrorMessage(result, 'Could not load preferences.'),
    }
  }
  return {
    ok: true,
    data: isValidRenter(result.data.preferences)
      ? result.data.preferences
      : null,
  }
}

export async function fetchBuyerPreferences(
  token: string | null,
): Promise<{ ok: true; data: BuyerPreferences | null } | { ok: false; error: string }> {
  if (!token) {
    return { ok: false, error: 'Missing session token. Sign in again.' }
  }
  const result = await apiRequest<PreferencesResponse>(
    'GET',
    '/api/preferences/buyer',
    undefined,
    token,
  )
  if (!result.ok || !result.data) {
    return {
      ok: false,
      error: extractErrorMessage(result, 'Could not load preferences.'),
    }
  }
  return {
    ok: true,
    data: isValidBuyer(result.data.preferences)
      ? result.data.preferences
      : null,
  }
}

export async function saveRenterPreferences(
  token: string | null,
  preferences: RenterPreferences,
): Promise<{ ok: true; data: RenterPreferences } | { ok: false; error: string }> {
  if (!token) {
    return { ok: false, error: 'Missing session token. Sign in again.' }
  }
  const result = await apiRequest<PreferencesResponse>(
    'PUT',
    '/api/preferences/renter',
    preferences,
    token,
  )
  if (!result.ok || !result.data?.preferences) {
    return {
      ok: false,
      error: extractErrorMessage(result, 'Could not save preferences.'),
    }
  }
  const saved = result.data.preferences
  if (!isValidRenter(saved)) {
    return { ok: false, error: 'Server returned invalid renter preferences.' }
  }
  return { ok: true, data: saved }
}

export async function saveBuyerPreferences(
  token: string | null,
  preferences: BuyerPreferences,
): Promise<{ ok: true; data: BuyerPreferences } | { ok: false; error: string }> {
  if (!token) {
    return { ok: false, error: 'Missing session token. Sign in again.' }
  }
  const result = await apiRequest<PreferencesResponse>(
    'PUT',
    '/api/preferences/buyer',
    preferences,
    token,
  )
  if (!result.ok || !result.data?.preferences) {
    return {
      ok: false,
      error: extractErrorMessage(result, 'Could not save preferences.'),
    }
  }
  const saved = result.data.preferences
  if (!isValidBuyer(saved)) {
    return { ok: false, error: 'Server returned invalid buyer preferences.' }
  }
  return { ok: true, data: saved }
}

export type { ApiResult }
