import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd   = endOfDay(now)
  const monthStart = startOfMonth(now)
  const monthEnd   = endOfMonth(now)

  const [todayBookings, monthBookings, pendingPayments, todaySlots] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        timeSlot: { date: { gte: todayStart, lte: todayEnd } },
      },
      select: { pax: true, totalPrice: true },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        timeSlot: { date: { gte: monthStart, lte: monthEnd } },
      },
      select: { totalPrice: true },
    }),
    prisma.booking.count({ where: { status: 'PENDING' } }),
    prisma.timeSlot.findMany({
      where: { date: { gte: todayStart, lte: todayEnd }, isBlocked: false },
      include: {
        bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } }, select: { pax: true } },
      },
    }),
  ])

  const todayRevenue   = todayBookings.reduce((s, b) => s + Number(b.totalPrice), 0)
  const monthRevenue   = monthBookings.reduce((s, b) => s + Number(b.totalPrice), 0)
  const totalCapacity  = todaySlots.reduce((s, sl) => s + sl.capacity, 0)
  const bookedCapacity = todaySlots.reduce((s, sl) => s + sl.bookings.reduce((b, bk) => b + bk.pax, 0), 0)

  return NextResponse.json({
    todayBookings:      todayBookings.length,
    todayRevenue,
    todayOccupancyRate: totalCapacity > 0 ? Math.round((bookedCapacity / totalCapacity) * 100) : 0,
    monthBookings:      monthBookings.length,
    monthRevenue,
    pendingPayments,
  })
}
