'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: {
        onSuccess:  (result: unknown) => void
        onPending:  (result: unknown) => void
        onError:    (result: unknown) => void
        onClose:    () => void
      }) => void
    }
  }
}

interface Props { bookingId: string; totalPrice: number }

export default function PaymentStep({ bookingId, totalPrice }: Props) {
  const router = useRouter()
  const [status,  setStatus]  = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Inject Midtrans Snap.js
    const script = document.createElement('script')
    script.src = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL ?? 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.dataset.clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? ''
    script.async = true
    script.onload = () => initPayment()
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])

  async function initPayment() {
    try {
      const res  = await fetch('/api/payments/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Payment init failed')

      setStatus('ready')

      if (data.snapToken && window.snap) {
        window.snap.pay(data.snapToken, {
          onSuccess:  () => router.push(`/confirmation/${bookingId}?status=success`),
          onPending:  () => router.push(`/confirmation/${bookingId}?status=pending`),
          onError:    () => setMessage('Payment failed. Please try again.'),
          onClose:    () => setMessage('Payment window closed. Click below to retry.'),
        })
      } else {
        // Fallback: redirect to payment page
        window.location.href = data.redirectUrl
      }
    } catch (e: any) {
      setStatus('error')
      setMessage(e.message ?? 'Failed to initialise payment.')
    }
  }

  return (
    <div className="text-center py-16">
      {status === 'loading' && (
        <>
          <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Preparing your payment…</p>
        </>
      )}

      {status === 'ready' && !message && (
        <>
          <div className="w-12 h-12 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💳</span>
          </div>
          <p className="text-gray-700 font-semibold">Complete your payment</p>
          <p className="text-gray-400 text-sm mt-1">Amount: {formatCurrency(totalPrice)}</p>
          <p className="text-gray-400 text-xs mt-4">A payment window should have opened. If not, check pop-up blockers.</p>
        </>
      )}

      {message && (
        <div className="max-w-sm mx-auto">
          <p className="text-gray-600 mb-4">{message}</p>
          <button onClick={initPayment}
                  className="bg-brand-blue text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0a2540] transition-colors">
            Try Again
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="max-w-sm mx-auto mt-4">
          <p className="text-red-500 text-sm">{message}</p>
        </div>
      )}
    </div>
  )
}
