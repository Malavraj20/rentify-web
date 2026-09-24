import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ChatMessage, ChatState, ChatThreadMeta, Property } from '../types'
import { getOwnerById } from '../data/users'
import { readJson, uid, writeJson } from '../utils/storage'

const STORAGE_KEY = 'rentify:chat'

export type Threads = Record<string, ChatMessage[]>

interface SendArgs {
  threadId: string
  text: string
  property?: Property
  meta?: ChatThreadMeta
}

interface ChatContextValue {
  threads: Threads
  meta: Record<string, ChatThreadMeta>
  messagesFor: (threadId: string) => ChatMessage[]
  sendUserMessage: (args: SendArgs) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

function readState(): ChatState {
  const stored = readJson<ChatState | Threads | null>(STORAGE_KEY, null)
  if (!stored || typeof stored !== 'object') {
    return { threads: {}, meta: {} }
  }
  if ('threads' in stored && stored.threads && typeof stored.threads === 'object') {
    const state = stored as ChatState
    return { threads: state.threads, meta: state.meta ?? {} }
  }
  return { threads: stored as Threads, meta: {} }
}

function now(): string {
  return new Date().toISOString()
}

function ownerReply(text: string, property?: Property): string {
  const owner = property ? getOwnerById(property.ownerId) : undefined
  const lower = text.toLowerCase()

  if (!property || !owner) {
    return `Hi, this is ${owner?.name ?? 'the property owner'}. Could you share which property you are asking about so I can help better?`
  }
  if (lower.includes('viewing') || lower.includes('visit') || lower.includes('show')) {
    return `Thanks for your interest in ${property.title}. You can request a viewing from the property page — I usually confirm within a day. Weekday evenings work best.`
  }
  if (lower.includes('deposit') || lower.includes('advance')) {
    return `The security deposit for ${property.title} is ₹${property.securityDeposit.toLocaleString('en-IN')}, refundable at the end of the lease subject to a property check.`
  }
  if (lower.includes('negotiat') || lower.includes('discount') || lower.includes('flexib')) {
    return `Rent for ${property.title} is ₹${property.price.toLocaleString('en-IN')}/month. For a longer lease of 11–12 months, I can consider a small concession — let's discuss after a viewing.`
  }
  if (lower.includes('maintenance') || lower.includes('repair')) {
    return `Maintenance for ${property.title} is about ₹${property.maintenance.toLocaleString('en-IN')} per month. Major structural repairs are handled by me as the owner.`
  }
  if (lower.includes('furnish') || lower.includes('furniture')) {
    return `${property.title} comes ${property.furnishing.toLowerCase()}. I can share the exact inventory list once you schedule a viewing.`
  }
  if (lower.includes('agreement') || lower.includes('lease') || lower.includes('contract')) {
    return `We can draft a rent agreement through Rentify's agreement flow for ${property.title}. Once you raise it, I'll review and approve it from my owner dashboard.`
  }
  if (lower.includes('available') || lower.includes('move') || lower.includes('shift')) {
    return `${property.title} is available from ${new Date(property.availableFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. ${
      property.available ? 'It is open for bookings now.' : 'It will open for bookings soon.'
    }`
  }
  if (lower.includes('parking') || lower.includes('amenit')) {
    return `For ${property.title}: ${property.amenities.join(', ')}. Happy to show you the parking spot and society during your visit.`
  }
  if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
    return `Hello! This is ${owner.name}, the owner of ${property.title} in ${property.location}, Vadodara. What would you like to know?`
  }
  return `Thanks for messaging about ${property.title} in ${property.location}. The rent is ₹${property.price.toLocaleString('en-IN')}/month — ask me anything else, or request a viewing from the property page.`
}

function aiReply(text: string, property?: Property): string {
  const lower = text.toLowerCase()
  const includesAny = (...words: string[]) => words.some((w) => lower.includes(w))

  if (!property) {
    if (includesAny('price', 'rent', 'cost', 'budget')) {
      return 'Listings in Vadodara on Rentify currently range from about ₹11,000 to ₹45,000 per month depending on the neighbourhood and BHK. Open Search and use the min/max rent filters to narrow things down.'
    }
    if (includesAny('agreement', 'lease', 'contract')) {
      return 'You can raise a rent agreement from any property page using "Start Rent Agreement" — fill the form, review it, and generate a demo agreement. Note: Rentify demo agreements are not legally executed documents.'
    }
    if (includesAny('neighbourhood', 'neighborhood', 'area', 'vadodara', 'location')) {
      return 'Rentify focuses on Vadodara, Gujarat — popular areas include Alkapuri, Gotri, Akota, Manjalpur, Karelibaug, Sayajigunj, Vasna, Sama-Savli, Harni and Waghodia Road.'
    }
    return "I'm the Rentify Assistant — I can explain rent, deposits, amenities, monthly costs, neighbourhoods and the rental agreement flow. Select a property for property-specific answers."
  }

  const estimated = property.price + property.maintenance + Math.round(property.size * 4)

  if (includesAny('price', 'rent', 'how much', 'cost per', 'monthly rent')) {
    return `${property.title} is listed at ₹${property.price.toLocaleString('en-IN')} per month plus about ₹${property.maintenance.toLocaleString('en-IN')} maintenance. Deposit required is ₹${property.securityDeposit.toLocaleString('en-IN')}.`
  }
  if (includesAny('total', 'estimate', 'monthly cost', 'overall')) {
    return `Estimated monthly total for ${property.title}: rent ₹${property.price.toLocaleString('en-IN')} + maintenance ₹${property.maintenance.toLocaleString('en-IN')} + utilities ≈ ₹${estimated.toLocaleString('en-IN')}/month.`
  }
  if (includesAny('amenit', 'facilities', 'parking', 'gym', 'lift', 'wifi', 'wi-fi')) {
    return `Amenities at ${property.title}: ${property.amenities.join(', ')}. It is ${property.furnishing.toLowerCase()}.`
  }
  if (includesAny('deposit', 'security')) {
    return `The security deposit for ${property.title} is ₹${property.securityDeposit.toLocaleString('en-IN')} — typically 2 months' rent — refundable at lease end after a property check.`
  }
  if (includesAny('neighbourhood', 'neighborhood', 'area', 'location', 'around', 'vadodara')) {
    return `${property.location} is a well-established neighbourhood in Vadodara. ${property.title} sits at ${property.address}, with an approximate ${property.commute} commute to the city centre.`
  }
  if (includesAny('agreement', 'lease', 'contract', 'notice')) {
    return `For ${property.title} you can start a rent agreement from the property page. Standard demo terms: 11–12 month lease, 30–60 day notice period, rent due on the 5th of each month. Remember — Rentify demo agreements are not legally executed documents.`
  }
  if (includesAny('suitable', 'family', 'bachelor', 'student', 'couple', 'good for')) {
    const hint =
      property.bedrooms >= 2
        ? 'its 2+ bedrooms make it suitable for families or shared living'
        : 'its compact layout suits a single professional or couple'
    return `${property.title} scores ${property.matchScore}% compatibility. ${property.bedrooms >= 2 ? 'With ' + property.bedrooms + ' bedrooms, ' : ''}${hint}. Property health is ${property.healthScore}% with ${property.riskLevel} risk.`
  }
  if (includesAny('risk', 'health', 'safe', 'condition')) {
    return `Property health for ${property.title} is ${property.healthScore}% with ${property.riskLevel} risk. ${
      property.riskLevel === 'low'
        ? 'It is in good shape with no major red flags.'
        : 'Check the maintenance notes on the details page before booking a viewing.'
    }`
  }
  if (includesAny('available', 'move', 'vacancy')) {
    return `${property.title} is available from ${new Date(property.availableFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. Use "Request Viewing" on the property page to book a slot.`
  }
  if (includesAny('hi', 'hello', 'hey')) {
    return `Hi! I'm the Rentify Assistant (not the property owner). Ask me about rent, amenities, monthly cost, neighbourhood or agreements for ${property.title}.`
  }
  return `Here's a quick summary of ${property.title}: ₹${property.price.toLocaleString('en-IN')}/month, ${property.bedrooms === 0 ? 'studio' : property.bedrooms + ' BHK'}, ${property.size} sqft in ${property.location}, ${property.matchScore}% compatibility, ${property.healthScore}% health. Ask me about cost, amenities, neighbourhood or agreements.`
}

const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<ChatState>(readState)
  const pendingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    writeJson(STORAGE_KEY, state)
  }, [state])

  const messagesFor = useCallback(
    (threadId: string): ChatMessage[] => state.threads[threadId] ?? [],
    [state.threads],
  )

  const sendUserMessage = useCallback(
    ({ threadId, text, property, meta }: SendArgs) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const userMessage: ChatMessage = {
        id: uid('msg'),
        from: 'you',
        text: trimmed,
        sentAt: now(),
      }

      const isAi = threadId === 'ai'
      const replyText = isAi ? aiReply(trimmed, property) : ownerReply(trimmed, property)
      const replyDelay = isAi ? 550 : 850

      setState((current) => ({
        threads: {
          ...current.threads,
          [threadId]: [...(current.threads[threadId] ?? []), userMessage],
        },
        meta: {
          ...current.meta,
          [threadId]: { ...current.meta[threadId], ...meta },
        },
      }))

      const pendingKey = `${threadId}:${trimmed}`
      if (pendingRef.current.has(pendingKey)) return
      pendingRef.current.add(pendingKey)

      window.setTimeout(() => {
        pendingRef.current.delete(pendingKey)
        const reply: ChatMessage = {
          id: uid('msg'),
          from: isAi ? 'ai' : 'owner',
          text: replyText,
          sentAt: now(),
        }
        setState((current) => ({
          ...current,
          threads: {
            ...current.threads,
            [threadId]: [...(current.threads[threadId] ?? []), reply],
          },
        }))
      }, replyDelay)
    },
    [],
  )

  const value = useMemo(
    () => ({ threads: state.threads, meta: state.meta, messagesFor, sendUserMessage }),
    [state.threads, state.meta, messagesFor, sendUserMessage],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

function useChat(): ChatContextValue {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

export { ChatProvider, useChat }
export type { ChatContextValue }
