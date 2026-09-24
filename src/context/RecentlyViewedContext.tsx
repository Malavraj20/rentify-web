import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { readJson, writeJson } from '../utils/storage'

const STORAGE_KEY = 'rentify:recent'
const MAX_RECENT = 6

interface RecentlyViewedContextValue {
  recentlyViewed: string[]
  markViewed: (propertyId: string) => void
}

const RecentlyViewedContext = createContext<RecentlyViewedContextValue | null>(
  null,
)

function readRecent(): string[] {
  const stored = readJson<string[] | null>(STORAGE_KEY, null)
  if (!Array.isArray(stored)) return []
  return stored.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENT)
}

const RecentlyViewedProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(readRecent)

  useEffect(() => {
    writeJson(STORAGE_KEY, recentlyViewed)
  }, [recentlyViewed])

  const markViewed = useCallback((propertyId: string) => {
    setRecentlyViewed((current) =>
      [propertyId, ...current.filter((id) => id !== propertyId)].slice(
        0,
        MAX_RECENT,
      ),
    )
  }, [])

  const value = useMemo(
    () => ({ recentlyViewed, markViewed }),
    [recentlyViewed, markViewed],
  )

  return (
    <RecentlyViewedContext.Provider value={value}>
      {children}
    </RecentlyViewedContext.Provider>
  )
}

function useRecentlyViewed(): RecentlyViewedContextValue {
  const context = useContext(RecentlyViewedContext)
  if (!context) {
    throw new Error(
      'useRecentlyViewed must be used within a RecentlyViewedProvider',
    )
  }
  return context
}

export { RecentlyViewedProvider, useRecentlyViewed }
export type { RecentlyViewedContextValue }
