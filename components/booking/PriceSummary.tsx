'use client'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { AvailableSlot, PriceEstimate } from '@/types'

interface Props { slot: AvailableSlot; date: Date; pax: number }

export default function PriceSummary({ slot, date, pax }: Props) {
  const dateStr = format(date, 'yyyy-MM-dd')

  const { data: price } = useQuery<PriceEstimate>({
    queryKey: ['price', slot.id, pax],
    queryFn:  async () => {
      const res = await fetch(`/api/slots?date=${dateStr}&pax=${pax}`)
      const slots: AvailableSlot[] = await res.json()
      const s = slots.find((sl) => sl.id === slot.id)
      return s?.estimatedPrice ?? { basePrice: 0, pricePerPax: 0, pax, totalPrice: 0, currency: 'IDR' }
    },
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-4">
      <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Date</span>
          <span className="font-medium">{format(date, 'EEE, MMM d yyyy')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Session</span>
          <span className="font-medium">{slot.startTime} – {slot.endTime}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Guests</span>
          <span className="font-medium">{pax} {pax === 1 ? 'person' : 'people'}</span>
        </div>
      </div>

      {price && (
        <>
          <div className="border-t pt-3 space-y-2">
            {price.basePrice > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Session fee</span>
                <span>{formatCurrency(price.basePrice)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>{formatCurrency(price.pricePerPax)} × {pax} pax</span>
              <span>{formatCurrency(price.pricePerPax * pax)}</span>
            </div>
          </div>

          <div className="border-t mt-3 pt-3 flex justify-between items-center">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-black text-xl text-brand-blue">{formatCurrency(price.totalPrice)}</span>
          </div>

          {price.ruleName && (
            <p className="text-xs text-gray-400 mt-2 text-right">{price.ruleName} rate</p>
          )}
        </>
      )}
    </div>
  )
}
