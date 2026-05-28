'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isToday, isBefore,
  startOfDay, addDays, isSameDay, isSameMonth,
} from 'date-fns'
import type { AvailableSlot } from '@/types'

// ─── Helpers ─────────────────────────────────────────────

/** "14:30" → "2:30 PM" */
function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12    = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

/** Monday-based weekday index 0–6 */
function isoWeekday(d: Date) {
  return (getDay(d) + 6) % 7
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ─── Component ───────────────────────────────────────────
interface Props {
  pax:           number
  onPaxChange:   (n: number) => void
  onSlotSelect:  (date: Date, slot: AvailableSlot) => void
}

export default function DateTimePicker({ pax, onPaxChange, onSlotSelect }: Props) {
  const today   = startOfDay(new Date())
  const minDate = addDays(today, 1)       // earliest bookable = tomorrow
  const maxDate = addDays(today, 60)

  const [month,        setMonth]        = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(minDate)

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  // Fetch available slots for selected date
  const { data: slots = [], isLoading } = useQuery<AvailableSlot[]>({
    queryKey: ['booking-slots', dateStr, pax],
    queryFn:  async () => {
      const res = await fetch(`/api/slots?date=${dateStr}&pax=${pax}`)
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    staleTime: 30_000,
  })

  // Calendar grid
  const days        = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const startOffset = isoWeekday(days[0])

  function isDisabled(day: Date) {
    return isBefore(day, minDate) || day > maxDate
  }

  return (
    <div className="flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white w-full max-w-3xl">

      {/* ── Left: Calendar ───────────────────────────────── */}
      <div className="flex-1 p-7">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Select date and time</h2>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-lg leading-none"
          >
            ‹
          </button>
          <span className="font-bold text-gray-900">{format(month, 'MMMM yyyy')}</span>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-lg leading-none"
          >
            ›
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {/* Leading blanks */}
          {Array.from({ length: startOffset }).map((_, i) => <div key={`b${i}`} />)}

          {days.map((day) => {
            const disabled      = isDisabled(day)
            const selected      = isSameDay(day, selectedDate)
            const todayMark     = isToday(day)
            const outsideMonth  = !isSameMonth(day, month)

            // Days that are selectable but not selected get a subtle hover circle
            const base = 'w-9 h-9 rounded-full text-sm font-medium transition-colors flex items-center justify-center mx-auto'

            let cls = ''
            if (selected) {
              cls = 'bg-gray-900 text-white'
            } else if (disabled || outsideMonth) {
              cls = 'text-gray-300 cursor-not-allowed'
            } else if (todayMark) {
              cls = 'text-gray-900 font-bold hover:bg-gray-100 cursor-pointer'
            } else {
              cls = 'text-gray-700 hover:bg-gray-100 cursor-pointer'
            }

            return (
              <div key={day.toISOString()}>
                <button
                  onClick={() => !disabled && !outsideMonth && setSelectedDate(day)}
                  disabled={disabled || outsideMonth}
                  className={`${base} ${cls}`}
                >
                  {format(day, 'd')}
                </button>
              </div>
            )
          })}
        </div>

        {/* Guest selector — below calendar */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-gray-500">Number of guests</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPaxChange(Math.max(1, pax - 1))}
                className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center hover:bg-gray-50 text-lg leading-none"
              >
                −
              </button>
              <span className="w-6 text-center font-bold text-gray-900 text-sm">{pax}</span>
              <button
                onClick={() => onPaxChange(Math.min(5, pax + 1))}
                className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center hover:bg-gray-50 text-lg leading-none"
              >
                +
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">Private session · max 5 guests · entire room is yours</p>
        </div>
      </div>

      {/* ── Right: Time slots ─────────────────────────────── */}
      <div className="w-full md:w-64 bg-gray-950 text-white flex flex-col">

        {/* Panel header */}
        <div className="px-5 pt-6 pb-4 border-b border-white/10 shrink-0">
          <p className="text-gray-400 text-xs mb-1">Showing times for</p>
          <p className="font-bold text-base">
            {format(selectedDate, 'EEE, d MMM')}
          </p>
        </div>

        {/* Slot list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
            ))
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-10 text-center">
              <p className="text-gray-500 text-sm">No sessions available</p>
              <p className="text-gray-600 text-xs mt-1">Try a different date</p>
            </div>
          ) : (
            slots.map((slot) => {
              const selectable = slot.isAvailable && slot.availableCapacity >= pax
              const full       = !slot.isAvailable || slot.availableCapacity <= 0
              const notEnough  = slot.isAvailable && slot.availableCapacity < pax && slot.availableCapacity > 0

              return (
                <button
                  key={slot.id}
                  onClick={() => selectable && onSlotSelect(selectedDate, slot)}
                  disabled={!selectable}
                  className={[
                    'w-full text-left px-4 py-3 rounded-xl border transition-all',
                    selectable
                      ? 'border-white/25 text-white hover:bg-white hover:text-gray-900 hover:border-white active:scale-[0.98]'
                      : 'border-white/5 cursor-not-allowed',
                  ].join(' ')}
                >
                  <span className={selectable ? 'text-sm font-medium' : 'text-sm font-medium text-gray-600'}>
                    {fmt12(slot.startTime)}
                  </span>
                  {!selectable && (
                    <span className="ml-2 text-xs text-gray-600">
                      {full ? 'Full' : notEnough ? `${slot.availableCapacity} left` : ''}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}
