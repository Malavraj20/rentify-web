import { useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { Property } from '../../types'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  property: Property
  tenantName: string
  ownerName: string
  onSubmit: (input: {
    date: string
    time: string
    note?: string
  }) => void | Promise<void>
}

const timeSlots = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '4:00 PM',
  '5:30 PM',
  '6:30 PM',
]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const BookingModal = ({
  isOpen,
  onClose,
  property,
  tenantName,
  ownerName,
  onSubmit,
}: BookingModalProps) => {
  const [date, setDate] = useState(todayIso())
  const [time, setTime] = useState(timeSlots[0])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    if (!date) {
      setError('Please pick a viewing date.')
      return
    }
    if (date < todayIso()) {
      setError('Viewing date cannot be in the past.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({ date, time, note: note.trim() || undefined })
      setNote('')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not submit your request.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Request viewing — ${property.title}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl bg-rentify-whiteOff px-3.5 py-3 text-sm">
          <p className="font-semibold text-rentify-navy">
            {property.location}, Vadodara
          </p>
          <p className="mt-0.5 text-rentify-grayMuted">
            Tenant: {tenantName} · Owner: {ownerName}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="booking-date"
              className="mb-1.5 block text-sm font-medium text-rentify-navy"
            >
              Preferred date
            </label>
            <Input
              id="booking-date"
              type="date"
              min={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="booking-time"
              className="mb-1.5 block text-sm font-medium text-rentify-navy"
            >
              Preferred time
            </label>
            <select
              id="booking-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="block w-full appearance-none rounded-xl border border-rentify-borderDefault bg-white px-4 py-2.5 text-base text-rentify-navy shadow-sm transition-colors hover:border-rentify-lightNavy focus:border-rentify-navy focus:outline-none focus:ring-2 focus:ring-rentify-purpleLight"
            >
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="booking-note"
            className="mb-1.5 block text-sm font-medium text-rentify-navy"
          >
            Note for the owner <span className="font-normal text-rentify-grayMuted">(optional)</span>
          </label>
          <Input
            id="booking-note"
            placeholder="e.g., I'll bring my family along"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm font-medium text-red-500" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-rentify-grayLight pt-4">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Request Viewing'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export { BookingModal }
export type { BookingModalProps }
