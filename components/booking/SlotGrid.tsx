'use client'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { AvailableSlot } from '@/types'

interface Props {
  date: Date
  pax:  number
  onSlotSelect: (slot: AvailableSlot) => void
}

export default function SlotGrid({ date, pax, onSlotSelect }: Props) {
  const dateStr = format(date, 'yyyy-MM-dd')

  const { data: slots, isLoading, error } = useQuery<AvailableSlot[]>({
    queryKey: ['slots', dateStr, pax],
    queryFn:  async () => {
      const res = await fetch(`/api/slots?date=${dateStr}&pax=${pax}`)
      if (!res.ok) throw new Error('Failed to load slots')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-red-500 py-8 text-center">Failed to load slots. Please refresh.</p>
  }

  if (!slots?.length) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-xl mb-2">No sessions available</p>
        <p className="text-gray-400 text-sm">Try selecting a different date.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {slots.map((slot) => {
        const selectable = slot.isAvailable && slot.availableCapacity >= pax
        return (
          <button
            key={slot.id}
            onClick={() => selectable && onSlotSelect(slot)}
            disabled={!selectable}
            className={[
              'rounded-2xl border-2 p-4 text-left transition-all duration-150',
              selectable
                ? 'border-gray-200 hover:border-brand-blue hover:shadow-md bg-white cursor-pointer'
                : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed',
            ].join(' ')}
          >
            <p className="font-bold text-gray-900 text-lg">{slot.startTime}</p>
            <p className="text-xs text-gray-400 mb-2">– {slot.endTime}</p>

            {selectable ? (
              <>
                <p className="text-xs text-green-600 font-medium">{slot.availableCapacity} left</p>
                {slot.estimatedPrice && (
                  <p className="text-sm font-bold text-brand-blue mt-1">
                    {formatCurrency(slot.estimatedPrice.totalPrice)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-red-400 font-medium">
                {slot.isAvailable ? `Need ${pax}, only ${slot.availableCapacity} left` : 'Full'}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
