import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext'
import { apiRequest } from '../utils/api'
import { readJson, writeJson } from '../utils/storage'

const GUEST_STORAGE_KEY = 'rentify:favorites'
const USER_STORAGE_PREFIX = 'rentify:favorites:'
const TOKEN_STORAGE_KEY = 'rentify:token'

interface FavoritesContextValue {
  favorites: string[]
  isFavorite: (id: string) => boolean
  toggleFavorite: (id: string) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

function storageKeyFor(userId: string): string {
  return userId === 'guest'
    ? GUEST_STORAGE_KEY
    : `${USER_STORAGE_PREFIX}${userId}`
}

function sanitizeList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string')
    : []
}

function readFavorites(userId: string): string[] {
  return sanitizeList(readJson<unknown>(storageKeyFor(userId), []))
}

function writeFavorites(userId: string, favorites: string[]): void {
  writeJson(storageKeyFor(userId), favorites)
}

function readAuthToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

interface ApiFavoritePayload {
  propertyId: string
}

async function fetchApiFavorites(token: string): Promise<string[] | null> {
  const result = await apiRequest<{ favorites: ApiFavoritePayload[] }>(
    'GET',
    '/api/favorites',
    undefined,
    token,
  )
  if (!result.ok || !result.data) return null
  return result.data.favorites
    .map((favorite) => favorite.propertyId)
    .filter((id): id is string => typeof id === 'string')
}

const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth()
  const userId = user?.id ?? 'guest'
  const [favorites, setFavorites] = useState<string[]>(() =>
    readFavorites(userId),
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (userId === 'guest') {
        setFavorites(readFavorites('guest'))
        return
      }
      const token = readAuthToken()
      if (!token) {
        setFavorites(readFavorites(userId))
        return
      }
      const apiFavorites = await fetchApiFavorites(token)
      if (cancelled) return
      if (apiFavorites === null) {
        setFavorites(readFavorites(userId))
        return
      }
      writeFavorites(userId, apiFavorites)
      setFavorites(apiFavorites)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (userId === 'guest') {
      writeFavorites('guest', favorites)
    }
  }, [userId, favorites])

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites],
  )

  const toggleFavorite = useCallback(
    (id: string) => {
      const adding = !favorites.includes(id)

      if (userId === 'guest') {
        setFavorites((current) =>
          current.includes(id)
            ? current.filter((favoriteId) => favoriteId !== id)
            : [...current, id],
        )
        return
      }

      const token = readAuthToken()
      if (!token) {
        setFavorites((current) =>
          current.includes(id)
            ? current.filter((favoriteId) => favoriteId !== id)
            : [...current, id],
        )
        return
      }

      setFavorites((current) =>
        adding
          ? current.includes(id)
            ? current
            : [...current, id]
          : current.filter((favoriteId) => favoriteId !== id),
      )

      void (async () => {
        const result = await apiRequest(
          adding ? 'POST' : 'DELETE',
          `/api/favorites/${id}`,
          undefined,
          token,
        )
        if (!result.ok) {
          setFavorites((current) =>
            adding
              ? current.filter((favoriteId) => favoriteId !== id)
              : current.includes(id)
                ? current
                : [...current, id],
          )
        } else if (adding) {
          writeFavorites(userId, favorites.filter((f) => f !== id).concat(id))
        } else {
          writeFavorites(
            userId,
            favorites.filter((favoriteId) => favoriteId !== id),
          )
        }
      })()
    },
    [favorites, userId],
  )

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite }),
    [favorites, isFavorite, toggleFavorite],
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}

export { FavoritesProvider, useFavorites }
export type { FavoritesContextValue }
