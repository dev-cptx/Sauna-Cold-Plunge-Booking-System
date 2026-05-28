'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { AvailableSlot } from '@/types'

interface FormValues {
  customerName:  string
  customerEmail: string
  customerPhone: string
  pax:           number
  notes?:        string
}

interface Props {
  slot:              AvailableSlot
  pax:               number
  onPaxChange:       (n: number) => void
  onBookingCreated:  (bookingId: string, totalPrice: number) => void
}

export default function BookingForm({ slot, pax, onPaxChange, onBookingCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { pax },
  })

  const maxPax = Math.min(slot.availableCapacity, 5)

  const submit = async (data: FormValues) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...data, timeSlotId: slot.id, pax: Number(data.pax) }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to create booking'); return }
      onBookingCreated(json.bookingId, json.totalPrice)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const field = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition'
  const label = 'block text-sm font-medium text-gray-700 mb-1.5'
  const err   = 'text-red-500 text-xs mt-1'

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div>
        <label className={label}>Full Name *</label>
        <input {...register('customerName', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })}
               className={field} placeholder="Your full name" />
        {errors.customerName && <p className={err}>{errors.customerName.message}</p>}
      </div>

      <div>
        <label className={label}>Email Address *</label>
        <input {...register('customerEmail', {
                 required: 'Email is required',
                 pattern:  { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
               })}
               type="email" className={field} placeholder="you@example.com" />
        {errors.customerEmail && <p className={err}>{errors.customerEmail.message}</p>}
      </div>

      <div>
        <label className={label}>Phone Number *</label>
        <input {...register('customerPhone', {
                 required: 'Phone is required',
                 minLength: { value: 8, message: 'Too short' },
               })}
               type="tel" className={field} placeholder="+62 812 3456 7890" />
        {errors.customerPhone && <p className={err}>{errors.customerPhone.message}</p>}
      </div>

      <div>
        <label className={label}>Number of Guests *</label>
        <select {...register('pax', { onChange: (e) => onPaxChange(Number(e.target.value)) })}
                className={field}>
          {Array.from({ length: maxPax }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>Special Requests (optional)</label>
        <textarea {...register('notes', { maxLength: { value: 500, message: 'Max 500 chars' } })}
                  rows={3} className={field} placeholder="Allergies, accessibility needs, etc." />
        {errors.notes && <p className={err}>{errors.notes.message}</p>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <button type="submit" disabled={loading}
              className="w-full bg-brand-blue text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#0a2540] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
        {loading ? 'Processing…' : 'Continue to Payment →'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        By continuing you agree to our cancellation and refund policy.
      </p>
    </form>
  )
}
