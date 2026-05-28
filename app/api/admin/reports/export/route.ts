import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { format, parseISO } from 'date-fns'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const startDate    = searchParams.get('startDate')
  const endDate      = searchParams.get('endDate')
  const statusFilter = searchParams.get('status')
  const fmt          = searchParams.get('format') ?? 'xlsx'

  const where: Record<string, unknown> = {}
  if (statusFilter) {
    where.status = statusFilter
  } else {
    where.status = { in: ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] }
  }
  if (startDate || endDate) {
    where.timeSlot = {
      date: {
        ...(startDate && { gte: parseISO(startDate) }),
        ...(endDate   && { lte: parseISO(endDate) }),
      },
    }
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { timeSlot: true, payment: true },
    orderBy: [{ timeSlot: { date: 'asc' } }, { timeSlot: { startTime: 'asc' } }],
  })

  const rows = bookings.map((b) => ({
    'Booking Code':    b.bookingCode.slice(-8).toUpperCase(),
    'Customer Name':   b.customerName,
    'Email':           b.customerEmail,
    'Phone':           b.customerPhone,
    'Date':            format(b.timeSlot.date, 'yyyy-MM-dd'),
    'Start Time':      b.timeSlot.startTime,
    'End Time':        b.timeSlot.endTime,
    'Guests (pax)':    b.pax,
    'Base Price':      Number(b.basePrice),
    'Total Price':     Number(b.totalPrice),
    'Currency':        'IDR',
    'Payment Method':  b.payment?.paymentMethod ?? '-',
    'Payment Status':  b.payment?.status ?? '-',
    'Paid At':         b.payment?.paidAt ? format(b.payment.paidAt, 'yyyy-MM-dd HH:mm') : '-',
    'Booking Status':  b.status,
    'Notes':           b.notes ?? '',
    'Booked At':       format(b.createdAt, 'yyyy-MM-dd HH:mm'),
  }))

  const filename = `bookings-${format(new Date(), 'yyyy-MM-dd')}`

  if (fmt === 'csv') {
    const ws  = XLSX.utils.json_to_sheet(rows)
    const csv = XLSX.utils.sheet_to_csv(ws)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 14 }, { wch: 26 }, { wch: 30 }, { wch: 16 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 8 },  { wch: 16 },
    { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 35 }, { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Bookings')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
    },
  })
}
