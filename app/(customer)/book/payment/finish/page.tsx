'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Midtrans redirects here after payment
export default function PaymentFinishPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const orderId          = searchParams.get('order_id')
    const transactionStatus = searchParams.get('transaction_status')

    if (!orderId) { router.replace('/book'); return }

    // orderId format: AGSB-XXXXXXXX-YYYYYY
    // Extract bookingCode suffix from orderId
    // We redirect to the confirmation page; the page reads the real status from DB
    const status = ['capture', 'settlement'].includes(transactionStatus ?? '') ? 'success' : 'pending'

    // Fetch booking ID from order ID
    fetch(`/api/payments/by-order?orderId=${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.bookingId) router.replace(`/confirmation/${data.bookingId}?status=${status}`)
        else router.replace('/book')
      })
      .catch(() => router.replace('/book'))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Confirming your booking…</p>
      </div>
    </div>
  )
}
