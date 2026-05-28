'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import type { RateKey, RateMatrix } from '@/lib/pricing'

// ─── Types ────────────────────────────────────────────────

interface PricingConfig {
  id:                        string
  weekdayMorningPeakStart:   string
  weekdayMorningPeakEnd:     string
  weekdayAfternoonPeakStart: string
  weekdayAfternoonPeakEnd:   string
  weekendPeakStart:          string
  weekendPeakEnd:            string
  rates:                     RateMatrix
}

type WindowField =
  | 'weekdayMorningPeakStart'   | 'weekdayMorningPeakEnd'
  | 'weekdayAfternoonPeakStart' | 'weekdayAfternoonPeakEnd'
  | 'weekendPeakStart'          | 'weekendPeakEnd'

interface HolidayDate {
  id:        string
  date:      string   // ISO string from API
  label:     string | null
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────

const DEFAULT_WINDOWS = {
  weekdayMorningPeakStart:   '07:00',
  weekdayMorningPeakEnd:     '10:00',
  weekdayAfternoonPeakStart: '17:00',
  weekdayAfternoonPeakEnd:   '22:00',
  weekendPeakStart:          '10:00',
  weekendPeakEnd:             '22:00',
}

const DEFAULT_RATES: RateMatrix = {
  weekdayOffPeak:       [130000, 125000, 120000, 115000, 110000],
  weekdayMorningPeak:   [150000, 145000, 140000, 135000, 130000],
  weekdayAfternoonPeak: [180000, 175000, 170000, 165000, 160000],
  weekendOffPeak:       [160000, 155000, 150000, 145000, 140000],
  weekendPeak:          [200000, 195000, 190000, 185000, 180000],
}

// Row definitions — order matches the visual table
const ROWS: Array<{ key: RateKey; label: string; sub: string; badge: string; group: 'weekday' | 'weekend' }> = [
  { key: 'weekdayOffPeak',       label: 'Weekday', sub: 'Off-peak',        badge: 'bg-slate-100 text-slate-600',    group: 'weekday' },
  { key: 'weekdayMorningPeak',   label: 'Weekday', sub: 'Morning peak',    badge: 'bg-amber-100 text-amber-700',    group: 'weekday' },
  { key: 'weekdayAfternoonPeak', label: 'Weekday', sub: 'Afternoon peak',  badge: 'bg-orange-100 text-orange-700',  group: 'weekday' },
  { key: 'weekendOffPeak',       label: 'Weekend', sub: 'Off-peak',        badge: 'bg-violet-100 text-violet-700',  group: 'weekend' },
  { key: 'weekendPeak',          label: 'Weekend', sub: 'Peak',            badge: 'bg-red-100 text-red-700',        group: 'weekend' },
]

// ─── TimeWindow subcomponent ──────────────────────────────

function TimeWindow({
  label,
  startField,
  endField,
  windows,
  onChange,
}: {
  label:       string
  startField:  WindowField
  endField:    WindowField
  windows:     typeof DEFAULT_WINDOWS
  onChange:    (field: WindowField, value: string) => void
}) {
  const timeInput = 'border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue'
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-gray-600 w-36 shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={windows[startField]}
          onChange={(e) => onChange(startField, e.target.value)}
          className={timeInput}
        />
        <span className="text-gray-400 text-sm">→</span>
        <input
          type="time"
          value={windows[endField]}
          onChange={(e) => onChange(endField, e.target.value)}
          className={timeInput}
        />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────

export default function PricingPage() {
  const qc = useQueryClient()

  const [windows,      setWindows]      = useState(DEFAULT_WINDOWS)
  const [rates,        setRates]        = useState<RateMatrix>(DEFAULT_RATES)
  const [flash,        setFlash]        = useState<'saved' | 'error' | null>(null)
  const [newHoliday,   setNewHoliday]   = useState({ date: '', label: '' })
  const [holidayError, setHolidayError] = useState<string | null>(null)

  const { data: config } = useQuery<PricingConfig | null>({
    queryKey: ['pricing-config'],
    queryFn:  () => fetch('/api/admin/pricing').then((r) => r.json()),
  })

  useEffect(() => {
    if (config) {
      setWindows({
        weekdayMorningPeakStart:   config.weekdayMorningPeakStart,
        weekdayMorningPeakEnd:     config.weekdayMorningPeakEnd,
        weekdayAfternoonPeakStart: config.weekdayAfternoonPeakStart,
        weekdayAfternoonPeakEnd:   config.weekdayAfternoonPeakEnd,
        weekendPeakStart:          config.weekendPeakStart,
        weekendPeakEnd:            config.weekendPeakEnd,
      })
      setRates(config.rates)
    }
  }, [config])

  const save = useMutation({
    mutationFn: () =>
      fetch('/api/admin/pricing', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...windows, rates }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-config'] })
      setFlash('saved')
      setTimeout(() => setFlash(null), 2500)
    },
    onError: () => {
      setFlash('error')
      setTimeout(() => setFlash(null), 3000)
    },
  })

  // ── Holiday queries ──────────────────────────────────────
  const { data: holidays = [] } = useQuery<HolidayDate[]>({
    queryKey: ['holidays'],
    queryFn:  () => fetch('/api/admin/holidays').then((r) => r.json()),
  })

  const addHoliday = useMutation({
    mutationFn: () =>
      fetch('/api/admin/holidays', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: newHoliday.date, label: newHoliday.label || undefined }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { setHolidayError(data.error); return }
      qc.invalidateQueries({ queryKey: ['holidays'] })
      setNewHoliday({ date: '', label: '' })
      setHolidayError(null)
    },
    onError: () => setHolidayError('Failed to add date. Try again.'),
  })

  const removeHoliday = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/holidays/${id}`, { method: 'DELETE' }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  })

  function setWindow(field: WindowField, value: string) {
    setWindows((prev) => ({ ...prev, [field]: value }))
  }

  function setRate(key: RateKey, idx: number, raw: string) {
    const value = parseInt(raw.replace(/\D/g, ''), 10) || 0
    setRates((prev) => ({
      ...prev,
      [key]: prev[key].map((v, i) => (i === idx ? value : v)),
    }))
  }

  return (
    <div className="p-8 max-w-5xl">

      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Rate per person (IDR) · total = rate × guests
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {flash === 'saved' && <span className="text-green-600 text-sm font-medium">✓ Saved</span>}
          {flash === 'error' && <span className="text-red-500 text-sm font-medium">Save failed. Try again.</span>}
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-brand-blue text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0a2540] disabled:opacity-50 transition-colors"
          >
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Peak hour windows ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>🕐</span> Peak Hour Windows
        </h2>

        {/* Weekday */}
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Weekday (Mon – Fri)
          </p>
          <div className="space-y-2.5 pl-1">
            <TimeWindow
              label="Morning peak"
              startField="weekdayMorningPeakStart"
              endField="weekdayMorningPeakEnd"
              windows={windows}
              onChange={setWindow}
            />
            <TimeWindow
              label="Afternoon peak"
              startField="weekdayAfternoonPeakStart"
              endField="weekdayAfternoonPeakEnd"
              windows={windows}
              onChange={setWindow}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2.5 pl-1">
            Slots outside both windows → <strong>off-peak rate</strong>
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-5" />

        {/* Weekend */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Weekend (Sat – Sun)
          </p>
          <div className="pl-1">
            <TimeWindow
              label="Peak hours"
              startField="weekendPeakStart"
              endField="weekendPeakEnd"
              windows={windows}
              onChange={setWindow}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2.5 pl-1">
            Slots outside this window → <strong>off-peak rate</strong>
          </p>
        </div>
      </div>

      {/* ── Rate table ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <span>💰</span>
          <h2 className="font-bold text-gray-800">Rate Table</h2>
          <span className="text-xs text-gray-400 ml-1">per person (IDR)</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-6 py-3 font-semibold text-gray-500 w-52">Session type</th>
              {[1, 2, 3, 4, 5].map((n) => (
                <th key={n} className="text-center px-3 py-3 font-semibold text-gray-500">
                  {n} {n === 1 ? 'person' : 'people'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ key, label, sub, badge, group }, rowIdx) => {
              // Thin separator between weekday and weekend groups
              const isFirstWeekend = rowIdx > 0 && group === 'weekend' && ROWS[rowIdx - 1].group === 'weekday'
              return (
                <>
                  {isFirstWeekend && (
                    <tr key={`sep-${key}`}>
                      <td colSpan={6} className="px-0 py-0">
                        <div className="border-t-2 border-gray-100" />
                      </td>
                    </tr>
                  )}
                  <tr key={key} className={rowIdx % 2 === 1 ? 'bg-gray-50/40' : ''}>
                    {/* Row label */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-gray-800">{label}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${badge}`}>
                          {sub}
                        </span>
                      </div>
                    </td>

                    {/* Rate cells */}
                    {rates[key].map((rate, idx) => (
                      <td key={idx} className="px-3 py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={rate.toLocaleString('id-ID')}
                              onChange={(e) => setRate(key, idx, e.target.value)}
                              className="w-24 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition"
                            />
                          </div>
                          <span className="text-[11px] text-gray-400">
                            = {formatCurrency(rate * (idx + 1))}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Legend ─────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500">
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <p className="font-semibold text-gray-700 mb-1">Weekday logic</p>
          <p>
            If a slot starts between <strong>{windows.weekdayMorningPeakStart}–{windows.weekdayMorningPeakEnd}</strong> → Morning peak rate<br />
            If a slot starts between <strong>{windows.weekdayAfternoonPeakStart}–{windows.weekdayAfternoonPeakEnd}</strong> → Afternoon peak rate<br />
            All other slots → Off-peak rate
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <p className="font-semibold text-gray-700 mb-1">Weekend &amp; Holiday logic</p>
          <p>
            If a slot starts between <strong>{windows.weekendPeakStart}–{windows.weekendPeakEnd}</strong> → Peak rate<br />
            All other slots → Off-peak rate<br />
            <span className="text-violet-600 font-medium">Holiday dates follow this same logic.</span>
          </p>
        </div>
      </div>

      {/* ── Holiday dates ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-5">
        <div className="flex items-center gap-2 mb-1">
          <span>🎉</span>
          <h2 className="font-bold text-gray-800">Holiday &amp; Special Dates</h2>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          These dates use <strong className="text-gray-600">weekend pricing</strong> regardless
          of which day they fall on — useful for public holidays, long-weekend bridges, etc.
        </p>

        {/* Add form */}
        <div className="flex flex-wrap items-end gap-3 mb-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={newHoliday.date}
              onChange={(e) => setNewHoliday((p) => ({ ...p, date: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Label <span className="text-gray-400">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Idul Fitri, Christmas"
              value={newHoliday.label}
              onChange={(e) => setNewHoliday((p) => ({ ...p, label: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <button
            onClick={() => {
              if (!newHoliday.date) { setHolidayError('Please pick a date.'); return }
              addHoliday.mutate()
            }}
            disabled={addHoliday.isPending}
            className="bg-brand-blue text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-[#0a2540] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {addHoliday.isPending ? 'Adding…' : '+ Add Date'}
          </button>
          {holidayError && (
            <p className="w-full text-xs text-red-500 -mt-1">{holidayError}</p>
          )}
        </div>

        {/* Holiday list */}
        {holidays.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
            <p className="text-sm text-gray-400">No holiday dates configured yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {holidays.map((h) => {
              const d = parseISO(h.date)
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center bg-white rounded-lg border border-violet-200 px-3 py-1.5 min-w-[56px]">
                      <p className="text-[10px] font-bold text-violet-400 uppercase">{format(d, 'MMM')}</p>
                      <p className="text-lg font-black text-violet-700 leading-tight">{format(d, 'd')}</p>
                      <p className="text-[10px] text-violet-400">{format(d, 'yyyy')}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{h.label ?? <span className="text-gray-400 italic">No label</span>}</p>
                      <p className="text-xs text-gray-400">{format(d, 'EEEE')} · Weekend pricing</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeHoliday.mutate(h.id)}
                    disabled={removeHoliday.isPending}
                    className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
