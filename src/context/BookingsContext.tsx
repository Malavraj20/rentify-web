import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Booking, BookingStatus } from '../types'
import { apiRequest, extractErrorMessage } from '../utils/api'
import { readJson, writeJson } from '../utils/storage'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'rentify:bookings'
const TOKEN_STORAGE_KEY = 'rentify:token'

export interface CreateBookingInput {
  propertyId: string
  tenantId?: string
  tenantName?: string
  ownerId?: string
  ownerName?: string
  date: string
  time: string
  note?: string
}

interface BookingsContextValue {
  bookings: Booking[]
  addBooking: (input: CreateBookingInput) => Promise<Booking>
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<void>
  cancelBooking: (id: string) => Promise<void>
}

const BookingsContext = createContext<BookingsContextValue | null>(null)

function readAuthToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function readBookings(): Booking[] {
  const stored = readJson<Booking[] | null>(STORAGE_KEY, null)
  if (Array.isArray(stored)) return stored
  return []
}

const statusToApi: Record<BookingStatus, string> = {
  Requested: 'PENDING',
  Confirmed: 'APPROVED',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
  Rejected: 'REJECTED',
}

const statusFromApi: Record<string, BookingStatus> = {
  PENDING: 'Requested',
  APPROVED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
}

interface ApiBookingPayload {
  id: string
  date: string
  time: string
  note?: string | null
  status: string
  createdAt: string
  tenant?: { id: string; name: string }
  tenantId?: string
  tenantName?: string
  property?: {
    id: string
    owner?: { id: string; name: string }
  }
  propertyId?: string
  ownerId?: string
  ownerName?: string
}

function mapApiBooking(api: ApiBookingPayload): Booking {
  return {
    id: api.id,
    propertyId: api.property?.id ?? api.propertyId ?? '',
    tenantId: api.tenant?.id ?? api.tenantId ?? '',
    tenantName: api.tenant?.name ?? api.tenantName ?? '',
    ownerId: api.property?.owner?.id ?? api.ownerId ?? '',
    ownerName: api.property?.owner?.name ?? api.ownerName ?? '',
    date: api.date.slice(0, 10),
    time: api.time,
    status: statusFromApi[api.status] ?? 'Requested',
    note: api.note ?? undefined,
    createdAt: api.createdAt.slice(0, 10),
  }
}

async function fetchApiBookings(token: string): Promise<Booking[] | null> {
  const result = await apiRequest<{ bookings: ApiBookingPayload[] }>(
    'GET',
    '/api/bookings',
    undefined,
    token,
  )
  if (!result.ok || !result.data) return null
  return result.data.bookings.map(mapApiBooking)
}

const BookingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth()
  const userId = user?.id ?? null
  const [bookings, setBookings] = useState<Booking[]>(readBookings)

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!isAuthenticated || !userId) {
        setBookings(readBookings())
        return
      }
      const token = readAuthToken()
      if (!token) {
        setBookings(readBookings())
        return
      }
      const apiBookings = await fetchApiBookings(token)
      if (cancelled) return
      if (apiBookings === null) return
      setBookings(apiBookings)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, userId])

  useEffect(() => {
    if (!isAuthenticated) {
      writeJson(STORAGE_KEY, bookings)
    }
  }, [isAuthenticated, bookings])

  const addBooking = useCallback(
    async (input: CreateBookingInput): Promise<Booking> => {
      const token = readAuthToken()
      if (!token || !isAuthenticated) {
        throw new Error('Please sign in to request a viewing.')
      }

      const result = await apiRequest<{ booking: ApiBookingPayload }>(
        'POST',
        '/api/bookings',
        {
          propertyId: input.propertyId,
          date: input.date,
          time: input.time,
          note: input.note,
        },
        token,
      )
      if (!result.ok || !result.data?.booking) {
        throw new Error(
          extractErrorMessage(result, 'Could not create booking request.'),
        )
      }
      const booking = mapApiBooking(result.data.booking)
      setBookings((current) => [booking, ...current])
      return booking
    },
    [isAuthenticated],
  )

  const updateBookingStatus = useCallback(
    async (id: string, status: BookingStatus): Promise<void> => {
      const token = readAuthToken()
      if (!token) {
        throw new Error('Please sign in again.')
      }
      const apiStatus = statusToApi[status]
      const result = await apiRequest<{ booking: ApiBookingPayload }>(
        'PATCH',
        `/api/bookings/${id}/status`,
        { status: apiStatus },
        token,
      )
      if (!result.ok || !result.data?.booking) {
        throw new Error(
          extractErrorMessage(result, 'Could not update booking status.'),
        )
      }
      const updated = mapApiBooking(result.data.booking)
      setBookings((current) =>
        current.map((booking) => (booking.id === id ? updated : booking)),
      )
    },
    [],
  )

  const cancelBooking = useCallback(
    async (id: string): Promise<void> => {
      await updateBookingStatus(id, 'Cancelled')
    },
    [updateBookingStatus],
  )

  const value = useMemo(
    () => ({ bookings, addBooking, updateBookingStatus, cancelBooking }),
    [bookings, addBooking, updateBookingStatus, cancelBooking],
  )

  return (
    <BookingsContext.Provider value={value}>
      {children}
    </BookingsContext.Provider>
  )
}

function useBookings(): BookingsContextValue {
  const context = useContext(BookingsContext)
  if (!context) {
    throw new Error('useBookings must be used within a BookingsProvider')
  }
  return context
}

export { BookingsProvider, useBookings }
export type { BookingsContextValue }
