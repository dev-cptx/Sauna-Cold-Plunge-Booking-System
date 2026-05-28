'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { format, addDays, addMonths } from 'date-fns'
import SlotCalendar from '@/components/admin/SlotCalendar'

// ─── Defaults ────────────────────────────────────────────
const today    = format(new Date(), 'yyyy-MM-dd')
const inMonth  = format(addMonths(new Date(), 1), 'yyyy-MM-dd')

export default function SlotsPage() {
  // ── Generate form state ─────────────────────────────
  const [dateFrom,     setDateFrom]     = useState(today)
  const [dateTo,       setDateTo]       = useState(inMonth)
  const [timeFrom,     setTimeFrom]     = useState('09:00')
  const [timeTo,       setTimeTo]       = useState('22:00')
  const [duration,     setDuration]     = useState(90)
  const [breakMin,     setBreakMin]     = useState(30)
  const [capacity,     setCapacity]     = useState(10)
  const [useCustomTime, setUseCustomTime] = useState(false)

  // Trigger calendar re-fetch after generation
  const [lastGenerated, setLastGenerated] = useState<number>(0)
  const [genResult,     setGenResult]     = useState<{ created: number; error?: string } | null>(null)

  const generate = useMutation({
    mutationFn: () =>
      fetch('/api/admin/slots/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate:    dateFrom,
          endDate:      dateTo,
          ...(useCustomTime && {
            startTime:    timeFrom,
            endTime:      timeTo,
            slotDuration: duration,
            breakBetween: breakMin,
            capacity,
          }),
        }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      setGenResult({ created: data.created })
      setLastGenerated(Date.now())
      // Auto-clear after 4 s
      setTimeout(() => setGenResult(null), 4000)
    },
    onError: () => setGenResult({ created: 0, error: 'Generation failed. Try again.' }),
  })

  const inputCls = 'border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue w-full'

  return (
    <div className="p-6 flex flex-col gap-5" style={{ height: '100vh' }}>

      {/* ── Page title ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Time Slots</h1>
        <p className="text-sm text-gray-400 mt-0.5">Generate and manage bookable sessions</p>
      </div>

      {/* ── Generate card ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-lg">⚡</span> Generate Slots
        </h2>

        {/* Row 1 — Date range */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date from</label>
            <input type="date" value={dateFrom}
                   onChange={(e) => setDateFrom(e.target.value)}
                   className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date to</label>
            <input type="date" value={dateTo}
                   onChange={(e) => setDateTo(e.target.value)}
                   min={dateFrom}
                   className={inputCls} />
          </div>

          {/* Spacer on small — generate button pushed right on large */}
          <div className="sm:col-span-2 flex items-end gap-3">
            <button
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
              className="flex-1 sm:flex-none bg-brand-blue text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-[#0a2540] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {generate.isPending ? 'Generating…' : 'Generate slots'}
            </button>

            {/* Result message */}
            {genResult && !genResult.error && (
              <span className="text-green-600 text-sm font-medium whitespace-nowrap">
                ✓ {genResult.created} slots created
              </span>
            )}
            {genResult?.error && (
              <span className="text-red-500 text-sm">{genResult.error}</span>
            )}
          </div>
        </div>

        {/* Custom time toggle */}
        <label className="inline-flex items-center gap-2 cursor-pointer select-none mb-3">
          <div
            onClick={() => setUseCustomTime((v) => !v)}
            className={`w-9 h-5 rounded-full transition-colors relative ${useCustomTime ? 'bg-brand-blue' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useCustomTime ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-gray-600">Custom time &amp; session settings</span>
          <span className="text-xs text-gray-400">(otherwise uses operational hours)</span>
        </label>

        {/* Row 2 — Time + session settings (collapsible) */}
        {useCustomTime && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start time</label>
              <input type="time" value={timeFrom}
                     onChange={(e) => setTimeFrom(e.target.value)}
                     className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End time</label>
              <input type="time" value={timeTo}
                     onChange={(e) => setTimeTo(e.target.value)}
                     className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Session duration
                <span className="text-gray-400 ml-1">(min)</span>
              </label>
              <input type="number" min={30} max={480} step={15}
                     value={duration}
                     onChange={(e) => setDuration(Number(e.target.value))}
                     className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Break between
                <span className="text-gray-400 ml-1">(min)</span>
              </label>
              <input type="number" min={0} max={120} step={5}
                     value={breakMin}
                     onChange={(e) => setBreakMin(Number(e.target.value))}
                     className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Capacity per slot
                <span className="text-gray-400 ml-1">(pax)</span>
              </label>
              <input type="number" min={1} max={100}
                     value={capacity}
                     onChange={(e) => setCapacity(Number(e.target.value))}
                     className={inputCls} />
            </div>

            {/* Live preview */}
            {timeFrom && timeTo && duration && (
              <div className="sm:col-span-3 flex items-end">
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 w-full">
                  Preview: slots from <strong>{timeFrom}</strong> to <strong>{timeTo}</strong>,{' '}
                  <strong>{duration} min</strong> each with <strong>{breakMin} min</strong> break →{' '}
                  <strong>{previewSlotCount(timeFrom, timeTo, duration, breakMin)} slots/day</strong>,{' '}
                  up to <strong>{capacity} pax</strong> each
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Calendar view ──────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <SlotCalendar lastGeneratedAt={lastGenerated} />
      </div>

    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────
function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function previewSlotCount(start: string, end: string, duration: number, gap: number): number {
  const s   = timeToMinutes(start)
  const e   = timeToMinutes(end)
  if (e <= s || duration <= 0) return 0
  let count = 0
  let cur   = s
  while (cur + duration <= e) { count++; cur += duration + gap }
  return count
}
