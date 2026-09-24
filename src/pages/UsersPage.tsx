import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { apiRequest, extractErrorMessage, type ApiResult } from '../utils/api'
import { formatCurrency } from '../utils/currency'
import type { AuthUser, Role } from '../types'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'TENANT', label: 'Tenant' },
  { value: 'BUYER', label: 'Buyer' },
  { value: 'OWNER', label: 'Property Owner' },
  { value: 'ADMIN', label: 'Admin' },
] as const

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const roleVariant: Record<Role, 'default' | 'success' | 'caution'> = {
  tenant: 'default',
  buyer: 'default',
  owner: 'success',
  admin: 'caution',
}

const roleDisplay: Record<Role, string> = {
  tenant: 'Tenant',
  buyer: 'Buyer',
  owner: 'Property Owner',
  admin: 'Admin',
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

function buildAdminUsersQuery(
  page: number,
  limit: number,
  search: string,
  role: string,
): string {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  const trimmedSearch = search.trim()
  if (trimmedSearch) params.set('search', trimmedSearch)
  if (role) params.set('role', role)
  return params.toString()
}

const selectClasses =
  'block w-full appearance-none rounded-xl border border-rentify-borderDefault bg-white px-4 py-2.5 pr-10 text-base text-rentify-navy shadow-sm transition-colors hover:border-rentify-lightNavy focus:border-rentify-navy focus:outline-none focus:ring-2 focus:ring-rentify-purpleLight disabled:cursor-not-allowed disabled:opacity-50'

const labelClasses = 'mb-1.5 block text-sm font-medium text-rentify-navy'

const UsersPage = () => {
  const navigate = useNavigate()
  const { user, role, isAuthenticated } = useAuth()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [pagination, setPagination] = useState<AdminUsersPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [roleFilter, setRoleFilter] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const canLoad = isAuthenticated && role === 'admin'

  useEffect(() => {
    if (!canLoad) {
      setUsers([])
      setLoadError(null)
      return
    }
    const token = readToken()
    if (!token) {
      setUsers([])
      setLoadError('Missing session token. Sign in again.')
      return
    }
    let cancelled = false
    setLoading(true)
    const query = buildAdminUsersQuery(page, limit, search, roleFilter)
    void (async () => {
      const result = await apiRequest<AdminUsersResponse>(
        'GET',
        `/api/admin/users?${query}`,
        undefined,
        token,
      )
      if (cancelled) return
      setLoading(false)
      if (!result.ok || !result.data?.users) {
        setUsers([])
        setLoadError(usersLoadErrorMessage(result))
        setPagination((prev) => ({ ...prev, page, limit }))
        return
      }
      setLoadError(null)
      setUsers(result.data.users.map(mapApiUser))
      setPagination(result.data.pagination)
    })()
    return () => {
      cancelled = true
    }
  }, [canLoad, page, limit, search, roleFilter, retryKey])

  const allUsers = useMemo(() => users, [users])
  const hasActiveFilters = Boolean(search.trim() || roleFilter)

  const tenants = useMemo(
    () => allUsers.filter((u) => u.role === 'tenant'),
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

  const applySearch = () => {
    const next = searchDraft.trim()
    setPage(1)
    setSearch(next)
  }

  const clearFilters = () => {
    setSearchDraft('')
    setSearch('')
    setRoleFilter('')
    setPage(1)
  }

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value)
    setPage(1)
  }

  const handleLimitChange = (value: string) => {
    setLimit(Number(value) || 20)
    setPage(1)
  }

  const goToPrevPage = () => {
    setPage((current) => Math.max(1, current - 1))
  }

  const goToNextPage = () => {
    setPage((current) => Math.min(pagination.totalPages, current + 1))
  }

  if (!canLoad) {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-12 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-rentify-navy sm:text-3xl">
            Admins only
          </h1>
          <p className="mt-2 text-rentify-grayMuted">
            {isAuthenticated && user
              ? 'Your account does not have admin access.'
              : 'Sign in with an administrator account to view platform users.'}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
              Go to dashboard
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
              Users
            </h1>
            <p className="mt-2 text-rentify-grayMuted" aria-live="polite">
              {loading
                ? 'Loading users from database…'
                : loadError
                  ? loadError
                  : `${pagination.total} total · showing ${allUsers.length} on this page · ${tenants.length} tenants · ${owners.length} owners · ${admins.length} admins`}
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </Button>
        </div>

        <div className="mt-6 rounded-2xl border border-rentify-grayLight bg-white p-4 shadow-sm sm:p-5">
          <form
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              applySearch()
            }}
          >
            <div className="min-w-0 flex-1">
              <label htmlFor="admin-user-search" className={labelClasses}>
                Search users
              </label>
              <Input
                id="admin-user-search"
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search by name or email…"
                autoComplete="off"
              />
            </div>
            <div className="sm:w-48">
              <label htmlFor="admin-user-role-filter" className={labelClasses}>
                Role
              </label>
              <div className="relative">
                <select
                  id="admin-user-role-filter"
                  className={selectClasses}
                  value={roleFilter}
                  onChange={(event) => handleRoleFilterChange(event.target.value)}
                >
                  {ROLE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rentify-deepNavy"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="sm:w-36">
              <label htmlFor="admin-user-page-size" className={labelClasses}>
                Per page
              </label>
              <div className="relative">
                <select
                  id="admin-user-page-size"
                  className={selectClasses}
                  value={String(limit)}
                  onChange={(event) => handleLimitChange(event.target.value)}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={String(size)}>
                      {size}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rentify-deepNavy"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Search</Button>
              {hasActiveFilters && (
                <Button type="button" variant="outline" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-rentify-grayLight bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
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
                  <th scope="col" className="px-4 py-3">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((account) => (
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
                      <Badge variant={roleVariant[account.role]}>
                        {roleDisplay[account.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-rentify-grayMuted">
                      {formatDate(account.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-rentify-grayMuted">
                      {account.role === 'tenant'
                        ? `${account.preferredLocation ?? '—'}, Vadodara${
                            account.budget
                              ? ` · ${formatCurrency(account.budget)} budget`
                              : ''
                          }`
                        : account.role === 'owner'
                          ? 'Listings & agreements'
                          : 'Full access'}
                    </td>
                  </tr>
                ))}
                {!loading && !loadError && allUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-rentify-grayMuted"
                    >
                      {hasActiveFilters
                        ? 'No users match your filters.'
                        : 'No users returned from the database.'}
                    </td>
                  </tr>
                )}
                {loading && allUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-rentify-grayMuted"
                    >
                      Loading users…
                    </td>
                  </tr>
                )}
                {!loading && loadError && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-rentify-grayMuted"
                    >
                      <p>{loadError}</p>
                      <div className="mt-4">
                        <Button
                          size="sm"
                          onClick={() => setRetryKey((key) => key + 1)}
                        >
                          Try again
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-rentify-grayMuted" aria-live="polite">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)} ·{' '}
            {pagination.total} users total
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={goToPrevPage}
              disabled={loading || pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={goToNextPage}
              disabled={
                loading || pagination.page >= Math.max(1, pagination.totalPages)
              }
            >
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default UsersPage
