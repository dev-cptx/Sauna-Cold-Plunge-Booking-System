import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { format, startOfDay, endOfDay } from 'date-fns'
import StatsCard from '@/components/admin/StatsCard'
import { formatCurrency } from '@/lib/utils'
import { statusBadge } from '@/components/ui/Badge'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  const now    = new Date()
  const today  = { gte: startOfDay(now), lte: endOfDay(now) }

  const [todayBookings, monthBookings, pendingCount, recentBookings] = await Promise.all([
    prisma.booking.findMany({
      where:  { status: { in: ['CONFIRMED', 'COMPLETED'] }, timeSlot: { date: today } },
      select: { pax: true, totalPrice: true },
    }),
    prisma.booking.findMany({
      where:  { status: { in: ['CONFIRMED', 'COMPLETED'] }, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      select: { totalPrice: true },
    }),
    prisma.booking.count({ where: { status: 'PENDING' } }),
    prisma.booking.findMany({
      take:    10,
      orderBy: { createdAt: 'desc' },
      include: { timeSlot: true, payment: true },
    }),
  ])

  const todayRevenue = todayBookings.reduce((s, b) => s + Number(b.totalPrice), 0)
  const monthRevenue = monthBookings.reduce((s, b) => s + Number(b.totalPrice), 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{format(now, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Today's Bookings" value={todayBookings.length} icon="📅" />
        <StatsCard title="Today's Revenue"  value={formatCurrency(todayRevenue)} icon="💰" />
        <StatsCard title="Month Revenue"    value={formatCurrency(monthRevenue)} icon="📈" />
        <StatsCard title="Pending Payments" value={pendingCount} icon="⏳"
                   sub={pendingCount > 0 ? 'Awaiting payment' : 'All clear'}
                   trend={pendingCount > 0 ? 'down' : 'neutral'} />
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Recent Bookings</h2>
          <Link href="/admin/reservations" className="text-brand-blue text-sm font-medium hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Code</th>
                <th className="px-6 py-3 text-left">Customer</th>
                <th className="px-6 py-3 text-left">Date / Time</th>
                <th className="px-6 py-3 text-left">Pax</th>
                <th className="px-6 py-3 text-left">Total</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{b.bookingCode.slice(-8).toUpperCase()}</td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{b.customerName}</p>
                    <p className="text-gray-400 text-xs">{b.customerEmail}</p>
                  </td>
                  <td className="px-6 py-3 text-gray-600">
                    {format(b.timeSlot.date, 'MMM d')}, {b.timeSlot.startTime}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{b.pax}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">{formatCurrency(Number(b.totalPrice))}</td>
                  <td className="px-6 py-3">{statusBadge(b.status)}</td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
