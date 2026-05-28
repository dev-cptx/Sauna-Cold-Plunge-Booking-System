'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  addWeeks, subWeeks, isToday,
} from 'date-fns'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────
interface SlotData {
  id: string
  date: string       // "yyyy-MM-dd"
  startTime: string
  endTime: string
  capacity: number
  bookedCount: number
  isBlocked: boolean
  blockedNote: string | null
}

// ─── Helpers ─────────────────────────────────────────────
// Private-room model: any booking (even 1 pax) closes the slot entirely.
function barColor(slot: SlotData) {
  if (slot.isBlocked)    return 'bg-gray-300'
  if (slot.bookedCount > 0) return 'bg-red-400'
  return 'bg-green-400'
}

function cardBorder(slot: SlotData) {
  if (slot.isBlocked)    return 'border-gray-200 bg-gray-50'
  if (slot.bookedCount > 0) return 'border-red-100 bg-red-50/40'
  return 'border-green-100 bg-green-50/30'
}

function statusText(slot: SlotData) {
  if (slot.isBlocked)    return 'Blocked'
  if (slot.bookedCount > 0) return `Booked (${slot.bookedCount} pax)`
  return 'Available'
}

function statusTextColor(slot: SlotData) {
  if (slot.isBlocked)    return 'text-gray-400'
  if (slot.bookedCount > 0) return 'text-red-500'
  return 'text-green-600'
}

// ─── Slot card ────────────────────────────────────────────
function SlotCard({
  slot,
  onToggle,
  busy,
}: {
  slot: SlotData
  onToggle: (args: { id: string; isBlocked: boolean }) => void
  busy: boolean
}) {
  // Private model: bar is either 0% (open) or 100% (booked by anyone)
  const pct = slot.bookedCount > 0 ? 100 : 0

  return (
    <div className={cn('rounded-xl border p-2.5 text-xs', cardBorder(slot))}>
      {/* Time */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn('font-bold text-[13px]', slot.isBlocked ? 'text-gray-400 line-through' : 'text-gray-900')}>
          {slot.startTime}
        </span>
        <span className={cn('font-semibold', statusTextColor(slot))}>
          {statusText(slot)}
        </span>
      </div>

      {/* End time label */}
      <p className="text-gray-400 mb-1.5 text-[11px]">until {slot.endTime}</p>

      {/* Availability bar */}
      {!slot.isBlocked && (
        <>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
            <div
              className={cn('h-full rounded-full transition-all', barColor(slot))}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-gray-400 mb-2 text-[11px]">
            {slot.bookedCount > 0
              ? `${slot.bookedCount} pax · private`
              : `up to ${slot.capacity} pax`}
          </p>
        </>
      )}

      {/* Block / unblock */}
      <button
        onClick={() => onToggle({ id: slot.id, isBlocked: !slot.isBlocked })}
        disabled={busy}
        className={cn(
          'w-full py-1 rounded-lg font-semibold transition-colors text-[11px]',
          slot.isBlocked
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'
        )}
      >
        {slot.isBlocked ? 'Unblock' : 'Block'}
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────
interface Props {
  lastGeneratedAt?: number
}

export default function SlotCalendar({ lastGeneratedAt }: Props) {
  const qc = useQueryClient()

  const [weekAnchor, setWeekAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const weekStart = weekAnchor
  const weekEnd   = endOfWeek(weekAnchor, { weekStartsOn: 1 })
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // ── Fetch ──────────────────────────────────────────────
  const rangeStart = format(weekStart, 'yyyy-MM-dd')
  const rangeEnd   = format(weekEnd,   'yyyy-MM-dd')

  const { data: slots = [], isLoading } = useQuery<SlotData[]>({
    queryKey: ['admin-slots-week', rangeStart, rangeEnd, lastGeneratedAt],
    queryFn:  () =>
      fetch(`/api/admin/slots?startDate=${rangeStart}&endDate=${rangeEnd}`)
        .then((r) => r.json()),
  })

  // Index by date string
  const byDate = useMemo(() => {
    const map = new Map<string, SlotData[]>()
    for (const s of slots) {
      const key = s.date.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return map
  }, [slots])

  // ── Mutations ──────────────────────────────────────────
  const blockToggle = useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      fetch(`/api/admin/slots/${id}/block`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isBlocked }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-slots-week'] }),
  })

  const goToday = () => setWeekAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))

  // ── Week-level summary counts ──────────────────────────
  // Private model: a slot is "booked" when bookedCount > 0 (regardless of pax)
  const totalSlots   = slots.length
  const totalBooked  = slots.filter((sl) => !sl.isBlocked && sl.bookedCount > 0).length
  const totalBlocked = slots.filter((sl) => sl.isBlocked).length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekAnchor((w) => subWeeks(w, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 font-bold transition-colors"
          >
            ‹
          </button>
          <span className="font-bold text-gray-900 text-sm min-w-[200px] text-center">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 font-bold transition-colors"
          >
            ›
          </button>
          <button
            onClick={goToday}
            className="ml-1 text-xs text-brand-blue border border-brand-blue/30 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            Today
          </button>
        </div>

        {/* Week summary */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
          <span><strong className="text-gray-700">{totalSlots}</strong> slots</span>
          <span><strong className="text-gray-700">{totalBooked}</strong> booked</span>
          {totalBlocked > 0 && (
            <span><strong className="text-red-400">{totalBlocked}</strong> blocked</span>
          )}
        </div>

        {/* Legend */}
        <div className="hidden lg:flex items-center gap-3 text-[11px]">
          {[
            { color: 'bg-green-400', label: 'Available' },
            { color: 'bg-red-400',   label: 'Booked'    },
            { color: 'bg-gray-300',  label: 'Blocked'   },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span className={cn('w-2 h-2 rounded-full', color)} />
              <span className="text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 7-column week grid ────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Loading…
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-7 divide-x divide-gray-100 overflow-hidden">
          {days.map((day) => {
            const key      = format(day, 'yyyy-MM-dd')
            const daySlots = byDate.get(key) ?? []
            const today    = isToday(day)
            const isSat    = day.getDay() === 6
            const isSun    = day.getDay() === 0

            return (
              <div key={key} className={cn(
                'flex flex-col overflow-hidden',
                (isSat || isSun) ? 'bg-gray-50/50' : 'bg-white'
              )}>

                {/* Day header */}
                <div className={cn(
                  'px-2 py-2.5 text-center border-b border-gray-100 shrink-0',
                  today ? 'bg-brand-blue' : ''
                )}>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-wide', today ? 'text-blue-100' : 'text-gray-400')}>
                    {format(day, 'EEE')}
                  </p>
                  <p className={cn('text-base font-black mt-0.5', today ? 'text-white' : 'text-gray-800')}>
                    {format(day, 'd')}
                  </p>
                  {daySlots.length > 0 && (
                    <p className={cn('text-[10px] mt-0.5', today ? 'text-blue-200' : 'text-gray-400')}>
                      {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Slot cards — scrollable */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                  {daySlots.length === 0 ? (
                    <div className="flex items-center justify-center h-20">
                      <p className="text-[11px] text-gray-300 text-center">No slots</p>
                    </div>
                  ) : (
                    daySlots.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        onToggle={blockToggle.mutate}
                        busy={blockToggle.isPending}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
