import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { getOwnerById } from '../data/users'
import { useChat } from '../context/ChatContext'
import { useProperties } from '../context/PropertiesContext'
import { formatCurrency } from '../utils/currency'
import type { ChatMessage, Property } from '../types'

type View = 'hub' | 'owner' | 'ai'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function starterOwner(property: Property): ChatMessage {
  const owner = getOwnerById(property.ownerId)
  return {
    id: 'starter-owner',
    from: 'owner',
    text: `Hello! This is ${owner?.name ?? 'the property owner'}, the property owner. Ask me anything about ${property.title} in ${property.location}, Vadodara.`,
    sentAt: '',
  }
}

function starterAi(property?: Property): ChatMessage {
  return {
    id: 'starter-ai',
    from: 'ai',
    text: property
      ? `Hi! I'm the Rentify Assistant (not the property owner). Ask me about rent, amenities, monthly cost, neighbourhood or agreements for "${property.title}".`
      : "Hi! I'm the Rentify Assistant. I can answer questions about rent, deposits, amenities, monthly costs, neighbourhoods and the rent agreement flow. Open a property chat for property-specific answers.",
    sentAt: '',
  }
}

const ChatPage = () => {
  const { propertyId: pathPropertyId } = useParams<{ propertyId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const threadParam = searchParams.get('thread')
  const aiPropertyId = searchParams.get('property')
  const { properties, getPropertyById } = useProperties()
  const { threads, messagesFor, sendUserMessage } = useChat()
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const view: View = pathPropertyId
    ? 'owner'
    : threadParam === 'ai'
      ? 'ai'
      : 'hub'

  const property: Property | undefined =
    view === 'owner'
      ? getPropertyById(pathPropertyId ?? '')
      : view === 'ai'
        ? aiPropertyId
          ? getPropertyById(aiPropertyId)
          : undefined
        : undefined

  const owner = property ? getOwnerById(property.ownerId) : undefined

  const threadId =
    view === 'owner' && property
      ? `owner:${property.id}`
      : view === 'ai'
        ? 'ai'
        : ''

  const stored = threadId ? messagesFor(threadId) : []
  const messages = useMemo(() => {
    if (stored.length > 0) return stored
    if (view === 'owner' && property) return [starterOwner(property)]
    if (view === 'ai') return [starterAi(property)]
    return []
  }, [stored, view, property])

  const quickPrompts =
    view === 'ai'
      ? property
        ? [
            'What is the monthly rent?',
            'What amenities are included?',
            'Is it suitable for families?',
            'Explain the rent agreement',
          ]
        : [
            'What areas do you cover?',
            'How do agreements work?',
            'What is the typical deposit?',
          ]
      : view === 'owner'
        ? [
            'Can I schedule a viewing?',
            'Is the rent negotiable?',
            'What is the deposit?',
            'When is it available?',
          ]
        : []

  const hubThreads = useMemo(() => {
    const rows: {
      id: string
      kind: 'ai' | 'owner'
      title: string
      subtitle: string
      to: string
      preview: string
      count: number
      propertyId?: string
    }[] = []

    const aiMessages = threads['ai'] ?? []
    rows.push({
      id: 'ai',
      kind: 'ai',
      title: 'Rentify Assistant',
      subtitle: 'Rental Assistant',
      to: '/chat?thread=ai',
      preview:
        aiMessages.length > 0
          ? aiMessages[aiMessages.length - 1].text
          : 'Ask about rent, deposits, areas and agreements',
      count: aiMessages.length,
    })

    const seen = new Set<string>()
    for (const propertyItem of properties) {
      if (seen.has(propertyItem.id)) continue
      seen.add(propertyItem.id)
      const messagesForProperty = threads[`owner:${propertyItem.id}`] ?? []
      if (messagesForProperty.length === 0) continue
      const ownerOf = getOwnerById(propertyItem.ownerId)
      rows.push({
        id: `owner:${propertyItem.id}`,
        kind: 'owner',
        title: `Chat with ${ownerOf?.name ?? 'owner'}`,
        subtitle: propertyItem.title,
        to: `/chat/${propertyItem.id}`,
        preview: messagesForProperty[messagesForProperty.length - 1].text,
        count: messagesForProperty.length,
        propertyId: propertyItem.id,
      })
    }
    return rows
  }, [threads, properties])

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      })
    })
  }, [messages.length, threadId])

  useEffect(() => {
    setDraft('')
  }, [threadId])

  const sendMessage = (raw: string) => {
    const text = raw.trim()
    if (!text || !threadId) return
    sendUserMessage({
      threadId,
      text,
      property,
      meta: property
        ? {
            propertyId: property.id,
            ownerId: property.ownerId,
          }
        : {},
    })
    setDraft('')
  }

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault()
    sendMessage(draft)
  }

  if (view === 'hub') {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
        <Header title="Rentify Chat" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-rentify-navy sm:text-3xl">
                Messages
              </h1>
              <p className="mt-1.5 text-sm text-rentify-grayMuted">
                Owner chats are property-scoped. The Rentify Assistant is a
                separate helper — never the landlord.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/chat?thread=ai')}>
                Open Rentify Assistant
              </Button>
              <Button onClick={() => navigate('/search')}>Find a property</Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => navigate('/chat?thread=ai')}
              className="flex items-start gap-3 rounded-2xl border border-rentify-grayLight bg-white p-4 text-left shadow-sm transition-colors hover:border-rentify-purpleLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rentify-navy text-sm font-bold text-white"
                aria-hidden
              >
                R
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-rentify-navy">
                  Rentify Assistant
                </span>
                <span className="block text-xs text-rentify-grayMuted">
                  Rental Assistant
                </span>
                <span className="mt-1 line-clamp-2 block text-sm text-rentify-grayMuted">
                  {hubThreads[0]?.preview}
                </span>
              </span>
            </button>

            {hubThreads.slice(1).map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => navigate(row.to)}
                className="flex items-start gap-3 rounded-2xl border border-rentify-grayLight bg-white p-4 text-left shadow-sm transition-colors hover:border-rentify-purpleLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rentify-purpleLight text-sm font-bold text-rentify-navy"
                  aria-hidden
                >
                  {(owner?.name ?? 'O').slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-rentify-navy">{row.title}</span>
                  <span className="block truncate text-xs text-rentify-grayMuted">
                    {row.subtitle}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-rentify-grayMuted">
                    {row.preview}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {hubThreads.length <= 1 && (
            <div className="mt-6 rounded-2xl border border-rentify-grayLight bg-white px-5 py-10 text-center text-sm text-rentify-grayMuted">
              <p className="font-display text-base font-semibold text-rentify-navy">
                No owner chats yet
              </p>
              <p className="mx-auto mt-1.5 max-w-md">
                Open any property and use “Chat with Owner” to start a
                property-scoped conversation.
              </p>
              <div className="mt-4">
                <Button size="sm" onClick={() => navigate('/search')}>
                  Browse properties
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-rentify-purpleLight bg-rentify-purpleLight3 p-4 text-xs leading-relaxed text-rentify-grayMuted">
            <strong className="text-rentify-navy">Owner chats</strong> are with mock
            property owners. <strong className="text-rentify-navy">Rentify Assistant</strong>{' '}
            is a separate virtual assistant and never pretends to be a landlord.
          </div>
        </main>
      </div>
    )
  }

  if (view === 'owner' && !property) {
    return (
      <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
        <Header showBack onBack={() => navigate('/chat')} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-12 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-rentify-navy">
            Property not found
          </h1>
          <p className="mt-2 text-rentify-grayMuted">
            This property may have been removed, or the link is incorrect.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate('/chat')}>Back to messages</Button>
            <Button variant="secondary" onClick={() => navigate('/search')}>
              Browse properties
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const isAi = view === 'ai'
  const headerName = isAi
    ? 'Rentify Assistant'
    : `Chat with ${owner?.name ?? 'Property Owner'}`

  return (
    <div className="flex min-h-screen flex-col bg-rentify-whiteOff">
      <Header
        title="Rentify Chat"
        showBack
        onBack={() => navigate('/chat')}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 pt-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/chat')}>
            ← All messages
          </Button>
          {property && (
            <Link
              to={`/properties/${property.id}`}
              className="text-sm font-semibold text-rentify-navy hover:text-rentify-lightNavy"
            >
              View property
            </Link>
          )}
        </div>

        <section className="flex flex-col overflow-hidden rounded-2xl border border-rentify-grayLight bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-rentify-grayLight px-4 py-3.5 sm:px-5">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                isAi ? 'bg-rentify-navy text-white' : 'bg-rentify-purpleLight text-rentify-navy'
              }`}
              aria-hidden
            >
              {isAi ? 'R' : initials(owner?.name ?? 'Owner')}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display font-semibold text-rentify-navy">{headerName}</h2>
                <Badge variant={isAi ? 'default' : 'success'} size="sm">
                  {isAi ? 'Rental Assistant' : 'Property Owner'}
                </Badge>
              </div>
              <p className="truncate text-xs text-rentify-grayMuted">
                {isAi
                  ? 'A virtual assistant — not the property owner'
                  : owner?.phone
                    ? `${owner.name} · ${owner.phone}`
                    : `${owner?.name ?? 'Property Owner'} · Vadodara`}
              </p>
            </div>
          </div>

          {property && (
            <div className="flex items-center gap-4 border-b border-rentify-grayLight bg-rentify-whiteOff px-4 py-3 sm:px-5">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-rentify-purpleLight2">
                <img
                  src={property.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-rentify-navy">
                  {property.title}
                </p>
                <p className="truncate text-xs text-rentify-grayMuted">
                  {property.location}, Vadodara · {formatCurrency(property.price)}/month
                </p>
              </div>
            </div>
          )}

          <div
            ref={listRef}
            className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
            style={{ maxHeight: '52vh', minHeight: '320px' }}
            aria-live="polite"
          >
            {messages.map((message) => {
              const mine = message.from === 'you'
              const senderLabel =
                message.from === 'ai'
                  ? 'Rentify Assistant'
                  : message.from === 'owner'
                    ? owner?.name ?? 'Owner'
                    : 'You'
              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                >
                  <span className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-rentify-grayMuted">
                    {senderLabel}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      mine
                        ? 'bg-rentify-navy text-white'
                        : message.from === 'ai'
                          ? 'bg-rentify-purpleLight2 text-rentify-navy ring-1 ring-rentify-purpleLight'
                          : 'bg-rentify-whiteOff text-rentify-navy ring-1 ring-rentify-grayLight'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-rentify-grayLight px-4 pt-3 sm:px-5">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="rounded-full border border-rentify-purpleLight bg-rentify-purpleLight3 px-3 py-1.5 text-xs font-medium text-rentify-navy transition-colors hover:bg-rentify-purpleLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleFormSubmit}
            className="flex gap-2 border-t border-rentify-grayLight p-3 sm:p-4"
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                isAi
                  ? 'Ask the Rentify Assistant a question…'
                  : `Message ${owner?.name ?? 'the owner'}…`
              }
              aria-label="Message"
              className="flex-1"
              autoComplete="off"
            />
            <Button type="submit" disabled={!draft.trim()}>
              Send
            </Button>
          </form>
        </section>

        <p className="mt-4 text-center text-xs text-rentify-grayMuted">
          Demo chat — messages stay in this browser’s localStorage. Owner and
          assistant replies are canned responses.
        </p>
      </main>
    </div>
  )
}

export default ChatPage
