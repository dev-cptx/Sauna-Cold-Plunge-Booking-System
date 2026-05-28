import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { formatCurrency, shortCode } from '@/lib/utils'
import { generateQRCodeDataUrl } from '@/lib/qrcode'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

interface Props { params: { bookingId: string }; searchParams: { status?: string } }

export const metadata: Metadata = { title: 'Booking Confirmation' }

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { timeSlot: true, payment: true },
  })

  if (!booking) notFound()

  const isConfirmed = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED'
  const isPending   = booking.status === 'PENDING'

  let qrDataUrl: string | null = null
  if (isConfirmed && booking.qrCodeData) {
    qrDataUrl = await generateQRCodeDataUrl(booking.qrCodeData)
  }

  const statusMessage: Record<string, { title: string; body: string; color: string }> = {
    success: { title: 'Booking Confirmed!',    body: 'Payment received. See you soon!',          color: 'bg-green-500' },
    pending: { title: 'Payment Pending',        body: 'We\'ll confirm once payment is processed.', color: 'bg-yellow-500' },
    error:   { title: 'Payment Issue',          body: 'Please try paying again below.',            color: 'bg-red-500' },
  }

  const banner = searchParams.status ? statusMessage[searchParams.status] : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-dark">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <Link href="/"><p className="text-white font-black tracking-widest">ANTIGRAVITY</p></Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {banner && (
          <div className={`${banner.color} text-white rounded-2xl px-5 py-4 mb-6 text-center`}>
            <p className="font-bold text-lg">{banner.title}</p>
            <p className="text-sm opacity-90 mt-1">{banner.body}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Card header */}
          <div className="bg-brand-dark px-6 py-5">
            <p className="text-gray-400 text-xs tracking-widest uppercase mb-1">Booking Reference</p>
            <p className="text-white font-black text-3xl tracking-widest font-mono">{shortCode(booking.bookingCode)}</p>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            {[
              ['Customer',  booking.customerName],
              ['Email',     booking.customerEmail],
              ['Phone',     booking.customerPhone],
              ['Date',      format(booking.timeSlot.date, 'EEEE, MMMM d, yyyy')],
              ['Session',   `${booking.timeSlot.startTime} – ${booking.timeSlot.endTime}`],
              ['Guests',    `${booking.pax} ${booking.pax === 1 ? 'person' : 'people'}`],
              ['Total',     formatCurrency(Number(booking.totalPrice))],
              ['Status',    booking.status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm border-b pb-3 last:border-0 last:pb-0">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>

          {/* QR Code */}
          {isConfirmed && qrDataUrl && (
            <div className="border-t px-6 py-6 text-center bg-gray-50">
              <p className="text-sm text-gray-500 mb-4">Show this QR code at the facility entrance</p>
              <div className="inline-block bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                <img src={qrDataUrl} alt="Booking QR Code" width={200} height={200} className="rounded-lg" />
              </div>
              <p className="text-xs text-gray-400 mt-3">Valid for this session only. Do not share.</p>
            </div>
          )}

          {/* Pending notice */}
          {isPending && (
            <div className="border-t px-6 py-6 text-center">
              <p className="text-yellow-600 font-semibold text-sm mb-1">Payment not yet completed</p>
              <p className="text-gray-400 text-xs mb-4">Your QR code will be emailed once payment is confirmed.</p>
              <Link href={`/book`}
                    className="inline-block bg-brand-blue text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0a2540] transition-colors">
                Make a new booking
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Questions? <a href="mailto:support@antigravity.id" className="underline">support@antigravity.id</a>
        </p>
      </main>
    </div>
  )
}
