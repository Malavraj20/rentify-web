import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { StatCard } from '../../components/ui/StatCard'
import { useAgreements } from '../../context/AgreementsContext'
import { useProperties } from '../../context/PropertiesContext'
import { apiRequest, extractErrorMessage, type ApiResult } from '../../utils/api'
import { formatCurrency } from '../../utils/currency'
import {
  agreementStatusVariant,
  isAgreementActive,
  isAgreementInProgress,
} from '../../utils/agreementStatus'
import type { Agreement, AuthUser, Role } from '../../types'

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const roleBadge: Record<string, 'default' | 'success' | 'caution'> = {
  tenant: 'default',
  buyer: 'default',
  owner: 'success',
  admin: 'caution',
}

function readToken(): string | null {
  try {
    return window.localStorage.getItem('rentify:token')
  } catch {
    return null
  }
}

interface ApiUserRow {
  id: string
  name: string
  email: string
  role: string
  phone?: string | null
  preferredLocation?: string | null
  budget?: number | null
  preferredBedrooms?: number | null
  createdAt?: string
}

interface AdminUsersPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface AdminUsersResponse {
  users: ApiUserRow[]
  pagination: AdminUsersPagination
}

function mapApiUser(row: ApiUserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role.toLowerCase() as Role,
    phone: row.phone ?? undefined,
    preferredLocation: row.preferredLocation ?? undefined,
    budget: row.budget ?? undefined,
    preferredBedrooms: row.preferredBedrooms ?? undefined,
    createdAt: row.createdAt ? row.createdAt.slice(0, 10) : undefined,
  }
}

function usersLoadErrorMessage(result: ApiResult<unknown>): string {
  if (result.status === 401) {
    return 'Your session has expired. Sign in again.'
  }
  if (result.status === 403) {
    return 'Admin access is required to view platform users.'
  }
  return extractErrorMessage(result, 'Could not load users from the server.')
}

const DASHBOARD_USERS_LIMIT = 100

const AdminDashboard = ({ user }: { user: AuthUser }) => {
  const navigate = useNavigate()
  const { agreements } = useAgreements()
  const { properties, getPropertyById } = useProperties()
  const [allUsers, setAllUsers] = useState<AuthUser[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [usersNote, setUsersNote] = useState<string | null>(null)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersRetryKey, setUsersRetryKey] = useState(0)

  useEffect(() => {
    const token = readToken()
    if (!token) {
      setUsersNote('Sign in again to load platform users.')
      return
    }
    let cancelled = false
    setUsersLoading(true)
    const query = new URLSearchParams({
      page: '1',
      limit: String(DASHBOARD_USERS_LIMIT),
    }).toString()
    void (async () => {
      const result = await apiRequest<AdminUsersResponse>(
        'GET',
        `/api/admin/users?${query}`,
        undefined,
        token,
      )
      if (cancelled) return
      setUsersLoading(false)
      if (!result.ok || !result.data?.users) {
        setAllUsers([])
        setTotalUsers(0)
        setUsersNote(usersLoadErrorMessage(result))
        return
      }
      setUsersNote(null)
      setAllUsers(result.data.users.map(mapApiUser))
      setTotalUsers(result.data.pagination?.total ?? result.data.users.length)
    })()
    return () => {
      cancelled = true
    }
  }, [usersRetryKey])

  const tenants = useMemo(
    () => allUsers.filter((u) => u.role === 'tenant'),
    [allUsers],
  )
  const buyers = useMemo(
    () => allUsers.filter((u) => u.role === 'buyer'),
    [allUsers],
  )
  const owners = useMemo(
    () => allUsers.filter((u) => u.role === 'owner'),
    [allUsers],
  )
  const admins = useMemo(
    () => allUsers.filter((u) => u.role === 'admin'),
    [allUsers],
  )
  const activeAgreements = agreements.filter((a) => isAgreementActive(a.status))
  const pendingAgreements = agreements.filter((a) =>
    isAgreementInProgress(a.status),
  )

  const recentUsers = [...allUsers]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 6)

  const recentAgreements = [...agreements]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  const recentProperties = [...properties]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

  return (
    <div className="space-y-10">
      <section
        aria-labelledby="admin-profile"
        className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-rentify-navy text-lg font-bold text-white"
            aria-hidden
          >
            {user.name
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="admin-profile"
              className="font-display text-xl font-bold text-rentify-navy"
            >
              {user.name}
            </h2>
            <p className="text-sm text-rentify-grayMuted">{user.email}</p>
          </div>
          <Badge variant="caution" size="lg">
            Admin
          </Badge>
        </div>
      </section>

      <section aria-labelledby="admin-totals">
        <h2
          id="admin-totals"
          className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
        >
          Platform Overview
        </h2>
        <p className="mt-1 text-sm text-rentify-grayMuted" aria-live="polite">
          {usersLoading
            ? 'Loading users from database…'
            : (usersNote ?? 'Live data from PostgreSQL via /api/admin/users')}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard
            label="Total users"
            value={totalUsers || allUsers.length}
            hint="All roles"
          />
          <StatCard label="Tenants" value={tenants.length} hint="Registered renters" />
          <StatCard label="Buyers" value={buyers.length} hint="Purchase shortlisters" />
          <StatCard label="Owners" value={owners.length} hint="Property owners" />
          <StatCard label="Properties" value={properties.length} hint="Vadodara listings" />
          <StatCard
            label="Active agreements"
            value={activeAgreements.length}
            hint={`${pendingAgreements.length} pending`}
          />
        </div>
        <p className="mt-3 text-xs text-rentify-grayMuted">
          Admin accounts: {admins.length} · Buyers: {buyers.length}
          {usersNote ? (
            <button
              type="button"
              className="ml-2 underline hover:text-rentify-navy"
              onClick={() => setUsersRetryKey((key) => key + 1)}
            >
              Retry
            </button>
          ) : null}
        </p>
      </section>

      <section aria-labelledby="admin-users">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="admin-users"
              className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
            >
              Recent Users
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              Latest accounts from the database
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/users')}>
            View all users
          </Button>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-rentify-grayLight bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-rentify-grayLight bg-rentify-whiteOff text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                  <th scope="col" className="px-4 py-3">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((account) => (
                  <tr
                    key={account.id}
                    className="border-b border-rentify-grayLight last:border-0 hover:bg-rentify-purpleLight3"
                  >
                    <td className="px-4 py-3 font-medium text-rentify-navy">
                      {account.name}
                    </td>
                    <td className="px-4 py-3 text-rentify-grayMuted">
                      {account.email}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={roleBadge[account.role] ?? 'default'}>
                        {account.role === 'owner'
                          ? 'Property Owner'
                          : account.role.charAt(0).toUpperCase() +
                            account.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-rentify-grayMuted">
                      {account.createdAt ? formatDate(account.createdAt) : '—'}
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-rentify-grayMuted"
                    >
                      No users returned from the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby="admin-properties">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="admin-properties"
              className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
            >
              Recent Properties
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              Most viewed Vadodara listings
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/properties')}>
            View all properties
          </Button>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-rentify-grayLight bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-rentify-grayLight bg-rentify-whiteOff text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                  <th scope="col" className="px-4 py-3">
                    Property
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Location
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Rent
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Views
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentProperties.map((property) => (
                  <tr
                    key={property.id}
                    className="border-b border-rentify-grayLight last:border-0 hover:bg-rentify-purpleLight3"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/properties/${property.id}`)}
                        className="font-medium text-rentify-navy transition-colors hover:text-rentify-lightNavy focus-visible:underline"
                      >
                        {property.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-rentify-grayMuted">
                      {property.location}
                    </td>
                    <td className="px-4 py-3 font-medium text-rentify-navy">
                      {formatCurrency(property.price)}
                    </td>
                    <td className="px-4 py-3 text-rentify-grayMuted">
                      {property.views.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          property.status === 'draft'
                            ? 'default'
                            : property.available
                              ? 'success'
                              : 'caution'
                        }
                      >
                        {property.status === 'draft'
                          ? 'Draft'
                          : property.available
                            ? 'Available'
                            : 'Coming soon'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby="admin-agreements">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="admin-agreements"
              className="font-display text-xl font-bold tracking-tight text-rentify-navy sm:text-2xl"
            >
              Recent Agreements
            </h2>
            <p className="mt-1 text-sm text-rentify-grayMuted">
              Latest rent agreements on the platform
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/agreements')}>
            View all agreements
          </Button>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-rentify-grayLight bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-rentify-grayLight bg-rentify-whiteOff text-xs font-semibold uppercase tracking-wider text-rentify-grayMuted">
                  <th scope="col" className="px-4 py-3">
                    Property
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Tenant
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Owner
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Rent
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentAgreements.length > 0 ? (
                  recentAgreements.map((agreement: Agreement) => (
                    <tr
                      key={agreement.id}
                      className="border-b border-rentify-grayLight last:border-0 hover:bg-rentify-purpleLight3"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/agreements/${agreement.id}`)}
                          className="font-medium text-rentify-navy transition-colors hover:text-rentify-lightNavy focus-visible:underline"
                        >
                          {getPropertyById(agreement.propertyId)?.title ??
                            'Property unavailable'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-rentify-grayMuted">
                        {agreement.tenantName}
                      </td>
                      <td className="px-4 py-3 text-rentify-grayMuted">
                        {agreement.ownerName}
                      </td>
                      <td className="px-4 py-3 font-medium text-rentify-navy">
                        {formatCurrency(agreement.monthlyRent)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={agreementStatusVariant(agreement.status)}>
                          {agreement.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-rentify-grayMuted"
                    >
                      No agreements yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
