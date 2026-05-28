'use client'
import { useState } from 'react'
import Link from 'next/link'
import DateTimePicker from '@/components/booking/DateTimePicker'
import BookingForm    from '@/components/booking/BookingForm'
import PriceSummary   from '@/components/booking/PriceSummary'
import PaymentStep    from '@/components/booking/PaymentStep'
import type { AvailableSlot } from '@/types'

type Step = 'pick' | 'details' | 'payment'

const STEPS: { key: Step; label: string }[] = [
  { key: 'pick',    label: 'Date & Time' },
  { key: 'details', label: 'Details'     },
  { key: 'payment', label: 'Payment'     },
]

export default function BookPage() {
  const [step,       setStep]       = useState<Step>('pick')
  const [date,       setDate]       = useState<Date | null>(null)
  const [slot,       setSlot]       = useState<AvailableSlot | null>(null)
  const [pax,        setPax]        = useState(1)
  const [bookingId,  setBookingId]  = useState<string | null>(null)
  const [totalPrice, setTotalPrice] = useState(0)

  const currentIdx = STEPS.findIndex((s) => s.key === step)

  function handleSlotSelect(d: Date, s: AvailableSlot) {
    setDate(d)
    setSlot(s)
    setStep('details')
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-brand-dark">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <p className="text-white font-black tracking-widest text-lg">ANTIGRAVITY</p>
            <p className="text-gray-500 text-[10px] tracking-[0.35em]">SAUNA & COLD PLUNGE</p>
          </Link>
          <p className="text-gray-400 text-sm hidden sm:block">Book a Session</p>
        </div>
      </header>

      {/* ── Step indicator ─────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3.5">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  i < currentIdx  ? 'bg-brand-accent text-brand-dark' :
                  i === currentIdx ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400',
                ].join(' ')}>
                  {i < currentIdx ? '✓' : i + 1}
                </div>
                <span className={[
                  'ml-1.5 text-xs font-medium hidden sm:block',
                  i === currentIdx ? 'text-gray-900' : 'text-gray-400',
                ].join(' ')}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-8 sm:w-14 mx-2 ${i < currentIdx ? 'bg-brand-accent' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* ── Step 1: Date + Time ─── */}
        {step === 'pick' && (
          <DateTimePicker
            pax={pax}
            onPaxChange={setPax}
            onSlotSelect={handleSlotSelect}
          />
        )}

        {/* ── Step 2: Details ─── */}
        {step === 'details' && date && slot && (
          <div>
            <button
              onClick={() => setStep('pick')}
              className="text-gray-600 text-sm font-medium flex items-center gap-1 mb-7 hover:text-gray-900"
            >
              ← Back
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your details</h2>
                <BookingForm
                  slot={slot}
                  pax={pax}
                  onPaxChange={setPax}
                  onBookingCreated={(id, price) => {
                    setBookingId(id)
                    setTotalPrice(price)
                    setStep('payment')
                  }}
                />
              </div>
              <div className="lg:col-span-2">
                <PriceSummary slot={slot} date={date} pax={pax} />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Payment ─── */}
        {step === 'payment' && bookingId && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete payment</h2>
            <p className="text-gray-500 text-sm mb-8">
              Your session is held for 60 minutes while you complete payment.
            </p>
            <PaymentStep bookingId={bookingId} totalPrice={totalPrice} />
          </div>
        )}

      </main>
    </div>
  )
}
