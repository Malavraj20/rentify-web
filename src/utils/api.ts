const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim()
const API_BASE = configuredBase
  ? configuredBase.replace(/\/+$/, '')
  : import.meta.env.DEV
    ? 'http://localhost:4000'
    : ''

export interface ApiResult<T = unknown> {
  ok: boolean
  status: number
  data: T | null
}

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers['Authorization'] = `Bearer ${token}`

    const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    let data: T | null = null
    try {
      data = (await response.json()) as T
    } catch {
      data = null
    }

    return { ok: response.ok, status: response.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

interface ApiErrorPayload {
  message?: string
  errors?: { path?: string; message?: string }[]
}

export function extractErrorMessage(
  result: ApiResult<unknown>,
  fallback: string,
): string {
  if (result.status === 0) {
    return 'Cannot reach the server. Please try again later.'
  }
  const data = result.data as ApiErrorPayload | null
  if (data && typeof data.message === 'string' && data.message.length > 0) {
    const details = Array.isArray(data.errors)
      ? data.errors
          .map((issue) => issue.message)
          .filter((message): message is string => Boolean(message))
          .join(' ')
      : ''
    return details ? `${data.message} ${details}` : data.message
  }
  return fallback
}
