'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { formatCurrency, shortCode } from '@/lib/utils'
import { statusBadge } from '@/components/ui/Badge'

interface Booking {
  id: string; bookingCode: string; customerName: string; customerEmail: string
  customerPhone: string; pax: number; totalPrice: number; status: string
  notes: string | null; createdAt: string
  timeSlot: { date: string; startTime: string; endTime: string }
  payment: { status: string; paymentMethod: string | null; paidAt: string | null } | null
}

export default function ReservationsPage() {
  const qc = useQueryClient()
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [dateFilter, setDate] = useState('')

  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  if (dateFilter) params.set('date', dateFilter)

  const { data, isLoading } = useQuery<{ bookings: Booking[]; total: number; pages: number }>({
    queryKey: ['admin-bookings', page, search, status, dateFilter],
    queryFn:  () => fetch(`/api/admin/bookings?${params}`).then((r) => r.json()),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      fetch(`/api/admin/bookings/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bookings'] }),
  })

  function exportReport(fmt: 'xlsx' | 'csv') {
    const p = new URLSearchParams()
    if (dateFilter) { p.set('startDate', dateFilter); p.set('endDate', dateFilter) }
    if (status) p.set('status', status)
    p.set('format', fmt)
    window.open(`/api/admin/reports/export?${p}`, '_blank')
  }

  const input = 'border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
        <div className="flex gap-2">
          <button onClick={() => exportReport('xlsx')}
                  className="flex items-center gap-1.5 text-sm border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium">
            📊 Excel
          </button>
          <button onClick={() => exportReport('csv')}
                  className="flex items-center gap-1.5 text-sm border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium">
            📄 CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input placeholder="Search name, email, code…" value={search}
               onChange={(e) => { setSearch(e.target.value); setPage(1) }}
               className={`${input} w-56`} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className={input}>
          <option value="">All statuses</option>
          {['PENDING','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="date" value={dateFilter} onChange={(e) => { setDate(e.target.value); setPage(1) }} className={input} />
        {(search || status || dateFilter) && (
          <button onClick={() => { setSearch(''); setStatus(''); setDate(''); setPage(1) }}
                  className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Code</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Session</th>
                <th className="px-5 py-3 text-left">Pax</th>
                <th className="px-5 py-3 text-left">Total</th>
                <th className="px-5 py-3 text-left">Payment</th>
                <th className="px-5 py-3 text-left">Booking</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={8} className="py-10 text-center text-gray-400">Loading…</td></tr>
              ) : data?.bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{shortCode(b.bookingCode)}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{b.customerName}</p>
                    <p className="text-gray-400 text-xs">{b.customerEmail}</p>
                    <p className="text-gray-400 text-xs">{b.customerPhone}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-700">
                    <p className="font-medium">{format(new Date(b.timeSlot.date), 'EEE d MMM')}</p>
                    <p className="text-xs text-gray-400">{b.timeSlot.startTime}–{b.timeSlot.endTime}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{b.pax}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">{formatCurrency(Number(b.totalPrice))}</td>
                  <td className="px-5 py-3">{b.payment ? statusBadge(b.payment.status) : statusBadge('PENDING')}</td>
                  <td className="px-5 py-3">{statusBadge(b.status)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {b.status === 'PENDING' && (
                        <button onClick={() => updateStatus.mutate({ id: b.id, newStatus: 'CONFIRMED' })}
                                className="text-xs text-green-600 hover:underline font-medium">Confirm</button>
                      )}
                      {['PENDING','CONFIRMED'].includes(b.status) && (
                        <button onClick={() => {
                          if (confirm('Cancel this booking?')) updateStatus.mutate({ id: b.id, newStatus: 'CANCELLED' })
                        }} className="text-xs text-red-500 hover:underline font-medium">Cancel</button>
                      )}
                      {b.status === 'CONFIRMED' && (
                        <button onClick={() => updateStatus.mutate({ id: b.id, newStatus: 'COMPLETED' })}
                                className="text-xs text-brand-blue hover:underline font-medium">Complete</button>
                      )}
                      {b.status === 'CONFIRMED' && (
                        <button onClick={() => updateStatus.mutate({ id: b.id, newStatus: 'NO_SHOW' })}
                                className="text-xs text-yellow-600 hover:underline font-medium">No-show</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !data?.bookings.length && (
                <tr><td colSpan={8} className="py-10 text-center text-gray-400">No bookings match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="px-5 py-4 border-t flex items-center justify-between text-sm text-gray-500">
            <p>{data.total} total</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                      className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50">←</button>
              <span className="px-3 py-1">{page} / {data.pages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page === data.pages}
                      className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
